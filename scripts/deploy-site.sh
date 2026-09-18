#!/bin/bash
# Деплой ТОЛЬКО лендинга (не трогает мини-апп и API)
set -e
SRC=/var/www/max-house-app/site
DST=/var/www/lis-a-dom

# Копируем только файлы лендинга (не /app/)
cp $SRC/index.html $DST/
cp $SRC/lisa.css $DST/ 2>/dev/null || true
cp -r $SRC/foto $DST/ 2>/dev/null || true

CODE=$(curl -s -o /dev/null -w "%{http_code}" https://lis-a-dom.ru/)
echo "✅ Лендинг обновлён. Главная: $CODE"
