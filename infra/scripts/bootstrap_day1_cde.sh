#!/usr/bin/env bash
set -euo pipefail

# ---- Config ----
APP_USER="${APP_USER:-ubuntu}"
APP_GROUP="${APP_GROUP:-ubuntu}"
APP_BASE="${APP_BASE:-/opt/app}"
BACKEND_DIR="${BACKEND_DIR:-/opt/app/backend}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-intra-board}"

PYTHON_BIN="${PYTHON_BIN:-python3}"

# ---- Helpers ----
need_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "ERROR: run as root. ex) sudo bash $0" >&2
    exit 1
  fi
}

log() { echo "[*] $*"; }

write_file() {
  local path="$1"
  local content="$2"
  mkdir -p "$(dirname "$path")"
  printf "%s" "$content" > "$path"
}

# ---- Steps ----
step_c_base_packages() {
  log "Day1-C: apt update/upgrade + base packages"
  apt update
  DEBIAN_FRONTEND=noninteractive apt upgrade -y

  DEBIAN_FRONTEND=noninteractive apt install -y \
    git curl unzip \
    nginx \
    python3-venv python3-pip
}

step_c_nginx_enable() {
  log "Day1-C: enable/start nginx"
  systemctl enable nginx
  systemctl start nginx
  systemctl is-active --quiet nginx
}

step_d_backend_setup() {
  log "Day1-D: create backend dir"
  mkdir -p "$BACKEND_DIR"
  mkdir -p "$APP_BASE"
  chown -R "${APP_USER}:${APP_GROUP}" "$APP_BASE"

  log "Day1-D: create venv + install deps"
  # venv는 APP_USER 권한으로 만드는 편이 안전
  sudo -u "$APP_USER" -H bash -lc "
    set -e
    cd '$BACKEND_DIR'
    $PYTHON_BIN -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip
    pip install fastapi 'uvicorn[standard]' gunicorn
  "

  log "Day1-D: write minimal FastAPI app"
  sudo -u "$APP_USER" -H bash -lc "
    set -e
    cd '$BACKEND_DIR'
    mkdir -p app
    cat > app/main.py << 'EOF'
from fastapi import FastAPI

app = FastAPI()

@app.get('/api/health')
def health():
    return {'ok': True}
EOF
  "
}

step_d_systemd() {
  log "Day1-D: write systemd unit"
  local unit_path="/etc/systemd/system/backend.service"
  write_file "$unit_path" \
"[Unit]
Description=Intra Board Backend (FastAPI)
After=network.target

[Service]
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${BACKEND_DIR}
Environment=\"PATH=${BACKEND_DIR}/.venv/bin\"
ExecStart=${BACKEND_DIR}/.venv/bin/gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:${BACKEND_PORT} app.main:app
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
"

  systemctl daemon-reload
  systemctl enable backend
  systemctl restart backend
  systemctl is-active --quiet backend

  log "Day1-D: backend internal healthcheck"
  curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/health" >/dev/null
}

step_e_nginx_proxy() {
  log "Day1-E: nginx reverse proxy /api -> backend"
  local site_avail="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
  write_file "$site_avail" \
"server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        root /var/www/html;
        index index.html;
    }
}
"

  rm -f /etc/nginx/sites-enabled/default || true
  ln -sf "$site_avail" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"

  nginx -t
  systemctl reload nginx
  systemctl is-active --quiet nginx
}

main() {
  need_root
  step_c_base_packages
  step_c_nginx_enable
  step_d_backend_setup
  step_d_systemd
  step_e_nginx_proxy

  log "DONE: C-D-E applied successfully."
  log "Check from your Mac: curl -i http://<EC2_PUBLIC_IP>/api/health"
}

main "$@"
