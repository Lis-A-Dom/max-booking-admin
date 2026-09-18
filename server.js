import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import crypto from 'crypto';
import { initDB, dbUpsert, logEvent, dbLoadAll, getEvents, deleteBooking } from './db.js';
import { adminLoginRoutes, adminGuard } from './admin-auth.js';
import { initPricing, ensureTables, listPrices, savePrice, deletePrice, calcStay, getSettings, setSetting } from './pricing.js';
import { initCRM, ensureCRMTables, syncFromBookings, listGuests, listCleanings, setCleaning, saveGuest, importGuests, deleteGuest, cleaningsForDate, deleteCleaningByBooking, setGuestMax, getGuestMax } from './crm.js';

const app = express();
const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const BOOKING_TOKEN = process.env.MAX_BOOKING_TOKEN;
const MAX_GROUP_CHAT = process.env.MAX_GROUP_CHAT;
const MAX_API = 'https://platform-api2.max.ru';
const ICS_URL = process.env.ICS_URL || 'https://www.avito.ru/calendars-export/73/21/7341015621.ics';
const OWNER_MAX_USER = 5470603;
const BOOKINGS_FILE = '/var/www/max-house-app/bookings.json';
const PUBLIC_HOST = 'https://lis-a-dom.ru';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/* ========== YOOKASSA ========== */
const YK_SHOP = process.env.YOOKASSA_SHOP_ID || '';
const YK_KEY = process.env.YOOKASSA_KEY || '';
const YK_API = 'https://api.yookassa.ru/v3';

function normPhone(s) {
    let d = String(s || '').replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '8' || d[0] === '7')) d = '7' + d.slice(1);
    if (d.length === 10 && d[0] === '9') d = '7' + d;
    if (d.length !== 11 || d[0] !== '7') return String(s || '');
    return '+' + d;
}
function patchBooking(id, patch) {
    const arr = loadBookings();
    const idx = arr.findIndex(b => b.id === id);
    if (idx === -1) return null;
    arr[idx] = Object.assign({}, arr[idx], patch);
    saveBookings(arr);
    return arr[idx];
}

async function ykCreatePayment(booking, amount) {
    const testAmount = process.env.YK_TEST_AMOUNT ? Number(process.env.YK_TEST_AMOUNT) : null;
    const value = (Number(amount) || 10000).toFixed(2);
    const body = {
        amount: { value: value, currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: PUBLIC_HOST + '/api/payment-result?booking=' + encodeURIComponent(booking.id) },
        description: 'Залог Лис-А-Дом, бронь ' + booking.id,
        metadata: { bookingId: booking.id }
    };
    console.log('💳 Создаём платёж для', booking.id, 'на', value, '₽');
    const r = await axios.post(YK_API + '/payments', body, {
        auth: { username: YK_SHOP, password: YK_KEY },
        headers: { 'Idempotence-Key': 'lis-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) },
        timeout: 30000,
        httpsAgent: httpsAgent
    });
    return { paymentId: r.data.id, url: r.data.confirmation && r.data.confirmation.confirmation_url };
}

async function ykGetPayment(paymentId) {
    const r = await axios.get(YK_API + '/payments/' + paymentId, {
        auth: { username: YK_SHOP, password: YK_KEY },
        timeout: 30000,
        httpsAgent: httpsAgent
    });
    return r.data;
}

async function notifyOwner(text) {
    const token = BOOKING_TOKEN || BOT_TOKEN;
    try {
        await axios.post(MAX_API + '/messages?user_id=' + OWNER_MAX_USER, { text: text },
            { headers: { Authorization: token, 'Content-Type': 'application/json' }, httpsAgent: httpsAgent, timeout: 30000 });
    } catch (e) { console.error('❌ MAX notify:', e.message); }
    /* TG removed */
}

app.use(cors());
app.use(express.json());

/* ---------- Антиспам ---------- */
const rateMap = new Map();
function checkRate(key, max, windowMs) {
    const now = Date.now();
    const arr = (rateMap.get(key) || []).filter(t => now - t < windowMs);
    arr.push(now);
    rateMap.set(key, arr);
    return arr.length <= max;
}
const lastBookings = new Map();

/* ---------- Работа с bookings.json ---------- */
function loadBookings() {
    try {
        if (!fs.existsSync(BOOKINGS_FILE)) return [];
        return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')).map(b => Object.assign({ status: 'pending' }, b));
    } catch (e) { return []; }
}
function saveBookings(arr) { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(arr, null, 2));
    if (typeof dbUpsert === 'function') arr.forEach(function(item) { dbUpsert(item); }); }
function findBooking(id) { return loadBookings().find(b => b.id === id) || null; }
function updateBookingStatus(id, status) {
    const arr = loadBookings();
    const idx = arr.findIndex(b => b.id === id);
    if (idx === -1) return null;
    arr[idx].status = status;
    arr[idx].statusChangedAt = new Date().toISOString();
    saveBookings(arr);
    return arr[idx];
}

