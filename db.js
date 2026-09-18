/* ===========================================================
   MySQL СЛОЙ (изолированный модуль)
   Все броней пишутся в БД lisadom.bookings + в JSON (fallback)
   =========================================================== */
import mysql from 'mysql2/promise';
import fs from 'fs';

const BF_PATH = '/var/www/max-house-app/bookings.json';
let dbPool = null;

export async function initDB() {
    try {
        dbPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'lisadom',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'lisadom',
            waitForConnections: true,
            connectionLimit: 5,
            dateStrings: true
        });
        // Проверяем подключение
        const [rows] = await dbPool.query('SELECT COUNT(*) AS c FROM bookings');
        console.log('✅ MySQL подключён, броней в БД:', rows[0].c);
        return true;
    } catch (e) {
        console.error('❌ MySQL init не удался:', e.message);
        dbPool = null;
        return false;
    }
}

export function dbUpsert(b) {
    if (!dbPool || !b || !b.id) return;
    if (String(b.id).indexOf('FLAG-') === 0) return;
    const dt = s => s ? String(s).replace('T', ' ').replace('Z', '').slice(0, 19) : null;
    dbPool.query(
        `INSERT INTO bookings
         (id, created_at, check_in, check_out, nights, guests, name, phone, addons,
          total, comment, status, source, payment_id, payment_url, payment_yk_id,
          paid_at, paid_sent, refunded_at, refunded_amount, refund_id,
          refund_reminder_sent, confirmed_notified)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
          check_in=VALUES(check_in), check_out=VALUES(check_out), nights=VALUES(nights),
          guests=VALUES(guests), name=VALUES(name), phone=VALUES(phone),
          addons=VALUES(addons), total=VALUES(total), comment=VALUES(comment),
          status=VALUES(status), source=VALUES(source),
          payment_id=VALUES(payment_id), payment_url=VALUES(payment_url),
          payment_yk_id=VALUES(payment_yk_id), paid_at=VALUES(paid_at),
          paid_sent=VALUES(paid_sent), refunded_at=VALUES(refunded_at),
          refunded_amount=VALUES(refunded_amount), refund_id=VALUES(refund_id),
          refund_reminder_sent=VALUES(refund_reminder_sent),
          confirmed_notified=VALUES(confirmed_notified)`,
        [
            b.id, dt(b.created || b.createdAt),
            b.checkIn, b.checkOut, b.nights || 1, b.guests || '',
            b.name || '', b.phone || '', b.addons || '',
            b.total || 0, b.comment || '', b.status || 'pending', b.source || 'max_app',
            b.paymentId || null, b.paymentUrl || null, b.paymentYkId || null,
            dt(b.paidAt), b.paidSent ? 1 : 0,
            dt(b.refundedAt), b.refundedAmount != null ? b.refundedAmount : null,
            b.refundId || null,
            b.refundReminderSent ? 1 : 0,
            b.confirmedNotified ? 1 : 0
        ]
    ).catch(e => console.error('❌ DB upsert:', e.message));
}

export function logEvent(bid, event, details) {
    if (!dbPool) return;
    dbPool.query(
        'INSERT INTO events_log (booking_id, event, details) VALUES (?,?,?)',
        [bid, event, details || '']
    ).catch(() => {});
}

export async function dbLoadAll() {
    if (!dbPool) return [];
    const [rows] = await dbPool.query('SELECT * FROM bookings');
    return rows.map(r => ({
        id: r.id,
        created: r.created_at ? String(r.created_at).replace(' ', 'T') : '',
        checkIn: String(r.check_in || '').slice(0, 10),
        checkOut: String(r.check_out || '').slice(0, 10),
        nights: r.nights, guests: r.guests, name: r.name, phone: r.phone,
        addons: r.addons, total: Number(r.total) || 0, comment: r.comment,
        status: r.status, source: r.source,
        paymentId: r.payment_id, paymentUrl: r.payment_url, paymentYkId: r.payment_yk_id,
        paidAt: r.paid_at ? String(r.paid_at).replace(' ', 'T') : undefined,
        paidSent: !!r.paid_sent,
        refundedAt: r.refunded_at ? String(r.refunded_at).replace(' ', 'T') : undefined,
        refundedAmount: r.refunded_amount != null ? Number(r.refunded_amount) : undefined,
        refundId: r.refund_id,
        refundReminderSent: !!r.refund_reminder_sent,
        confirmedNotified: !!r.confirmed_notified
    }));
}

export async function getEvents(bid) {
    if (!dbPool) return [];
    try { const [rows] = await dbPool.query('SELECT * FROM events_log WHERE booking_id=? ORDER BY id DESC LIMIT 30', [bid]); return rows; } catch (e) { return []; }
}

export async function deleteBooking(id) {
    if (!dbPool) return { ok: false };
    try {
        await dbPool.query('DELETE FROM bookings WHERE id=?', [id]);
        await dbPool.query('DELETE FROM events_log WHERE booking_id=?', [id]);
        return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
}
