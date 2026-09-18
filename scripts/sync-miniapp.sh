#!/bin/bash
# Надёжная синхронизация мини-аппа (абсолютные пути, health-check)
set -e

MINIAPP_DIR=/var/www/max-house-app/web
BACKUP_DIR=/var/www/max-house-app/frontend
DEPLOY_DIR=/var/www/lis-a-dom/app

cd $MINIAPP_DIR
rm -rf dist node_modules/.vite

# Попытка собрать
if npm run build >/tmp/vite-build.log 2>&1 && [ -f dist/index.html ]; then
    SRC=$MINIAPP_DIR/dist
    echo "✅ Сборка успешна"
elif [ -d "$BACKUP_DIR/assets" ]; then
    SRC=$BACKUP_DIR
    echo "⚠️ Сборка упала, берём backup из frontend/"
    tail -3 /tmp/vite-build.log
else
    echo "❌ Нет ни сборки, ни бэкапа. Прерываем."
    exit 1
fi

# Деплой (атомарно: сначала всё в tmp, потом mv)
TMP_DIR=/tmp/lis-a-dom-app-$$
mkdir -p $TMP_DIR
cp -r $SRC/* $TMP_DIR/
sed -i 's|"/assets/|"./assets/|g' $TMP_DIR/index.html

rm -rf $DEPLOY_DIR
mv $TMP_DIR $DEPLOY_DIR

# Копируем ресурсы (без падения если нет)
cp -r $BACKUP_DIR/images /var/www/lis-a-dom/ 2>/dev/null || true
cp $BACKUP_DIR/photos.json /var/www/lis-a-dom/ 2>/dev/null || true

# Health-check
CODE=$(curl -s -o /dev/null -w "%{http_code}" https://lis-a-dom.ru/app/)
if [ "$CODE" = "200" ]; then
    echo "✅ Мини-апп развёрнут, /app/ отвечает 200"
else
    echo "❌ Что-то не так, /app/ отвечает $CODE"
    exit 1
fi
