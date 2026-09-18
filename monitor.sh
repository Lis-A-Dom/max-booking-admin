#!/bin/bash
# === Мониторинг Лис-А-Дом (v2: надёжная доставка в MAX) ===
APP=/var/www/max-house-app
STATE="$APP/monitor.state"
set -a; source "$APP/.env" 2>/dev/null; set +a

STATUS=ok
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 15 https://staywise.ru/)
[ "$CODE" = "200" ] || STATUS=fail
HEALTH=$(curl -s -m 15 https://staywise.ru/api/health)
echo "$HEALTH" | grep -q '"status":"ok"' || STATUS=fail

PREV=$(cat "$STATE" 2>/dev/null || echo ok)
if [ "$STATUS" != "$PREV" ]; then
  TS=$(date '+%H:%M %d.%m.%Y')
  if [ "$STATUS" = "fail" ]; then
    MSG="🚨 Лис-А-Дом: сервер не отвечает! ($TS)"
  else
    MSG="✅ Лис-А-Дом: сервер снова работает! ($TS)"
  fi

  # Telegram
  curl -s -m 15 -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" --data-urlencode "chat_id=$TG_CHAT" --data-urlencode "text=$MSG" > /dev/null

  # MAX: сначала токен заявок, при ошибке — основной
  RESP=$(curl -s -m 15 -X POST "https://platform-api2.max.ru/messages?user_id=5470603" -H "Authorization: $MAX_BOOKING_TOKEN" -H "Content-Type: application/json" -d "{\"text\":\"$MSG\"}")
  if echo "$RESP" | grep -q '"code"'; then
    RESP=$(curl -s -m 15 -X POST "https://platform-api2.max.ru/messages?user_id=5470603" -H "Authorization: $MAX_BOT_TOKEN" -H "Content-Type: application/json" -d "{\"text\":\"$MSG\"}")
    echo "[$(date '+%F %T')] MAX fallback (основной токен): $RESP" >> "$APP/monitor.log"
  fi
  echo "[$(date '+%F %T')] state: $PREV -> $STATUS | MAX: $RESP" >> "$APP/monitor.log"
  echo "$STATUS" > "$STATE"
fi
