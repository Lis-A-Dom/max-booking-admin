#!/bin/bash
# Полный аудит системы Лис-А-Дом
cd /var/www/max-house-app
G='\033[0;32m'; R='\033[0;31m'; Y='\033[0;33m'; N='\033[0m'
ok(){ echo -e "${G}✅ $1${N}"; }
bad(){ echo -e "${R}❌ $1${N}"; }
warn(){ echo -e "${Y}⚠️  $1${N}"; }
code(){ curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1"; }

echo "══════════ АУДИТ СИСТЕМЫ $(date '+%d.%m.%Y %H:%M') ══════════"
echo "── ВЕБ-СЛОЙ ──"
[ "$(code https://lis-a-dom.ru/)" = 200 ] && ok "Лендинг lis-a-dom.ru" || bad "Лендинг lis-a-dom.ru"
[ "$(code https://lis-a-dom.ru/app/)" = 200 ] && ok "Мини-апп /app/" || bad "Мини-апп /app/"
[ "$(code "https://lis-a-dom.ru/api/prices?from=2026-01-01&to=2026-01-02")" = 200 ] && ok "Публичный API цен" || bad "Публичный API цен"
[ "$(code https://lis-a-dom.ru/api/calendar.ics)" = 200 ] && ok "Календарь ICS (для Авито)" || bad "Календарь ICS"
[ "$(code https://bot.lis-a-dom.ru/admin/login)" = 200 ] && ok "Админка: страница входа" || bad "Админка: страница входа"
[ "$(code https://bot.lis-a-dom.ru/admin/)" = 302 ] && ok "Админка: защита (без cookie → редирект)" || warn "Админка: нет редиректа"
[ "$(code https://bot.lis-a-dom.ru/pma/)" = 200 ] && ok "phpMyAdmin" || bad "phpMyAdmin"

echo "── СЕРВЕР И БАЗА ──"
pm2 jlist 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); p=[x for x in d if x['name']=='lisadom']; print('OK' if p and p[0]['pm2_env']['status']=='online' else 'FAIL')" 2>/dev/null | grep -q OK && ok "pm2: lisadom online" || bad "pm2: lisadom не работает"
[ "$(code http://localhost:3001/health)" = 200 ] && ok "Node.js /health" || bad "Node.js /health"
systemctl is-active mysql 2>/dev/null | grep -q active && ok "MySQL запущен" || warn "MySQL не отвечает (работаем на JSON)"
node --check server.js 2>/dev/null && ok "server.js: синтаксис чист" || bad "server.js: ошибка синтаксиса"

echo "── SSL И ДОМЕНЫ ──"
for D in lis-a-dom.ru bot.lis-a-dom.ru; do
  EXP=$(echo | openssl s_client -servername $D -connect $D:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$EXP" ]; then
    DAYS=$(( ( $(date -d "$EXP" +%s) - $(date +%s) ) / 86400 ))
    [ $DAYS -gt 14 ] && ok "SSL $D: ещё $DAYS дн." || warn "SSL $D: осталось $DAYS дн.!"
  else bad "SSL $D: не читается"; fi
done

echo "── ИНТЕГРАЦИИ ──"
grep -q "^YOOKASSA_SHOP_ID=.\+" .env && ok "ЮKassa: shopId на месте" || bad "ЮKassa: нет shopId"
grep -q "^YOOKASSA_KEY=.\+" .env && ok "ЮKassa: секретный ключ на месте" || bad "ЮKassa: нет ключа"
curl -s http://localhost:3001/debug/env | grep -q '"hasToken":true' && ok "MAX: токен бота активен" || bad "MAX: токен не найден"
[ "$(curl -s -o /dev/null -w "%{http_code}" -X POST https://lis-a-dom.ru/api/yookassa/webhook -H 'Content-Type: application/json' -d '{"event":"audit"}')" = 200 ] && ok "ЮKassa webhook доступен" || bad "Webhook не отвечает"
pm2 logs lisadom --lines 300 --nostream 2>/dev/null | grep -q "Авито ICS" && ok "Авито: синхронизация календаря идёт" || warn "Авито: нет свежей синхронизации"

echo "── ЗАЩИТА И РЕЗЕРВ ──"
crontab -l 2>/dev/null | grep -q monitor.sh && ok "Мониторинг в cron (каждые 15 мин)" || bad "Мониторинг НЕ в cron"
LAST=$(ls -t /var/backups/lisadom/ 2>/dev/null | head -1)
[ -n "$LAST" ] && ok "Бэкапы: свежий $LAST" || warn "Нет бэкапов в /var/backups/lisadom"
USE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
[ "$USE" -lt 85 ] && ok "Диск: занято ${USE}%" || warn "Диск: ${USE}% — пора чистить"
DIRTY=$(git status --porcelain | wc -l)
[ "$DIRTY" = 0 ] && ok "Git: всё закоммичено" || warn "Git: $DIRTY незакоммиченных изменений"
echo "══════════ КОНЕЦ АУДИТА ══════════"
