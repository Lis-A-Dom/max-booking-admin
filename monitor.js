#!/usr/bin/env node
// === Мониторинг Лис-А-Дом (Node.js версия) ===
import 'dotenv/config';
import https from 'https';
import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = __dirname;
const STATE = join(APP, 'monitor.state');
const LOG = join(APP, 'monitor.log');

const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT = process.env.TG_CHAT;
const BOOKING_TOKEN = process.env.MAX_BOOKING_TOKEN;
const BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const OWNER_USER = 5470603;

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const log = (msg) => {
  const line = `[${new Date().toISOString().replace('T',' ').slice(0,19)}] ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch (e) {}
};

// 1. Проверка сервера
async function checkServer() {
  try {
    const r = await axios.get('https://staywise.ru/api/health', { timeout: 15000, httpsAgent });
    if (r.status === 200 && r.data?.status === 'ok') return true;
  } catch (e) {}
  try {
    const r = await axios.get('https://staywise.ru/', { timeout: 15000, httpsAgent });
    return r.status === 200;
  } catch (e) { return false; }
}

// 2. Отправка в Telegram
async function sendTG(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
      { chat_id: TG_CHAT, text }, { timeout: 15000, httpsAgent });
  } catch (e) { log(`TG fail: ${e.message}`); }
}

// 3. Отправка в MAX (через BOOKING_TOKEN, как заявки)
async function sendMAX(text) {
  const token = BOOKING_TOKEN || BOT_TOKEN;
  if (!token) return;
  try {
    const r = await axios.post(`https://platform-api2.max.ru/messages?user_id=${OWNER_USER}`,
      { text },
      {
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        timeout: 15000,
        httpsAgent
      });
    return r.status === 200;
  } catch (e) {
    // fallback на основной токен
    if (BOT_TOKEN && token !== BOT_TOKEN) {
      try {
        await axios.post(`https://platform-api2.max.ru/messages?user_id=${OWNER_USER}`,
          { text },
          {
            headers: { Authorization: BOT_TOKEN, 'Content-Type': 'application/json' },
            timeout: 15000,
            httpsAgent
          });
        return true;
      } catch (e2) {
        log(`MAX fallback fail: ${e2.message}`);
        return false;
      }
    }
    log(`MAX fail: ${e.message}`);
    return false;
  }
}

// 4. Основная логика
async function run() {
  const ok = await checkServer();
  const status = ok ? 'ok' : 'fail';
  const prev = fs.existsSync(STATE) ? fs.readFileSync(STATE, 'utf8').trim() : 'ok';

  if (status === prev) return; // ничего не изменилось

  const ts = new Date().toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });
  const msg = status === 'fail'
    ? `🚨 Лис-А-Дом: сервер не отвечает! (${ts})`
    : `✅ Лис-А-Дом: сервер снова работает! (${ts})`;

  await sendTG(msg);
  const maxOk = await sendMAX(msg);
  log(`state: ${prev} -> ${status} | MAX: ${maxOk ? 'OK' : 'FAIL'}`);
  fs.writeFileSync(STATE, status);
}

run().catch(e => log(`CRASH: ${e.message}`));
