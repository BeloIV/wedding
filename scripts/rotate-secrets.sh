#!/usr/bin/env bash
# Rotates every secret of the wedding app and turns DEBUG off:
#   SECRET_KEY, Postgres password, admin password. Run it yourself:  ./scripts/rotate-secrets.sh
# - the old .env is saved to ~/backups first (mode 600)
# - the new admin password is printed ONCE at the end (not stored anywhere else than .env)
# - all existing login sessions (JWT) become invalid because SECRET_KEY changes
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo ".env not found"; exit 1; }
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p ~/backups && chmod 700 ~/backups
cp .env ~/backups/wedding-env-before-rotate-$ts && chmod 600 ~/backups/wedding-env-before-rotate-$ts
echo "old .env saved to ~/backups/wedding-env-before-rotate-$ts"

old() { grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
PGUSER=$(old POSTGRES_USER); PGDB=$(old POSTGRES_DB)
ADMIN_EMAIL=$(old ADMIN_EMAIL); ADMIN_EMAIL=${ADMIN_EMAIL:-admin@wedding.local}

gen() { python3 -c "import secrets,sys; print(getattr(secrets, sys.argv[1])(int(sys.argv[2])))" "$@"; }
NEW_PG=$(gen token_hex 24)
NEW_SECRET=$(gen token_urlsafe 64)
NEW_ADMIN=$(gen token_urlsafe 12)

DB=$(docker compose ps -q db)
[ -n "$DB" ] || { echo "db container is not running"; exit 1; }

# 1) database password first: if this fails nothing else has changed yet
docker exec "$DB" psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 -c "ALTER USER \"$PGUSER\" PASSWORD '$NEW_PG'" >/dev/null
echo "database password changed"

# 2) new .env (non-secret settings and optional proxy/HTTPS lines are kept)
{
  echo "POSTGRES_DB=$PGDB"
  echo "POSTGRES_USER=$PGUSER"
  echo "POSTGRES_PASSWORD=$NEW_PG"
  echo "DATABASE_URL=postgresql://$PGUSER:$NEW_PG@db:5432/$PGDB"
  echo
  echo "SECRET_KEY=$NEW_SECRET"
  echo "DEBUG=False"
  for k in ALLOWED_HOSTS CORS_ALLOWED_ORIGINS CSRF_TRUSTED_ORIGINS HTTPS_ONLY NUM_PROXIES SITE_URL EMAIL_FROM BREVO_SMTP_LOGIN BREVO_SMTP_KEY; do
    v=$(old $k); [ -n "$v" ] && echo "$k=$v"
  done
  echo
  echo "ADMIN_EMAIL=$ADMIN_EMAIL"
  echo "ADMIN_PASSWORD=$NEW_ADMIN"
} > .env.new
chmod 600 .env.new && mv .env.new .env
echo ".env rewritten (DEBUG=False)"

# 3) restart backend with the new environment, then set the admin password
docker compose up -d --no-deps --force-recreate backend
for i in $(seq 1 40); do
  docker exec wedding_backend python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/public/wedding-info/')" >/dev/null 2>&1 && break
  sleep 1
done
docker exec -e NEW_ADMIN="$NEW_ADMIN" -e ADMIN_EMAIL="$ADMIN_EMAIL" wedding_backend python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
u = get_user_model().objects.get(email=os.environ['ADMIN_EMAIL'])
u.set_password(os.environ['NEW_ADMIN']); u.save(); print('admin password changed for', u.email)"

echo
echo "Admin login: $ADMIN_EMAIL"
echo "New admin password (shown once, also in .env): $NEW_ADMIN"
