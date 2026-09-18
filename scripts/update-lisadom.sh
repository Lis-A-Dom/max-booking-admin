#!/bin/bash
# Обновление Лис-А-Дом с GitHub: бэкап -> pull -> рестарт -> пересборка мини-аппа если менялся
set -e
cd /var/www/max-house-app
echo "== 1. Резервная копия перед обновлением =="
bash scripts/backup-lisadom.sh
echo "== 2. Тянем изменения с GitHub =="
git pull
echo "== 3. Перезапуск сервера =="
pm2 restart lisadom
echo "== 4. Пересборка мини-аппа, если менялся web/ =="
if git diff --name-only ORIG_HEAD HEAD 2>/dev/null | grep -q "^web/"; then
  cd web && npm install --silent && npm run build
  rm -rf ../frontend/assets && cp -r dist/assets ../frontend/ && cp dist/index.html ../frontend/index.html
  cd ..
  echo "Мини-апп пересобран"
else
  echo "Мини-апп не менялся"
fi
echo "== 5. Готово, последние логи =="
sleep 2
pm2 logs lisadom --lines 5 --nostream
