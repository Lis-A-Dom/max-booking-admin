/* ===========================================================
   МОДУЛЬ ЦЕН: сезонные тарифы в MySQL + расчёт стоимости
   =========================================================== */
import mysql from 'mysql2/promise';

let pool = null;

export function initPricing() {
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

export async function ensureTables() {
    if (!pool) return false;
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS prices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date_start DATE NOT NULL,
            date_end DATE NOT NULL,
            price_per_night DECIMAL(10,2) NOT NULL DEFAULT 6000,
            min_nights INT NOT NULL DEFAULT 1,
            label VARCHAR(100) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS settings (
            k VARCHAR(50) PRIMARY KEY,
            v VARCHAR(255)
        )`);
        await pool.query(`INSERT IGNORE INTO settings (k,v) VALUES ('deposit','10000'),('base_price','6000'),('checkin_time','15:00'),('checkout_time','12:00')`);
        return true;
    } catch (e) { console.error('❌ pricing tables:', e.message); return false; }
}

export async function getSettings() {
    const out = {};
    if (!pool) return out;
    try { const [rows] = await pool.query('SELECT k,v FROM settings'); rows.forEach(r => out[r.k] = r.v); } catch (e) {}
    return out;
}

export async function setSetting(k, v) {
    if (!pool) return { ok: false };
    await pool.query('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=?', [k, v, v]).catch(e => console.error('❌ setSetting:', e.message));
    return { ok: true };
}

export async function listPrices() {
    if (!pool) return [];
    try { const [rows] = await pool.query('SELECT * FROM prices ORDER BY date_start'); return rows; } catch (e) { return []; }
}

async function priceFor(dateStr) {
    if (!pool) return null;
    try {
        const [rows] = await pool.query('SELECT * FROM prices WHERE date_start <= ? AND date_end >= ? LIMIT 1', [dateStr, dateStr]);
        return rows[0] || null;
    } catch (e) { return null; }
}

export async function calcStay(checkIn, checkOut) {
    const set = await getSettings();
    const base = Number(set.base_price || 6000);
    const nights = [];
    let minStay = 1;
    let d = checkIn;
    while (d < checkOut && nights.length < 366) {
        const p = await priceFor(d);
        const price = p ? Number(p.price_per_night) : base;
        if (p && Number(p.min_nights) > minStay) minStay = Number(p.min_nights);
        nights.push({ date: d, price: price, label: p ? (p.label || '') : 'базовая' });
        const dt = new Date(d + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + 1); d = dt.toISOString().slice(0, 10);
    }
    const total = nights.reduce((s, n) => s + n.price, 0);
    return { nights: nights, total: total, minNights: minStay, deposit: Number(set.deposit || 10000), base: base };
}

export async function savePrice(row) {
    if (!pool) return { ok: false, error: 'Нет БД' };
    if (!row.date_start || !row.date_end || row.date_start > row.date_end) return { ok: false, error: 'Неверные даты' };
    try {
        const [ov] = await pool.query('SELECT id FROM prices WHERE date_start <= ? AND date_end >= ? LIMIT 1', [row.date_end, row.date_start]);
        if (ov.length) return { ok: false, error: 'Пересекается с существующим периодом' };
        await pool.query('INSERT INTO prices (date_start,date_end,price_per_night,min_nights,label) VALUES (?,?,?,?,?)',
            [row.date_start, row.date_end, Number(row.price_per_night) || 0, Number(row.min_nights) || 1, row.label || '']);
        return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
}

export async function deletePrice(id) {
    if (!pool) return { ok: false };
    await pool.query('DELETE FROM prices WHERE id=?', [id]).catch(() => {});
    return { ok: true };
}
