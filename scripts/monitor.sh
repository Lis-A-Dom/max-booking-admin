#!/bin/bash
# Мониторинг Лис-А-Дом: использует /debug/notify через localhost — те же пути, что боевые уведомления
STATE=/tmp/lisadom-monitor.state

code() { curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$1"; }

FAILS=""
[ "$(code http://localhost:3001/health)" = "200" ] || FAILS="$FAILS сервер"
[ "$(code https://lis-a-dom.ru/)" = "200" ] || FAILS="$FAILS сайт"
[ "$(code https://lis-a-dom.ru/app/)" = "200" ] || FAILS="$FAILS мини-апп"
[ "$(code "https://lis-a-dom.ru/api/prices?from=2026-01-01&to=2026-01-02")" = "200" ] || FAILS="$FAILS API"

if [ -n "$FAILS" ]; then
    # если упал Node.js — перезапускаем
    if echo "$FAILS" | grep -q "сервер"; then
        pm2 restart lisadom >/dev/null 2>&1
        sleep 5
        [ "$(code http://localhost:3001/health)" = "200" ] && FAILS="$FAILS (перезапущен ✅)"
    fi
    # не спамим: не чаще раза в час
    if [ ! -f "$STATE" ] || [ $(( $(date +%s) - $(cat $STATE) )) -gt 3600 ]; then
        date +%s > $STATE
        # отправляем через внутренний эндпоинт сервера (работает 100%, проверено)
        MSG=$(printf '🚨 МОНИТОРИНГ ЛИС-А-ДОМ\nНе работает:%s\n⏰ %s' "$FAILS" "$(date '+%H:%M %d.%m.%Y')")
        curl -s "http://localhost:3001/debug/notify?msg=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$MSG'''))")" >/dev/null
    fi
else
    rm -f $STATE
fi
