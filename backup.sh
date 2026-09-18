#!/bin/bash
# === Ежедневный бэкап Лис-А-Дом ===
APP=/var/www/max-house-app
DIR=/var/www/max-house-backups
mkdir -p "$DIR"
chmod 700 "$DIR"
[ -f "$APP/bookings.json" ] || echo '[]' > "$APP/bookings.json"
STAMP=$(date +%Y%m%d-%H%M)
FILE="$DIR/lis-dom-$STAMP.tar.gz"
tar -czf "$FILE" \
  -C "$APP" server.js .env bookings.json \
  -C "$APP/frontend" photos.json \
  -C "$APP" web/src web/index.html web/package.json 2>>"$DIR/backup.log"
if [ -f "$FILE" ]; then
  SIZE=$(du -h "$FILE" | cut -f1)
  echo "[$(date '+%F %T')] OK $FILE ($SIZE)" >> "$DIR/backup.log"
else
  echo "[$(date '+%F %T')] FAIL архив не создан" >> "$DIR/backup.log"
fi
find "$DIR" -name 'lis-dom-*.tar.gz' -mtime +30 -delete
