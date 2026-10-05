#!/usr/bin/env bash
# GBTI 봇 코드 업데이트: GitHub 최신 코드 받기 → 의존성 → 재시작
#   bash /opt/gbti_admin/deploy/bot/update.sh
set -euo pipefail

APP_DIR="/opt/gbti_admin"
SERVICE="gbti-bot"

cd "$APP_DIR"
before="$(git rev-parse --short HEAD)"
git pull --ff-only
after="$(git rev-parse --short HEAD)"

if [[ "$before" == "$after" ]]; then
  echo "이미 최신입니다 ($after)."
  exit 0
fi

echo "업데이트: $before → $after"
git log --oneline "$before..$after"
npm ci -w @gbti/bot --no-audit --no-fund
sudo systemctl restart "$SERVICE"
sleep 10
sudo journalctl -u "$SERVICE" -n 10 --no-pager
