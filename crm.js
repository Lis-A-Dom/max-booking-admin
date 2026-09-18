/* ===========================================================
   CRM МОДУЛЬ: гости и уборки (авто-наполнение из броней)
   =========================================================== */
import mysql from 'mysql2/promise';

let pool = null;

export function initCRM() {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'lisadom',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'lisadom',
        waitForConnections: true,
        connectionLimit: 3,
        dateStrings: true
    });
}

export async function ensureCRMTables() {
    if (!pool) return false;
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS guests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(32) NOT NULL DEFAULT '',
            name VARCHAR(128) NOT NULL DEFAULT '',
            source VARCHAR(32) DEFAULT 'max_app',
            visits INT NOT NULL DEFAULT 0,
            total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
            last_stay DATE NULL,
            note VARCHAR(255) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_phone (phone)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS cleanings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id VARCHAR(32) NOT NULL,
            c_date DATE NOT NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'pending',
            note VARCHAR(255) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_booking (booking_id)
        )`);
        await pool.query("ALTER TABLE guests ADD COLUMN max_user_id VARCHAR(64) DEFAULT ''").catch(() => {});
        return true;
    } catch (e) { console.error('❌ crm tables:', e.message); return false; }
}

export async function syncFromBookings(bookings) {
    if (!pool || !Array.isArray(bookings)) return;
    const map = new Map();
    for (const b of bookings) {
        if (!b || String(b.id || '').indexOf('FLAG-') === 0) continue;
        const phone = String(b.phone || '').replace(/\D/g, '');
        if (!phone) continue;
        let g = map.get(phone);
        if (!g) { g = { phone: phone, name: '', source: b.source || 'max_app', visits: 0, spent: 0, last: null }; map.set(phone, g); }
        g.visits += 1;
        if (b.status === 'paid' || b.status === 'confirmed') g.spent += Number(b.total) || 0;
        if (b.checkIn && (!g.last || b.checkIn > g.last)) g.last = b.checkIn;
        if (b.name) g.name = b.name;
        if (b.source) g.source = b.source;
        if (b.maxUserId) g.max = String(b.maxUserId);
    }
    for (const g of map.values()) {
        await pool.query(
            `INSERT INTO guests (phone, name, source, visits, total_spent, last_stay, max_user_id) VALUES (?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), source=VALUES(source), visits=VALUES(visits), total_spent=VALUES(total_spent), last_stay=VALUES(last_stay), max_user_id=IF(VALUES(max_user_id)<>'',VALUES(max_user_id),max_user_id)`,
            [g.phone, g.name, g.source, g.visits, g.spent, g.last, g.max]
        ).catch(e => console.error('❌ guest upsert:', e.message));
    }
    for (const b of bookings) {
        if (!b || String(b.id || '').indexOf('FLAG-') === 0) continue;
        if ((b.status === 'paid' || b.status === 'confirmed') && b.checkOut) {
            await pool.query('INSERT IGNORE INTO cleanings (booking_id, c_date) VALUES (?,?)', [b.id, b.checkOut]).catch(() => {});
        }
    }
}

export async function listGuests(q) {
    if (!pool) return [];
    try {
        if (q) { const [rows] = await pool.query('SELECT * FROM guests WHERE name LIKE ? OR phone LIKE ? ORDER BY last_stay DESC LIMIT 200', ['%' + q + '%', '%' + q + '%']); return rows; }
        const [rows] = await pool.query('SELECT * FROM guests ORDER BY last_stay DESC LIMIT 200');
        return rows;
    } catch (e) { return []; }
}

export async function listCleanings() {
    if (!pool) return [];
    try { const [rows] = await pool.query('SELECT * FROM cleanings ORDER BY c_date DESC LIMIT 200'); return rows; } catch (e) { return []; }
}

export async function setCleaning(id, status, note) {
    if (!pool) return { ok: false };
    await pool.query('UPDATE cleanings SET status=?, note=? WHERE id=?', [status, note || '', id]).catch(e => console.error('❌ cleaning upd:', e.message));
    return { ok: true };
}

export async function saveGuest(row) {
    if (!pool) return { ok: false, error: 'Нет БД' };
    let d = String(row.phone || '').replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '8' || d[0] === '7')) d = '7' + d.slice(1);
    if (d.length === 10 && d[0] === '9') d = '7' + d;
    if (d.length !== 11 || d[0] !== '7') return { ok: false, error: 'Телефон не похож на российский' };
    const name = String(row.name || '').trim();
    if (!name) return { ok: false, error: 'Нет имени' };
    try {
        if (row.id) {
            await pool.query('UPDATE guests SET name=?, phone=?, note=? WHERE id=?', [name, '+' + d, String(row.note || ''), row.id]);
        } else {
            await pool.query('INSERT INTO guests (phone, name, source, visits, total_spent) VALUES (?, ?, ?, 0, 0) ON DUPLICATE KEY UPDATE name=VALUES(name), note=VALUES(note)', ['+' + d, name, row.source || 'manual']);
        }
        return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
}

export async function importGuests(list) {
    let ok = 0, fail = 0;
    for (const row of list) {
        const r = await saveGuest(row);
        if (r.ok) ok++; else fail++;
    }
    return { ok: true, added: ok, failed: fail };
}

export async function deleteGuest(id) {
    if (!pool) return { ok: false };
    await pool.query('DELETE FROM guests WHERE id=?', [id]).catch(() => {});
    return { ok: true };
}

export async function cleaningsForDate(d) {
    if (!pool) return [];
    try { const [rows] = await pool.query('SELECT * FROM cleanings WHERE c_date=? ORDER BY id', [d]); return rows; } catch (e) { return []; }
}

export async function deleteCleaningByBooking(bid) {
    if (!pool) return;
    await pool.query('DELETE FROM cleanings WHERE booking_id=?', [bid]).catch(() => {});
}

export async function setGuestMax(phone, uid) {
    if (!pool || !uid) return;
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '8' || d[0] === '7')) d = '7' + d.slice(1);
    if (d.length === 10 && d[0] === '9') d = '7' + d;
    if (d.length !== 11) return;
    await pool.query('UPDATE guests SET max_user_id=? WHERE phone=?', [String(uid), '+' + d]).catch(() => {});
}

export async function getGuestMax(phone) {
    if (!pool) return '';
    let d = String(phone || '').replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '8' || d[0] === '7')) d = '7' + d.slice(1);
    if (d.length === 10 && d[0] === '9') d = '7' + d;
    if (d.length !== 11) return '';
    try { const [rows] = await pool.query('SELECT max_user_id FROM guests WHERE phone=?', ['+' + d]); return rows[0] ? (rows[0].max_user_id || '') : ''; } catch (e) { return ''; }
}
