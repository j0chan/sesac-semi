#!/usr/bin/env bash
set -euo pipefail

# Run in KST for filenames/log readability
export TZ=Asia/Seoul

# ---- Config ----
ENV_FILE="/etc/default/backend"
BACKUP_DIR="/var/backups/intra-board"
S3_BACKUP_PREFIX="uploads/backups/"    
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"  # optional: set in /etc/default/backend

LOCK_FILE="/var/lock/pg_backup.lock"

# ---- Lock (prevent concurrent runs) ----
exec 200>"$LOCK_FILE"
flock -n 200 || { echo "[backup] another job is running"; exit 0; }

# ---- Load env (root required if ENV_FILE is 600) ----
set -a
source "$ENV_FILE"
set +a

# ---- Ensure tools ----
command -v pg_dump >/dev/null 2>&1 || { echo "[backup] pg_dump not found (install postgresql-client)"; exit 1; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"

# ---- Create dump + upload via boto3 (uses backend venv python) ----
PY="/opt/app/sesac-semi/backend/.venv/bin/python3"
if [[ ! -x "$PY" ]]; then
  echo "[backup] venv python not found at $PY"
  exit 1
fi

"$PY" - << PY
import os, subprocess
from urllib.parse import urlparse, unquote
from datetime import datetime, timedelta, timezone

import boto3
from botocore.config import Config

db_url = os.environ["DATABASE_URL"]
bucket = os.environ["S3_BUCKET"]
region = os.environ.get("AWS_REGION", "ap-northeast-2")
backup_dir = os.environ.get("BACKUP_DIR", "${BACKUP_DIR}")
prefix = os.environ.get("S3_BACKUP_PREFIX", "${S3_BACKUP_PREFIX}")
ts = os.environ.get("TS", "${TS}")
retention_days = int(os.environ.get("RETENTION_DAYS", "${RETENTION_DAYS}"))

u = urlparse(db_url)
user = unquote(u.username or "")
password = unquote(u.password or "")
host = u.hostname or "127.0.0.1"
port = str(u.port or 5432)
db = (u.path or "/").lstrip("/")

out = f"{backup_dir}/pgdump-{db}-{ts}.dump"
env = os.environ.copy()
env["PGPASSWORD"] = password

cmd = ["pg_dump", "-h", host, "-p", port, "-U", user, "-d", db, "-Fc", "-f", out]
print("[backup] RUN:", " ".join(cmd))
subprocess.check_call(cmd, env=env)

key = prefix + os.path.basename(out)
s3 = boto3.client("s3", region_name=region, config=Config(signature_version="s3v4"))

print("[backup] UPLOAD:", out, "->", f"s3://{bucket}/{key}")
s3.upload_file(out, bucket, key)

meta = s3.head_object(Bucket=bucket, Key=key)
print("[backup] OK:", f"s3://{bucket}/{key}", "size=", meta.get("ContentLength"))

# ---- Optional retention: delete old backups under prefix ----
cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
print("[backup] retention_days=", retention_days, "cutoff=", cutoff.isoformat())

token = None
deleted = 0
while True:
    kwargs = {"Bucket": bucket, "Prefix": prefix}
    if token:
        kwargs["ContinuationToken"] = token
    resp = s3.list_objects_v2(**kwargs)
    for obj in resp.get("Contents", []):
        if obj["LastModified"] < cutoff:
            s3.delete_object(Bucket=bucket, Key=obj["Key"])
            deleted += 1
    if resp.get("IsTruncated"):
        token = resp.get("NextContinuationToken")
    else:
        break
print("[backup] deleted_old=", deleted)
PY

echo "[backup] DONE ts=${TS}"
