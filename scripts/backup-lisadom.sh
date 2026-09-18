#!/bin/bash
# Резервная копия Лис-А-Дом: база MySQL + важные файлы
DIR=/var/backups/lisadom
mkdir -p $DIR
TS=$(date +%Y%m%d-%H%M%S)
source /var/www/max-house-app/.env
mysqldump --single-transaction -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > $DIR/db-$TS.sql.gz
tar -czf $DIR/files-$TS.tar.gz -C /var/www/max-house-app \
  bookings.json server.js db.js crm.js pricing.js admin-auth.js admin-board.html admin-login.html .env .admin-auth.json 2>/dev/null
find $DIR -name "*.gz" -mtime +14 -delete
echo "[$(date '+%F %T')] backup ok: db-$TS.sql.gz" >> /var/log/lisadom-backup.log
