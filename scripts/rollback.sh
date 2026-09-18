#!/bin/bash
# Откат на N коммитов назад
N=${1:-1}
cd /var/www/max-house-app
echo "=== Откатываем на $N коммит(ов) назад ==="
git log --oneline | head -$((N+2))
echo ""
echo "Применить откат? (y/n)"
read -r answer
[ "$answer" != "y" ] && exit 1
git reset --hard HEAD~$N
echo "✅ Откат выполнен. Текущий коммит:"
git log -1 --oneline
echo ""
echo "Запустить синхронизацию мини-аппа? (y/n)"
read -r answer
[ "$answer" = "y" ] && bash scripts/sync-miniapp.sh
