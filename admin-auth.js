/* ===========================================================
   АВТОРИЗАЦИЯ АДМИНКИ: вход, сессии, восстановление пароля
   =========================================================== */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '.admin-auth.json');
const LOGIN_PAGE = path.join(__dirname, 'admin-login.html');
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const COOKIE = 'admin_session';
const SESSION_DAYS = 7;

/* ---------- Хеширование ---------- */
const hash = (pass, salt) => crypto.scryptSync(String(pass), salt, 64).toString('hex');
const makeRecord = (pass) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return { salt, hash: hash(pass, salt) };
};
const check = (pass, rec) => {
    if (!rec) return false;
    const a = Buffer.from(hash(pass, rec.salt), 'hex');
    const b = Buffer.from(rec.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ---------- Хранилище ---------- */
function loadAuth() {
    try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); } catch (e) { return null; }
}
function saveAuth(data) { fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 }); }
const formatCode = (c) => c.match(/.{4}/g).join('-');

export function isSetupNeeded() { return !loadAuth(); }

export function setupPassword(password) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    saveAuth({ pass: makeRecord(password), recovery: makeRecord(code), createdAt: new Date().toISOString() });
    return formatCode(code);
}

export function changePassword(code, newPassword) {
    const data = loadAuth();
    if (!data || !check(String(code).replace(/-/g, '').toUpperCase(), data.recovery)) return null;
    const newCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    data.pass = makeRecord(newPassword);
    data.recovery = makeRecord(newCode);
    data.passwordChangedAt = new Date().toISOString();
    saveAuth(data);
    return formatCode(newCode);
}

export function resetFromConsole(newPassword) {
    const data = loadAuth() || {};
    const newCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    data.pass = makeRecord(newPassword);
    data.recovery = makeRecord(newCode);
    data.passwordChangedAt = new Date().toISOString();
    saveAuth(data);
    return formatCode(newCode);
}

/* ---------- Сессии (подписанная cookie) ---------- */
const sign = (val) => crypto.createHmac('sha256', SESSION_SECRET).update(val).digest('hex').slice(0, 32);
function makeToken() {
    const body = (Date.now() + SESSION_DAYS * 86400000).toString(36);
    return body + '.' + sign(body);
}
function verifyToken(tok) {
    if (!tok) return false;
    const [body, sig] = String(tok).split('.');
    if (!body || !sig || sign(body) !== sig) return false;
    return parseInt(body, 36) > Date.now();
}
function parseCookies(req) {
    const out = {};
    (req.headers.cookie || '').split(';').forEach(p => {
        const i = p.indexOf('=');
        if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
    return out;
}

/* ---------- Антиспам (подбор пароля) ---------- */
const attempts = new Map();
function tooMany(ip) {
    const now = Date.now();
    const arr = (attempts.get(ip) || []).filter(t => now - t < 600000);
    attempts.set(ip, arr);
    return arr.length >= 5;
}

/* ---------- Роуты входа ---------- */
export function adminLoginRoutes(app) {
    app.get('/admin/login', (req, res) => {
        try { res.type('html').send(fs.readFileSync(LOGIN_PAGE, 'utf8')); }
        catch (e) { res.status(500).send('admin-login.html не найден'); }
    });

    app.get('/admin/logout', (req, res) => {
        res.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
        res.redirect('/admin/login');
    });

    app.get('/admin/api/auth-status', (req, res) => {
        res.json({ ok: true, needSetup: isSetupNeeded(), authorized: verifyToken(parseCookies(req)[COOKIE]) });
    });

    app.post('/admin/api/setup', (req, res) => {
        if (!isSetupNeeded()) return res.status(403).json({ ok: false, error: 'Пароль уже установлен' });
        const p = String((req.body || {}).password || '');
        if (p.length < 8) return res.status(400).json({ ok: false, error: 'Пароль минимум 8 символов' });
        res.json({ ok: true, recoveryCode: setupPassword(p) });
    });

    app.post('/admin/api/login', (req, res) => {
        const ip = req.ip;
        if (tooMany(ip)) return res.status(429).json({ ok: false, error: 'Слишком много попыток. Пауза 10 минут.' });
        const data = loadAuth();
        if (!data) return res.status(400).json({ ok: false, error: 'Нужна первичная настройка' });
        if (!check(String((req.body || {}).password || ''), data.pass)) {
            (attempts.get(ip) || []).push(Date.now());
            return res.status(401).json({ ok: false, error: 'Неверный пароль' });
        }
        attempts.delete(ip);
        res.setHeader('Set-Cookie', COOKIE + '=' + makeToken() + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + SESSION_DAYS * 86400);
        res.json({ ok: true });
    });

    app.post('/admin/api/recover', (req, res) => {
        const b = req.body || {};
        const p = String(b.newPassword || '');
        if (p.length < 8) return res.status(400).json({ ok: false, error: 'Новый пароль минимум 8 символов' });
        const newCode = changePassword(String(b.code || ''), p);
        if (!newCode) return res.status(401).json({ ok: false, error: 'Неверный код восстановления' });
        res.json({ ok: true, recoveryCode: newCode });
    });
}

/* ---------- Защита всех /admin/* кроме публичных ---------- */
export function adminGuard(req, res, next) {
    const publicPaths = ['/login', '/api/login', '/api/recover', '/api/setup', '/api/auth-status'];
    if (publicPaths.includes(req.path)) return next();
    if (verifyToken(parseCookies(req)[COOKIE])) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    return res.redirect('/admin/login');
}
