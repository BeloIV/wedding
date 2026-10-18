#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until pg_isready -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; do
    sleep 1
done
echo "PostgreSQL ready."

# migrations are committed to git; never auto-generate them at startup
python manage.py migrate --noinput
python manage.py collectstatic --noinput

python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
import os
email = os.environ.get('ADMIN_EMAIL', 'admin@wedding.local')
password = os.environ.get('ADMIN_PASSWORD', 'changeme')
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, username='admin', password=password)
    print(f'Superuser created: {email}')
"

exec "$@"
