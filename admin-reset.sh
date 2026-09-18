#!/bin/bash
# Сброс пароля админки из консоли сервера
# Использование: ./admin-reset.sh НовыйПароль
cd /var/www/max-house-app || exit 1
node -e "import('./admin-auth.js').then(m=>console.log('Новый код восстановления:', m.resetFromConsole(process.argv[1])))" "$1"
