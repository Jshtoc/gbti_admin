#!/usr/bin/env bash
# GBTI 디스코드 봇 서버 설치 (Ubuntu 22.04 / 24.04, Google Cloud e2-micro 기준)
#
# 서버 SSH 창에서 한 줄로 실행:
#   bash <(curl -fsSL https://raw.githubusercontent.com/Jshtoc/gbti_admin/main/deploy/bot/install.sh)
#
# 하는 일: 스왑 1GB → Node.js 22 → 코드 받기 → 봇 의존성 설치 → .env 작성(입력받음) → systemd 서비스 등록·시작
# 다시 실행해도 안전하다 (이미 된 단계는 건너뛰고, .env는 있으면 그대로 둔다).
set -euo pipefail

REPO_URL="https://github.com/Jshtoc/gbti_admin.git"
APP_DIR="/opt/gbti_admin"
SERVICE="gbti-bot"
DEFAULT_GUILD_ID="1373916592294985828"
RUN_USER="$(id -un)"

step() { printf '\n\033[1;33m▶ %s\033[0m\n' "$1"; }

step "1/6 스왑 1GB (메모리 1GB 서버에서 설치 중 메모리 부족 방지)"
if swapon --show | grep -q '/swapfile'; then
  echo "이미 있음"
else
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "완료"
fi

step "2/6 Node.js 22, git"
if command -v node >/dev/null && [[ "$(node -v)" == v22.* ]]; then
  echo "이미 있음: $(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null
  sudo apt-get install -y nodejs >/dev/null
  echo "설치됨: $(node -v)"
fi
command -v git >/dev/null || sudo apt-get install -y git >/dev/null

step "3/6 코드 받기 ($APP_DIR)"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  sudo mkdir -p "$APP_DIR"
  sudo chown "$RUN_USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

step "4/6 봇 의존성 설치 (대시보드 패키지는 설치하지 않음)"
cd "$APP_DIR"
npm ci -w @gbti/bot --no-audit --no-fund

step "5/6 설정 파일 (apps/bot/.env)"
ENV_FILE="$APP_DIR/apps/bot/.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "이미 있음 — 그대로 사용 (값을 바꾸려면: nano $ENV_FILE 후 sudo systemctl restart $SERVICE)"
else
  echo "입력한 값은 화면에 표시되지 않습니다. 붙여넣기 후 Enter."
  read -rsp "DISCORD_TOKEN: " TOKEN; echo
  read -rp "DISCORD_GUILD_ID [$DEFAULT_GUILD_ID]: " GUILD_ID
  GUILD_ID="${GUILD_ID:-$DEFAULT_GUILD_ID}"
  read -rsp "DATABASE_URL (Supabase Session pooler, :5432): " DB_URL; echo
  [[ -n "$TOKEN" && -n "$DB_URL" ]] || { echo "토큰과 DB 주소는 필수입니다." >&2; exit 1; }
  [[ "$DB_URL" == *sslmode=* ]] || DB_URL="${DB_URL}$([[ "$DB_URL" == *\?* ]] && echo '&' || echo '?')sslmode=require"
  umask 077
  printf 'DISCORD_TOKEN=%s\nDISCORD_GUILD_ID=%s\nDATABASE_URL=%s\n' "$TOKEN" "$GUILD_ID" "$DB_URL" > "$ENV_FILE"
  echo "저장됨 (본인만 읽기 가능)"
fi

step "6/6 자동 시작·자동 재시작 서비스 등록"
sudo tee "/etc/systemd/system/$SERVICE.service" >/dev/null <<EOF
[Unit]
Description=GBTI Discord activity bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR/apps/bot
ExecStart=/usr/bin/node --import tsx src/index.ts
Environment=NODE_ENV=production
# 죽으면 10초 뒤 다시 켠다. 종료 시 SIGTERM → 봇이 열린 기록을 닫고 끝낸다
Restart=always
RestartSec=10
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE" >/dev/null
sudo systemctl restart "$SERVICE"

echo "봇을 시작했습니다. 15초 뒤 로그를 보여줍니다…"
sleep 15
sudo journalctl -u "$SERVICE" -n 15 --no-pager
cat <<EOF

────────────────────────────────────────
설치 완료. 자주 쓰는 명령:
  로그 보기(실시간):  sudo journalctl -u $SERVICE -f
  상태 보기:          systemctl status $SERVICE
  재시작:             sudo systemctl restart $SERVICE
  코드 업데이트:      bash $APP_DIR/deploy/bot/update.sh
────────────────────────────────────────
EOF