/* ---------- HTML-страницы ---------- */
function htmlPage(ok, title, desc) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#FFF8F3;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border-radius:20px;padding:40px 28px;text-align:center;max-width:400px;box-shadow:0 8px 32px rgba(139,69,19,.15)}
.icon{font-size:64px;margin-bottom:12px}
h1{margin:0 0 8px;color:#2A1810;font-size:22px}
p{color:#666;font-size:15px;line-height:1.5;margin:0 0 20px}
a{display:inline-block;background:linear-gradient(135deg,#C86B2E,#E8914F);color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700}</style></head>
<body><div class="card"><div class="icon">${ok ? '✅' : '❌'}</div><h1>${title}</h1><p>${desc}</p></div></body></html>`;
}

/* ---------- Эндпоинты управления заявкой ---------- */
app.get('/act/confirm/:id', async (req, res) => {
    const id = req.params.id;
    const b = findBooking(id);
    if (!b) return res.send(htmlPage(false, 'Заявка не найдена', 'Заявка ' + id + ' не существует в базе.'));
    if (b.status === 'paid') {
        return res.send(voucherPage(b));
    }
    if (b.status === 'confirmed') {
        let pu = b.paymentUrl || '';
        if (!pu) {
            try {
                const pay = await ykCreatePayment(b, 10000);
                if (pay && pay.url) { patchBooking(id, { paymentId: pay.paymentId, paymentUrl: pay.url }); pu = pay.url; }
            } catch (e) { console.error('❌ YK create:', e.message); if (e.response) console.error('❌ YK детали:', e.response.status, JSON.stringify(e.response.data)); }
        }
        return res.send(htmlPage(true, 'Бронь подтверждена', 'Бронь ' + id + ' уже подтверждена.' + (pu ? '<br/><br/>💳 Ссылка на оплату:<br/><a href="' + pu + '" style="word-break:break-all">' + pu + '</a>' : '<br/><br/>⚠️ Ссылка не создалась — смотрите логи.')));
    }
    res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Подтверждение брони</title></head><body style="font-family:sans-serif;background:#FFF6EE;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="background:#fff;border-radius:20px;padding:32px;max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(139,69,19,.15)"><div style="font-size:52px">🦊</div><h2 style="margin:8px 0">Бронь ' + id + '</h2><p style="color:#666">' + b.checkIn + ' → ' + b.checkOut + '<br/>гость: ' + b.name + '</p><form method="POST" action="/api/act/confirm/' + id + '"><button type="submit" style="background:#22C55E;color:#fff;border:none;border-radius:12px;padding:16px 32px;font-size:17px;font-weight:700;cursor:pointer">✅ Подтвердить бронь</button></form></div></body></html>');
});

app.post('/act/confirm/:id', async (req, res) => {
    const id = req.params.id;
    const b = findBooking(id);
    if (!b) return res.send(htmlPage(false, 'Заявка не найдена', 'Заявка ' + id + ' не существует в базе.'));
    if (b.status === 'confirmed' || b.status === 'paid') {
        return res.send(htmlPage(true, 'Уже подтверждена', 'Бронь ' + id + ' уже подтверждена ранее.'));
    }
    updateBookingStatus(id, 'confirmed');
    logEvent(id, 'confirmed_link', '');
    console.log('✅ Подтверждено:', id);
    notifyOwner('✅ Бронь ' + id + ' подтверждена.');
    let payUrl = '';
    const existPay = findBooking(id);
    if (existPay && existPay.paymentUrl) {
        payUrl = existPay.paymentUrl;
    } else {
    try {
        const pay = await ykCreatePayment(findBooking(id), 10000);
        if (pay && pay.url) {
            patchBooking(id, { paymentId: pay.paymentId, paymentUrl: pay.url });
            payUrl = pay.url;
            notifyOwner('💳 Ссылка на оплату для гостя (' + id + '):\n' + pay.url);
        }
    } catch (e) {
        console.error('❌ YK create:', e.message);
        if (e.response) console.error('❌ YK детали:', e.response.status, JSON.stringify(e.response.data));
        else console.error('❌ YK без ответа от API — проверьте ключи и сеть');
    }
    }
    let extra = payUrl
        ? '<br/><br/>💳 Ссылка на оплату:<br/><a href="' + payUrl + '" style="word-break:break-all">' + payUrl + '</a>'
        : '<br/><br/>⚠️ Ссылка на оплату не создалась — подробности в логах сервера.';
    res.send(htmlPage(true, 'Бронь подтверждена', 'Бронь ' + id + ' (' + b.checkIn + ' → ' + b.checkOut + ')<br/>гость: ' + b.name + '.' + extra));
});

app.get('/act/reject/:id', (req, res) => {
    const id = req.params.id;
    const b = findBooking(id);
    if (!b) return res.send(htmlPage(false, 'Заявка не найдена', 'Заявка ' + id + ' не существует в базе.'));
    if (b.status === 'rejected') return res.send(htmlPage(true, 'Уже отклонена', 'Заявка ' + id + ' уже отклонена.'));
    res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Отклонение брони</title></head><body style="font-family:sans-serif;background:#FFF6EE;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="background:#fff;border-radius:20px;padding:32px;max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(139,69,19,.15)"><div style="font-size:52px">🦊</div><h2 style="margin:8px 0">Отклонить бронь ' + id + '?</h2><p style="color:#666">' + b.checkIn + ' → ' + b.checkOut + '<br/>гость: ' + b.name + '</p><form method="POST" action="/api/act/reject/' + id + '"><button type="submit" style="background:#EF4444;color:#fff;border:none;border-radius:12px;padding:16px 32px;font-size:17px;font-weight:700;cursor:pointer">❌ Отклонить</button></form></div></body></html>');
});

app.post('/act/reject/:id', (req, res) => {
    const id = req.params.id;
    const b = findBooking(id);
    if (!b) return res.send(htmlPage(false, 'Заявка не найдена', 'Заявка ' + id + ' не существует в базе.'));
    if (b.status === 'rejected') return res.send(htmlPage(true, 'Уже отклонена', 'Заявка ' + id + ' уже отклонена.'));
    updateBookingStatus(id, 'rejected');
    console.log('❌ Отклонено:', id);
    notifyOwner('❌ Бронь ' + id + ' отклонена.');
    res.send(htmlPage(true, 'Заявка отклонена', 'Заявка ' + id + ' (' + b.checkIn + ' → ' + b.checkOut + ')<br/>гость: ' + b.name + ' отклонена.'));
});



app.post('/yookassa/webhook', async (req, res) => {
    const ev = req.body || {};
    console.log('🔔 YooKassa event:', ev.event);
    try {
        if (ev.event === 'payment.succeeded' || ev.event === 'payment.canceled') {
            const obj = ev.object || {};
            const bookingId = obj.metadata && obj.metadata.bookingId;
            if (bookingId) {
                if (ev.event === 'payment.succeeded') {
                    const fresh = await ykGetPayment(obj.id).catch(() => null);
                    const realStatus = fresh ? fresh.status : obj.status;
                    if (realStatus === 'succeeded') {
                        patchBooking(bookingId, { status: 'paid', paymentYkId: obj.id, paidAt: new Date().toISOString() });
                        logEvent(bookingId, 'payment_succeeded', String((obj.amount && obj.amount.value) || ''));
                        const b = findBooking(bookingId);
                        if (b && b.paidSent) { res.status(200).send('OK'); return; }
                        patchBooking(bookingId, { paidSent: true });
                        await notifyOwner('💰 ОПЛАТА ПОЛУЧЕНА!\n\n📋 Бронь ' + bookingId + '\n👤 ' + (b ? b.name : '?') + '\n💵 Сумма: ' + ((obj.amount && obj.amount.value) || '?') + ' ₽\n\n✅ Статус: оплачено');
                    }
                } else {
                    patchBooking(bookingId, { status: 'confirmed', paymentCanceled: true });
                    await notifyOwner('⚠️ Платёж отменён: ' + bookingId);
                }
            }
        }
    } catch (e) { console.error('❌ YK webhook:', e.message); }
    res.status(200).send('OK');
});


/* ========== БИЛЕТ ГОСТЯ ПОСЛЕ ОПЛАТЫ ========== */
const CONTACT_PHONE = process.env.CONTACT_PHONE || '';
const CONTACT_PHONE_DIG = CONTACT_PHONE.replace(/\D/g, '');
const LOCATION_URL = process.env.LOCATION_URL || '';
const MAX_LINK = process.env.MAX_LINK || '';
const HOUSE_ADDRESS = process.env.HOUSE_ADDRESS || '';

function voucherPage(b) {
    const DEP = 10000;
    const total = Number(b.total) || 0;
    const nav = LOCATION_URL ? '<a class="vbtn vnav" href="' + LOCATION_URL + '" target="_blank">🧭 Как добраться</a>' : '';
    const maxBtn = '<a class="vbtn vmax" href="' + (MAX_LINK || 'https://max.ru/channel_lis_a_dom') + '" target="_blank">💬 Наша группа в MAX</a>';
    const tel = CONTACT_PHONE_DIG ? '<a class="vbtn vtel" href="tel:' + CONTACT_PHONE_DIG + '">📞 ' + CONTACT_PHONE + '</a>' : '';
    const addr = HOUSE_ADDRESS ? '<div class="row"><span>📍 Адрес</span><b>' + HOUSE_ADDRESS + '</b></div>' : '';
    const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=ffffff&color=1c1c1e&margin=8&data=' + encodeURIComponent(MAX_LINK || 'https://max.ru/channel_lis_a_dom');
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Лис-А-Дом — билет</title><style>' +
    '*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:radial-gradient(1200px 600px at 20% -10%,#3a2417 0%,#131315 55%,#0b0b0c 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#fff}' +
    '.card{width:100%;max-width:440px;background:rgba(44,44,46,.72);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.12);border-radius:26px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55)}' +
    '.head{padding:26px 26px 22px;text-align:center;background:linear-gradient(160deg,rgba(232,145,79,.25),rgba(200,107,46,.08));border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.head .fox{font-size:56px;filter:drop-shadow(0 6px 16px rgba(232,145,79,.45))}.head h1{margin:6px 0 2px;font-size:22px}.head p{margin:0;color:rgba(255,255,255,.6);font-size:13px}' +
    '.ok{display:inline-block;margin-top:12px;background:linear-gradient(135deg,#30D158,#22C55E);color:#06280f;border-radius:50px;padding:7px 18px;font-weight:800;font-size:12px;letter-spacing:.6px}' +
    '.body{padding:10px 26px 6px}.row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px dashed rgba(255,255,255,.10);font-size:15px}.row:last-child{border:none}.row span{color:rgba(255,255,255,.55)}.row b{font-weight:700;text-align:right}' +
    '.money{margin:12px 26px 4px;background:rgba(48,209,88,.12);border:1px solid rgba(48,209,88,.35);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}' +
    '.money .mrow{display:flex;justify-content:space-between;font-size:14.5px}.money .mrow span{color:rgba(255,255,255,.6)}.money .mrow b{color:#30D158}.money .mrow.rest b{color:#E8914F}' +
    '.qrwrap{margin:10px 26px 4px;background:#fff;border-radius:18px;padding:14px;display:flex;flex-direction:column;align-items:center;gap:8px}.qrwrap img{width:170px;height:170px;border-radius:8px}.qrwrap small{color:#1c1c1e;font-size:11.5px;font-weight:600;text-align:center}' +
    '.btns{display:flex;flex-direction:column;gap:10px;padding:14px 26px 8px}.vbtn{text-decoration:none;text-align:center;border-radius:14px;padding:15px;font-weight:700;font-size:15px}' +
    '.vmax{background:linear-gradient(135deg,#2E7CF6,#0055D4);color:#fff}.vnav{background:linear-gradient(135deg,#E8914F,#C86B2E);color:#fff}.vtel{background:rgba(255,255,255,.10);color:#fff;border:1px solid rgba(255,255,255,.14)}' +
    '.note{padding:8px 26px 26px;font-size:12.5px;color:rgba(255,255,255,.45);line-height:1.55}' +
    '</style></head><body><div class="card">' +
    '<div class="head"><div class="fox">🦊</div><h1>Лис-А-Дом</h1><p>Бронь оплачена · билет гостя</p><div class="ok">✅ ЗАЛОГ ВНЕСЁН</div></div>' +
    '<div class="body">' +
    '<div class="row"><span>Гость</span><b>' + b.name + '</b></div>' +
    '<div class="row"><span>Заезд</span><b>' + b.checkIn + ' · с 15:00</b></div>' +
    '<div class="row"><span>Выезд</span><b>' + b.checkOut + ' · до 12:00</b></div>' +
    '<div class="row"><span>Ночей</span><b>' + b.nights + '</b></div>' +
    '<div class="row"><span>Гостей</span><b>' + b.guests + '</b></div>' +
    addr +
    '<div class="row"><span>№ брони</span><b>' + b.id + '</b></div>' +
    '</div>' +
    '<div class="money">' +
    '<div class="mrow"><span>💰 Залог внесён</span><b>' + DEP.toLocaleString('ru-RU') + ' ₽</b></div>' +
    '<div class="mrow rest"><span>🔑 Стоимость проживания (при заезде)</span><b>' + total.toLocaleString('ru-RU') + ' ₽</b></div>' +
    '</div>' +
    '<div class="qrwrap"><img src="' + qr + '" alt="QR"/><small>🦊 Наша группа в MAX — новости, акции, связь</small></div>' +
    '<div class="btns">' + maxBtn + nav + tel + '</div>' +
    '<div class="note">Залог 10 000 ₽ полностью возвращается после уборки в день выезда.<br/>Будем рады видеть вас в Лис-А-Дом! 🧡</div>' +
    '</div></body></html>';
}

function pendingPage(b) {
    return '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Подтверждаем оплату</title><style>' +
    'body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:radial-gradient(900px 500px at 30% -10%,#3a2417 0%,#131315 60%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#fff}' +
    '.card{background:rgba(44,44,46,.72);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,.12);border-radius:26px;max-width:400px;width:100%;padding:38px 28px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.55)}' +
    '.spin{width:46px;height:46px;border:5px solid rgba(255,255,255,.12);border-top-color:#E8914F;border-radius:50%;margin:0 auto 18px;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}' +
    'h1{font-size:19px;margin:0 0 8px}p{color:rgba(255,255,255,.55);font-size:13.5px;line-height:1.5}' +
    '</style></head><body><div class="card"><div class="spin"></div><h1>Подтверждаем оплату…</h1><p>Бронь ' + b.id + ' (' + b.checkIn + ' → ' + b.checkOut + ').<br/>Страница обновится автоматически.</p></div>' +
    '<script>var t=0;var iv=setInterval(function(){t++;fetch("/api/payment-status/' + encodeURIComponent(b.id) + '").then(function(r){return r.json()}).then(function(j){if(j.status==="paid"){clearInterval(iv);location.reload()}}).catch(function(){});if(t>48)clearInterval(iv)},2500);</script>' +
    '</body></html>';
}

app.get('/payment-status/:id', async (req, res) => {
    const b = findBooking(req.params.id);
    if (!b) return res.json({ ok: false });
    if (b.status === 'paid') return res.json({ ok: true, status: 'paid' });
    if (b.paymentId) {
        try {
            const fresh = await ykGetPayment(b.paymentId);
            if (fresh && fresh.status === 'succeeded') {
                patchBooking(b.id, { status: 'paid', paidAt: new Date().toISOString() });
                if (!b.paidSent) {
                    patchBooking(b.id, { paidSent: true });
                    notifyOwner('💰 ОПЛАТА ПОЛУЧЕНА!\n\n📋 Бронь ' + b.id + '\n👤 ' + b.name + '\n💵 Сумма: ' + ((fresh.amount && fresh.amount.value) || '?') + ' ₽\n\n✅ Статус: оплачено');
                }
                return res.json({ ok: true, status: 'paid' });
            }
        } catch (e) {}
    }
    res.json({ ok: true, status: b.status });
});

app.get('/payment-result', async (req, res) => {
    const id = req.query.booking || '';
    const b = id ? findBooking(id) : null;
    if (!b) return res.send(htmlPage(true, 'Спасибо за оплату!', 'Платёж подтверждается. Мы свяжемся с вами в ближайшее время.'));
    if (b.status !== 'paid') {
        if (b.paymentId) {
            try {
                const fresh = await ykGetPayment(b.paymentId).catch(() => null);
                if (fresh && fresh.status === 'succeeded') {
                    patchBooking(b.id, { status: 'paid', paidAt: new Date().toISOString() });
                    if (!b.paidSent) {
                        patchBooking(b.id, { paidSent: true });
                        notifyOwner('💰 ОПЛАТА ПОЛУЧЕНА!\n\n📋 Бронь ' + b.id + '\n👤 ' + b.name + '\n💵 Сумма: ' + ((fresh.amount && fresh.amount.value) || '?') + ' ₽\n\n✅ Статус: оплачено');
                    }
                    return res.send(voucherPage(findBooking(b.id)));
                }
            } catch (e) {}
        }
        return res.send(pendingPage(b));
    }
    res.send(voucherPage(b));
});


/* ========== СОЗДАНИЕ БРОНИ (восстановлено) ========== */
/* ── БЕЗОПАСНЫЙ РАСЦЁТ: цены считает только сервер ── */
const KID_RATE = { '0-3': 0, '3-7': 1500, '7-14': 2000 };
async function calcQuote(b) {
    const ci = String((b || {}).checkIn || ''), co = String((b || {}).checkOut || '');
    if (!ci || !co || ci >= co) return null;
    const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
    if (nights < 1 || nights > 60) return null;
    const cs = await calcStay(ci, co);
    const stay = Number((cs && (cs.total !== undefined ? cs.total : cs.sum)) || 0);
    const adults = Math.min(6, Math.max(1, Number(b.adults) || 2));
    const kids = (Array.isArray(b.children) ? b.children : []).slice(0, 5).map(k => String(k));
    const extraPer = Math.max(0, adults - 2) * 4000 + kids.reduce((sum, k) => sum + (KID_RATE[k] || 0), 0);
    const extra = extraPer * nights;
    const kd = Math.min(nights, Math.max(0, Number(b.kupelDays) || 0));
    const kupel = kd > 0 ? 6000 + 2000 * (kd - 1) : 0;
    const set = await getSettings();
    const deposit = Number(set.deposit || 10000);
    return { nights: nights, stay: stay, extra: extra, kupel: kupel, kupelDays: kd, total: stay + extra + kupel, deposit: deposit, adults: adults, children: kids };
}
app.post(['/quote', '/api/quote'], async (req, res) => {
    const q = await calcQuote(req.body || {});
    if (!q) return res.status(400).json({ ok: false, error: 'Неверные даты' });
    res.json(Object.assign({ ok: true }, q));
});
app.post('/booking', async (req, res) => {
    const _ci = (req.body || {}).checkIn, _co = (req.body || {}).checkOut;
    if (_ci && _co) {
        const _av = await fetchAvitoBusy();
        if (_av.some(ev => _co > ev.start && _ci < ev.end)) {
            return res.status(409).json({ ok: false, error: 'Эти даты закрыты на Авито — выберите другие' });
        }
    const _bs = loadBookings().filter(b => (b.status === 'paid' || b.status === 'confirmed') && b.checkIn && b.checkOut);
    if (_bs.some(b => _co > b.checkIn && _ci < b.checkOut)) {
        return res.status(409).json({ ok: false, error: 'Эти даты уже заняты другой бронью — выберите другие' });
    }
    }
    const b = req.body || {};
    if (!b.checkIn || !b.checkOut) return res.status(400).json({ ok: false, error: 'Нет дат' });
    const q = await calcQuote(b);
    b.phone = normPhone(b.phone);
    if (!String(b.name || '').trim()) return res.status(400).json({ ok: false, error: 'Нет имени' });
    
    const id = 'Lis-A-Dom-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const nights = Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / 86400000);
    
    const booking = {
        id: id,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: nights,
        guests: b.guests || (q ? (q.adults + ' взр' + (q.children.length ? ' + ' + q.children.length + ' дет' : '')) : '—'),
        name: b.name,
        phone: b.phone || '',
        addons: b.addons || (q && q.kupelDays ? 'купель ' + q.kupelDays + ' сут' : '—'),
        total: q ? q.total : (Number(b.total) || 0),
        comment: b.comment || '',
        status: 'pending',
        created: new Date().toISOString()
    };
    
    const arr = loadBookings();
    arr.push(booking);
    saveBookings(arr);
    if (b.maxUserId) setGuestMax(booking.phone, b.maxUserId);
    
    console.log('✅ Новая бронь:', id);

    let paymentUrl = '';
    try {
        const pay = await ykCreatePayment(booking, q ? q.deposit : 10000);
        if (pay && pay.url) {
            patchBooking(id, { paymentId: pay.paymentId, paymentUrl: pay.url });
            paymentUrl = pay.url;
        }
    } catch (e) {
        console.error('❌ YK deposit create:', e.message);
        if (e.response) console.error('❌ YK детали:', e.response.status, JSON.stringify(e.response.data));
    }
    
    // Уведомления
    const tgText = '🆕 НОВАЯ ЗАЯВКА\n\n📋 ' + id + '\n📅 ' + booking.checkIn + ' → ' + booking.checkOut + ' (' + booking.nights + ' ноч.)\n👥 ' + booking.guests + '\n👤 ' + booking.name + '\n📞 ' + booking.phone + '\n💰 ' + booking.total + ' ₽\n\n✅ Подтвердить:\n' + PUBLIC_HOST + '/api/act/confirm/' + id + '\n\n❌ Отклонить:\n' + PUBLIC_HOST + '/api/act/reject/' + id + '\n\n💰 Оплачено вручную (перевод вам):\n' + PUBLIC_HOST + '/api/act/paid/' + id;
    
    let tg = false, mx = false, mxg = false, file = false;
    try {
        /* TG removed */
    } catch (e) {}
    try {
        if (OWNER_MAX_USER) {
            await axios.post(MAX_API + '/messages?user_id=' + OWNER_MAX_USER,
                { text: tgText },
                { headers: { Authorization: BOOKING_TOKEN || BOT_TOKEN, 'Content-Type': 'application/json' }, httpsAgent, timeout: 30000 });
            mx = true;
        }
    } catch (e) {}
    try {
        if (MAX_GROUP_ID) {
            await axios.post(MAX_API + '/messages?group_id=' + MAX_GROUP_ID,
                { text: tgText },
                { headers: { Authorization: BOOKING_TOKEN || BOT_TOKEN, 'Content-Type': 'application/json' }, httpsAgent, timeout: 30000 });
            mxg = true;
        }
    } catch (e) {}
    
    // Файл с действиями подтверждения
    try {
        const actText = '✅ Подтвердить: ' + PUBLIC_HOST + '/api/act/confirm/' + id + '\n❌ Отклонить: ' + PUBLIC_HOST + '/api/act/reject/' + id;
        fs.writeFileSync('/var/www/max-house-app/act-' + id + '.txt', actText);
        file = true;
    } catch (e) {}
    
    res.json({ ok: true, id: id, paymentUrl: paymentUrl, telegram: tg, max_owner: mx, max_group: mxg, file: file });
});


/* ========== РУЧНАЯ ОТМЕТКА ОПЛАТЫ ========== */
app.get('/act/paid/:id', (req, res) => {
    const id = req.params.id;
    const b = findBooking(id);
    if (!b) return res.send(htmlPage(false, 'Заявка не найдена', 'Заявка ' + id + ' не существует.'));
    if (b.status === 'paid') return res.send(htmlPage(true, 'Уже оплачена', 'Бронь ' + id + ' уже отмечена оплаченной.'));
    res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Отметка оплаты</title></head><body style="font-family:sans-serif;background:#FFF6EE;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><div style="background:#fff;border-radius:20px;padding:32px;max-width:420px;text-align:center;box-shadow:0 8px 32px rgba(139,69,19,.15)"><div style="font-size:52px">💰</div><h2 style="margin:8px 0">Отметить оплату вручную?</h2><p style="color:#666">Бронь ' + id + '<br/>' + b.name + ' · ' + (Number(b.total) || 0).toLocaleString('ru-RU') + ' ₽<br/><small>Используйте, если гость перевёл деньги лично вам</small></p><form method="POST" action="/api/act/paid/' + id + '"><button type="submit" style="background:#22C55E;color:#fff;border:none;border-radius:12px;padding:16px 32px;font-size:17px;font-weight:700;cursor:pointer">💰 Оплачено вручную</button></form></div></body></html>');
});

app.post('/act/paid/:id', (req, res) => {
    const id = req.params.id;
    const b = findBooking(id);
    if (!b) return res.send(htmlPage(false, 'Заявка не найдена', 'Заявка ' + id + ' не существует.'));
    if (b.status === 'paid') return res.send(htmlPage(true, 'Уже оплачена', 'Бронь ' + id + ' уже отмечена оплаченной.'));
    patchBooking(id, { status: 'paid', paidAt: new Date().toISOString(), manualPaid: true, paidSent: true });
    logEvent(id, 'manual_paid', '');
    notifyOwner('💰 Бронь ' + id + ' отмечена ОПЛАЧЕННОЙ вручную (' + b.name + ', ' + (Number(b.total) || 0).toLocaleString('ru-RU') + ' ₽)');
    res.send(htmlPage(true, 'Оплата отмечена', 'Бронь ' + id + ' (' + b.name + ') отмечена как оплаченная вручную.'));
});

app.get('/health', (req, res) => res.json({ status: 'ok', bookings: loadBookings().length }));


/* ========== ВОЗВРАТЫ ЗАЛОГА И НАПОМИНАНИЕ 14:30 МСК ========== */
async function ykRefund(paymentId, value) {
    const r = await axios.post(YK_API + '/refunds', {
        payment_id: paymentId,
        amount: { value: value, currency: 'RUB' }
    }, {
        auth: { username: YK_SHOP, password: YK_KEY },
        headers: { 'Idempotence-Key': 'ref-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) },
        timeout: 30000,
        httpsAgent: httpsAgent
    });
    return r.data;
}

async function sendRefundReminder(b) {
    const txt = '⏰ НАПОМИНАНИЕ: возврат залога\n\n' +
        '📋 Бронь ' + b.id + '\n' +
        '👤 ' + b.name + '\n' +
        '📅 Выезд сегодня до 12:00\n\n' +
        'Если всё в порядке и повреждений нет:\n' +
        '💸 Полный возврат:\n' + PUBLIC_HOST + '/api/act/refund/' + b.id + '\n\n' +
        'Если нужно удержать за повреждения:\n' +
        '🧾 Ручной возврат (своя сумма):\n' + PUBLIC_HOST + '/api/act/refund/' + b.id + '/manual';
    notifyOwner(txt);
    console.log('⏰ Напоминание о возврате отправлено:', b.id);
}

function mskDate() { return new Date(Date.now() + 3 * 3600 * 1000); }

setInterval(() => {
    try {
        const d = mskDate();
        if (d.getUTCHours() !== 14 || d.getUTCMinutes() !== 30) return;
        const today = d.toISOString().slice(0, 10);
        loadBookings().forEach(b => {
            if (b.checkOut === today && !b.refundReminderSent && (b.status === 'paid' || b.status === 'confirmed')) {
                patchBooking(b.id, { refundReminderSent: true });
                sendRefundReminder(b);
            }
        });
    } catch (e) { console.error('❌ scheduler:', e.message); }
}, 30000);

async function doRefund(b, value, res) {
    const payId = b.paymentYkId || b.paymentId;
    if (!payId) return res.send(htmlPage(false, 'Нет платежа', 'По брони ' + b.id + ' нет платежа ЮKassa.'));
    try {
        const pay = await ykGetPayment(payId);
        if (pay.status !== 'succeeded') return res.send(htmlPage(false, 'Залог ещё не оплачен', 'Гость пока не оплатил залог по этой брони (статус платежа: ' + pay.status + '). Возвращать нечего — возврат станет доступен после оплаты.'));
        const refunded = (pay.refunded_amount && Number(pay.refunded_amount.value)) || 0;
        const left = Number(pay.amount.value) - refunded;
        if (left <= 0) return res.send(htmlPage(true, 'Уже возвращено', 'По брони ' + b.id + ' залог уже возвращён полностью.'));
        const val = Number(value);
        if (!val || val <= 0 || val > left) return res.send(htmlPage(false, 'Неверная сумма', 'Можно вернуть от 0.01 до ' + left.toFixed(2) + ' ₽.'));
        const r = await ykRefund(payId, val.toFixed(2));
        patchBooking(b.id, { refundedAt: new Date().toISOString(), refundId: r.id, refundedAmount: val.toFixed(2) });
    logEvent(b.id, 'refund_created', val.toFixed(2));
        notifyOwner('💸 Возврат создан: ' + b.id + ' · ' + val.toFixed(2) + ' ₽ · статус: ' + r.status);
        res.send(htmlPage(true, 'Возврат создан', 'Бронь ' + b.id + ': ' + val.toFixed(2) + ' ₽ вернутся гостю за 1–3 дня.'));
    } catch (e) {
        res.send(htmlPage(false, 'Ошибка возврата', e.message + (e.response ? ': ' + JSON.stringify(e.response.data) : '')));
    }
}

app.get('/act/refund/:id', async (req, res) => {
    const b = findBooking(req.params.id);
    if (!b) return res.send(htmlPage(false, 'Бронь не найдена', 'Бронь ' + req.params.id + ' не существует.'));
    if (b.refundedAt) return res.send(htmlPage(true, 'Возврат уже сделан', 'Бронь ' + b.id + ': возврат ' + (b.refundedAmount || '') + ' ₽ создан ' + String(b.refundedAt).slice(0, 10) + '.'));
    let dep = 10000;
    const pid = b.paymentYkId || b.paymentId;
    if (pid) { try { dep = Number((await ykGetPayment(pid)).amount.value) || 10000; } catch (e) {} }
    res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Возврат залога</title></head><body style="font-family:-apple-system,sans-serif;background:#131315;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px"><div style="background:rgba(44,44,46,.8);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:32px;max-width:420px;width:100%;text-align:center;color:#fff"><div style="font-size:52px">💸</div><h2 style="margin:10px 0">Полный возврат залога</h2><p style="color:rgba(255,255,255,.6);font-size:14px">Бронь ' + b.id + '<br/>' + b.name + '<br/>Сумма: ' + (10000).toLocaleString('ru-RU') + ' ₽</p><form method="POST" action="/api/act/refund/' + b.id + '"><button type="submit" style="background:linear-gradient(135deg,#34C759,#28A745);color:#fff;border:none;border-radius:14px;padding:16px 28px;font-size:16px;font-weight:700;cursor:pointer;width:100%">💸 Вернуть залог полностью</button></form><p style="margin-top:14px"><a href="/api/act/refund/' + b.id + '/manual" style="color:#E8914F;font-size:14px">🧾 Частичный возврат (удержать за повреждения)</a></p></div></body></html>');
});

app.post('/act/refund/:id', async (req, res) => {
    const b = findBooking(req.params.id);
    if (!b) return res.send(htmlPage(false, 'Бронь не найдена', ''));
    const payId = b.paymentYkId || b.paymentId;
    let full = 10000;
    if (payId) { try { const pay = await ykGetPayment(payId); full = Number(pay.amount.value); } catch (e) {} }
    doRefund(b, full, res);
});

app.get('/act/refund/:id/manual', async (req, res) => {
    const b = findBooking(req.params.id);
    if (!b) return res.send(htmlPage(false, 'Бронь не найдена', ''));
    let dep = 10000;
    const pid = b.paymentYkId || b.paymentId;
    if (pid) { try { dep = Number((await ykGetPayment(pid)).amount.value) || 10000; } catch (e) {} }
    res.send('<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Частичный возврат</title></head><body style="font-family:-apple-system,sans-serif;background:#131315;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px"><div style="background:rgba(44,44,46,.8);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:32px;max-width:420px;width:100%;text-align:center;color:#fff"><div style="font-size:52px">🧾</div><h2 style="margin:10px 0">Частичный возврат</h2><p style="color:rgba(255,255,255,.6);font-size:14px">Бронь ' + b.id + ' · ' + b.name + '<br/>Укажите сумму возврата гостю (остальное удержите)</p><input id="amt" type="number" value="' + dep + '" style="width:100%;box-sizing:border-box;padding:16px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-size:18px;text-align:center;margin:12px 0"/><button onclick="go()" style="background:linear-gradient(135deg,#E8914F,#C86B2E);color:#fff;border:none;border-radius:14px;padding:16px 28px;font-size:16px;font-weight:700;cursor:pointer;width:100%">Вернуть указанную сумму</button><script>function go(){fetch("/api/act/refund/' + b.id + '/partial",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:document.getElementById("amt").value})}).then(function(r){return r.text()}).then(function(t){document.open();document.write(t);document.close()})}</script></div></body></html>');
});

app.post('/act/refund/:id/partial', async (req, res) => {
    const b = findBooking(req.params.id);
    if (!b) return res.send(htmlPage(false, 'Бронь не найдена', ''));
    doRefund(b, (req.body || {}).amount, res);
});

app.get('/debug/refund-reminder/:id', (req, res) => {
    const b = findBooking(req.params.id);
    if (!b) return res.send('not found');
    sendRefundReminder(b);
    res.send('reminder sent to owner');
});


/* ========== УТРЕННИЙ ОТЧЁТ В MAX В 9:00 МСК ========== */
async function sendMorningReport() {
    const d = mskDate();
    const today = d.toISOString().slice(0, 10);
    const yesterday = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';
    const all = loadBookings();

    const checkins = all.filter(b => b.checkIn === today && (b.status === 'confirmed' || b.status === 'paid'));
    const checkouts = all.filter(b => b.checkOut === today && (b.status === 'confirmed' || b.status === 'paid'));
    const paidYesterday = all.filter(b => b.paidAt && b.paidAt.slice(0, 10) === yesterday && b.status === 'paid');
    const monthBookings = all.filter(b => b.checkIn >= monthStart && (b.status === 'confirmed' || b.status === 'paid'));

    const fmtDate = iso => {
        if (!iso) return '?';
        const [y, m, day] = iso.split('-');
        const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        return day + ' ' + months[parseInt(m, 10) - 1];
    };
    const money = n => Number(n || 0).toLocaleString('ru-RU') + ' ₽';

    const dateRu = fmtDate(today) + ' ' + today.slice(0, 4);

    let txt = '🌅 ДОБРОЕ УТРО!\n\n📅 ' + dateRu + '\n\n';

    if (checkins.length) {
        txt += '📥 ЗАЕЗДЫ СЕГОДНЯ (' + checkins.length + '):\n';
        checkins.forEach(b => {
            txt += '• ' + b.name + ' · ' + b.guests + ' · ' + money(b.total) + '\n  № ' + b.id + '\n';
        });
        txt += '\n';
    } else {
        txt += '📥 Заездов сегодня нет\n\n';
    }

    if (checkouts.length) {
        txt += '📤 ВЫЕЗДЫ СЕГОДНЯ (' + checkouts.length + '):\n';
        checkouts.forEach(b => {
            const refunded = b.refundedAmount ? ' (возврат ' + money(b.refundedAmount) + ')' : '';
            txt += '• ' + b.name + ' · № ' + b.id + refunded + '\n';
        });
        txt += '\n';
    } else {
        txt += '📤 Выездов сегодня нет\n\n';
    }

    if (paidYesterday.length) {
        const sum = paidYesterday.reduce((s, b) => s + (Number(b.total) || 0), 0);
        txt += '💰 ОПЛАЧЕНО ЗА ВЧЕРА:\n' + paidYesterday.length + ' броней · ' + money(sum) + '\n\n';
    } else {
        txt += '💰 Оплат вчера не было\n\n';
    }

    txt += '📊 БРОНЕЙ В ЭТОМ МЕСЯЦЕ: ' + monthBookings.length + '\n';

    const active = all.filter(b => b.status === 'confirmed' || b.status === 'paid').length;
    txt += '🔥 АКТИВНЫХ БРОНЕЙ ВСЕГО: ' + active + '\n\n';

    txt += 'Хорошего дня! 🦊';

    try {
        const cls = await cleaningsForDate(today);
        if (cls.length) {
            txt += '🧽 УБОРКИ СЕГОДНЯ (' + cls.length + '):\n';
            cls.forEach(c => { txt += '• ' + c.booking_id + (c.status === 'done' ? ' — готово ✅' : ' — ожидает ⏳') + (c.note ? ' (' + c.note + ')' : '') + '\n'; });
            txt += '\n';
        }
    } catch (e) {}
    notifyOwner(txt);
    console.log('🌅 Утренний отчёт отправлен:', today);
}

setInterval(() => {
    try {
        const d = mskDate();
        if (d.getUTCHours() !== 6 || d.getUTCMinutes() !== 0) return;
        const today = d.toISOString().slice(0, 10);
        const sent = loadBookings().some(b => b.morningReportDate === today);
        if (sent) return;
        loadBookings().slice(0, 1).forEach(b => patchBooking(b.id, { morningReportDate: today }));
        if (loadBookings().length === 0) {
            const flag = { id: 'FLAG-' + today, morningReportDate: today };
            const arr = loadBookings(); arr.push(flag); saveBookings(arr);
        }
        sendMorningReport();
    } catch (e) { console.error('❌ morning report:', e.message); }
}, 30000);

app.get('/debug/morning-report', async (req, res) => {
    try { await sendMorningReport(); res.send('morning report sent'); }
    catch (e) { res.send('error: ' + e.message); }
});

initPricing();
ensureTables().then(ok => { if (ok) console.log('✅ Цены: таблицы готовы'); });
initCRM();
ensureCRMTables().then(ok => { if (ok) console.log('✅ CRM: таблицы готовы'); });
function runSync() { syncFromBookings(loadBookings()).then(() => console.log('✅ CRM: синхронизация гостей и уборок')).catch(e => console.error('❌ CRM sync:', e.message)); }
setTimeout(runSync, 5000);
setInterval(runSync, 3600000);
initDB().then(ok => {
    if (ok) console.log('✅ MySQL готов');
    else console.log('⚠️ Работа без MySQL (JSON fallback)');
}).catch(e => console.error('❌ initDB:', e.message));


/* ========== АДМИН-ШАХМАТКА ========== */
/* ========== АВТОРИЗАЦИЯ АДМИНКИ ========== */
adminLoginRoutes(app);
app.use('/admin', adminGuard);
/* ========== ЦЕНЫ: API ========== */
app.get('/calendar.ics', (req, res) => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const out = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LisADom//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Lis-A-Dom Bookings'];
    loadBookings().filter(bb => (bb.status === 'paid' || bb.status === 'confirmed') && bb.checkIn && bb.checkOut).forEach(bb => {
        out.push('BEGIN:VEVENT','UID:lis-' + crypto.createHash('md5').update(String(bb.id)).digest('hex') + '@lisadom','DTSTAMP:' + stamp,'DTSTART;VALUE=DATE:' + bb.checkIn.replace(/-/g, ''),'DTEND;VALUE=DATE:' + bb.checkOut.replace(/-/g, ''),'STATUS:CONFIRMED','SUMMARY:Zanyato (Lis-A-Dom)','END:VEVENT');
    });
    out.push('END:VCALENDAR');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.send(out.join('\r\n') + '\r\n');
});
app.get(['/api/prices', '/prices'], async (req, res) => {
    const from = String(req.query.from || ''), to = String(req.query.to || '');
    if (from && to && from < to) { res.json(Object.assign({ ok: true }, await calcStay(from, to))); return; }
    const cfg = { ok: true, overrides: {}, blocked: [], holidays: [], deposit: 10000 };
    try {
        const set = await getSettings();
        cfg.deposit = Number(set.deposit || 10000);
        cfg.base = Number(set.base_price || 12000);
        const next = d => { const dt = new Date(d + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + 1); return dt.toISOString().slice(0, 10); };
        (await listPrices()).forEach(pr => { let d = String(pr.date_start).slice(0, 10); const end = String(pr.date_end).slice(0, 10); while (d <= end) { cfg.overrides[d] = Number(pr.price_per_night); d = next(d); } });
        loadBookings().filter(b => (b.status === 'paid' || b.status === 'confirmed') && b.checkIn && b.checkOut).forEach(b => { let d = b.checkIn; while (d < b.checkOut) { cfg.blocked.push(d); d = next(d); } });
        (await fetchAvitoBusy()).forEach(ev => { let d = ev.start; while (d < ev.end) { cfg.blocked.push(d); d = next(d); } });
    } catch (e) { console.error('❌ prices cfg:', e.message); }
    res.json(cfg);
});
app.get('/admin/api/prices', async (req, res) => {
    res.json({ ok: true, prices: await listPrices(), settings: await getSettings() });
});
app.post('/admin/api/prices', async (req, res) => { res.json(await savePrice(req.body || {})); });
app.post('/admin/api/prices/delete', async (req, res) => { res.json(await deletePrice((req.body || {}).id)); });
app.get('/admin/api/guests', async (req, res) => { res.json({ ok: true, guests: await listGuests(String(req.query.q || '')) }); });
app.post('/admin/api/guests', async (req, res) => { res.json(await saveGuest(req.body || {})); });
app.post('/admin/api/guests/import', async (req, res) => { const b = req.body || {}; res.json(await importGuests(Array.isArray(b.guests) ? b.guests : [])); });
app.post('/admin/api/guests/delete', async (req, res) => { res.json(await deleteGuest(Number((req.body || {}).id))); });
app.get('/admin/api/events', async (req, res) => { res.json({ ok: true, events: await getEvents(String(req.query.id || '')) }); });
app.post('/admin/api/bookings/delete', async (req, res) => {
    const id = String((req.body || {}).id || '');
    if (!id) return res.json({ ok: false, error: 'no id' });
    saveBookings(loadBookings().filter(b => b.id !== id));
    await deleteBooking(id);
    await deleteCleaningByBooking(id);
    console.log('🗑 Бронь удалена:', id);
    res.json({ ok: true });
});
app.post('/admin/api/send-max', async (req, res) => {
    const b = req.body || {};
    const uid = await getGuestMax(String(b.phone || ''));
    if (!uid) return res.json({ ok: false, error: 'У гостя нет привязки к MAX (появится после брони через мини-апп)' });
    const token = BOOKING_TOKEN || BOT_TOKEN;
    try {
        const r = await axios.post(MAX_API + '/messages?user_id=' + uid, { text: String(b.text || '') }, { headers: { Authorization: token, 'Content-Type': 'application/json' }, httpsAgent: httpsAgent, timeout: 30000 });
        res.json({ ok: r.status === 200 });
    } catch (e) { res.json({ ok: false, error: e.message }); }
});
app.get('/admin/api/cleanings', async (req, res) => { res.json({ ok: true, cleanings: await listCleanings() }); });
app.post('/admin/api/cleanings/status', async (req, res) => { const b = req.body || {}; res.json(await setCleaning(Number(b.id), String(b.status || 'pending'), String(b.note || ''))); });
app.get('/admin/api/sync', async (req, res) => { await syncFromBookings(loadBookings()); res.json({ ok: true }); });
app.post('/admin/api/settings', async (req, res) => {
    const b = req.body || {};
    if (!b.k) return res.json({ ok: false, error: 'no key' });
    res.json(await setSetting(String(b.k), String(b.v || '')));
});

app.get('/admin/api/bookings', async (req, res) => {
    try {
        const rows = await dbLoadAll();
        if (rows && rows.length) return res.json(rows);
    } catch (e) { console.error('❌ admin bookings MySQL:', e.message); }
    res.json(loadBookings());
});
app.post('/admin/api/status', (req, res) => {
    const id = (req.body || {}).id, status = (req.body || {}).status;
    if (!id || !status) return res.status(400).json({ ok: false });
    const b = patchBooking(id, { status: status });
    if (!b) return res.status(404).json({ ok: false });
    logEvent(id, 'admin_status:' + status, '');
    res.json({ ok: true, status: status });
});

app.get('/admin/', (req, res) => { res.redirect('/admin/board'); });
app.get('/admin/board', (req, res) => {
    try { res.type('html').send(fs.readFileSync('/var/www/max-house-app/admin-board.html', 'utf8')); }
    catch (e) { res.status(500).send('admin-board.html не найден'); }
});


/* ========== АВИТО: ЧТЕНИЕ ЗАКРЫТЫХ ДАТ + ЭКСПОРТ НАШЕГО КАЛЕНДАРЯ ========== */
let AVITO_CACHE = { ts: 0, events: [] };

async function fetchAvitoBusy(force) {
    if (!force && Date.now() - AVITO_CACHE.ts < 600000) return AVITO_CACHE.events;
    try {
        const r = await axios.get(ICS_URL, { timeout: 15000, httpsAgent: httpsAgent });
        const events = [];
        const reEv = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g;
        let m;
        while ((m = reEv.exec(r.data))) {
            const blk = m[0];
            const s = (blk.match(/DTSTART[^\n]*?(\d{8})/) || [])[1];
            const e = (blk.match(/DTEND[^\n]*?(\d{8})/) || [])[1];
            const sum = (blk.match(/SUMMARY:([^\n\r]*)/) || [])[1] || '';
            if (s) events.push({
                start: s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8),
                end: e ? e.slice(0, 4) + '-' + e.slice(4, 6) + '-' + e.slice(6, 8) : s,
                summary: sum.trim()
            });
        }
        AVITO_CACHE = { ts: Date.now(), events: events };
        console.log('📅 Авито ICS: закрытых периодов:', events.length);
        return events;
    } catch (e) {
        console.error('❌ Avito ICS:', e.message);
        return AVITO_CACHE.events;
    }
}

app.get('/admin/api/avito', async (req, res) => { res.json(await fetchAvitoBusy(true)); });

app.post('/admin/api/create', (req, res) => {
    const b = req.body || {};
    if (!b.checkIn || !b.checkOut || b.checkIn >= b.checkOut) return res.status(400).json({ ok: false, error: 'Неверные даты' });
    const d = new Date();
    const id = 'Lis-A-Dom-' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const nights = Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / 86400000);
    b.phone = normPhone(b.phone);
    const nb = {
        id: id, created: new Date().toISOString(), checkIn: b.checkIn, checkOut: b.checkOut,
        nights: nights, guests: b.guests || '', name: b.name || 'Ручная бронь', phone: b.phone || '',
        total: Number(b.total) || 0, status: b.status || 'confirmed', source: b.source || 'manual',
        comment: b.comment || ''
    };
    const arr = loadBookings();
    arr.push(nb);
    saveBookings(arr);
    logEvent(id, 'admin_create', b.source || 'manual');
    res.json({ ok: true, id: id });
});

app.get('/ics-sync/:secret/calendar.ics', (req, res) => {
    if (req.params.secret !== (process.env.ICS_SECRET || 'lisadom2026')) return res.status(404).send('');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LisADom//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Lis-A-Dom Bookings'];
loadBookings().filter(b => (b.status === 'paid' || b.status === 'confirmed') && b.checkIn && b.checkOut).forEach(b => {
        out.push('BEGIN:VEVENT',
            'UID:lis-' + crypto.createHash('md5').update(String(b.id)).digest('hex') + '@lisadom',
            'DTSTAMP:' + stamp,
            'DTSTART;VALUE=DATE:' + b.checkIn.replace(/-/g, ''),
            'DTEND;VALUE=DATE:' + b.checkOut.replace(/-/g, ''),
            'STATUS:CONFIRMED',
            'SUMMARY:Zanyato (Lis-A-Dom)',
            'END:VEVENT');
    });
    out.push('END:VCALENDAR');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.send(out.join('\r\n') + '\r\n');
});

app.get('/debug/notify', async (req, res) => {
    try {
        await notifyOwner((req.query.msg && decodeURIComponent(req.query.msg)) || '🟢 Тест мониторинга');
        res.json({ ok: true, message: 'отправлено' });
    } catch (e) {
        res.json({ ok: false, error: e.message });
    }
});
app.get('/debug/env', (req, res) => { res.json({ hasToken: !!process.env.MAX_BOOKING_TOKEN, len: (process.env.MAX_BOOKING_TOKEN || '').length, owner: process.env.OWNER_MAX_USER }); });
app.get('/test', (req, res) => { res.json({ message: 'Работает!' }); });
/* ---------- ICS-календарь для Авито (RFC 5545) ---------- */
app.get(['/api/ics', '/ics'], (req, res) => {
    try {
        const bs = loadBookings().filter(b => !b.paymentCanceled && (b.status === 'confirmed' || b.status === 'pending' || b.status === 'paid') && b.checkIn && b.checkOut);
        const CRLF = String.fromCharCode(13, 10);
        const pad = (n) => String(n).padStart(2, '0');
        const dt = (d) => { const x = new Date(d); return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()); };
        let out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lis-A-Dom//RU', 'X-WR-CALNAME:Lis-A-Dom', 'X-WR-TIMEZONE:Europe/Moscow'].join(CRLF) + CRLF;
        bs.forEach(b => {
            const lines = [
                'BEGIN:VEVENT',
                'UID:' + b.id + '@lis-a-dom.ru',
                'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
                'DTSTART;VALUE=DATE:' + dt(b.checkIn),
                'DTEND;VALUE=DATE:' + dt(b.checkOut),
                'SUMMARY:Занято ' + b.id,
                'END:VEVENT'
            ];
            out += lines.join(CRLF) + CRLF;
        });
        out += 'END:VCALENDAR' + CRLF;
        res.set('Content-Type', 'text/calendar; charset=utf-8');
        res.send(out);
    } catch (e) {
        console.error('ICS error:', e.message);
        res.status(500).send('ICS error');
    }
});

app.listen(PORT, () => console.log('✅ Сервер: http://localhost:' + PORT));

// === HEALTH CHECK (для мониторинга) ===
app.get('/api/v1/health', (req, res) => {
    res.json({
        ok: true,
        server: 'up',
        db: dbPool ? 'connected' : 'disconnected',
        crm: pool ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
