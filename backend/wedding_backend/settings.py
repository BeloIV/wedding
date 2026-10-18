from pathlib import Path
from datetime import timedelta
from decouple import config
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = config('DEBUG', default=False, cast=bool)
# no default: a missing SECRET_KEY must stop the app instead of silently using a known one
SECRET_KEY = config('SECRET_KEY')
ALLOWED_HOSTS = [h.strip() for h in config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',') if h.strip()]

if not DEBUG and (len(SECRET_KEY) < 40 or any(w in SECRET_KEY.lower() for w in ('changeme', 'your-very', 'dev-secret', 'insecure'))):
    raise ImproperlyConfigured('SECRET_KEY is weak or a placeholder; set a random 50+ character value in .env')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'users',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'wedding_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'wedding_backend.wsgi.application'

AUTH_USER_MODEL = 'users.CustomUser'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='wedding'),
        'USER': config('POSTGRES_USER', default='wedding_user'),
        'PASSWORD': config('POSTGRES_PASSWORD', default='changeme'),
        'HOST': 'db',
        'PORT': '5432',
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '240/min',
        'login': '10/min',    # admin login / token refresh (brute force)
        'invite': '30/min',   # invite code lookups (guessing codes)
        'rsvp': '20/min',
        'pwreset': '5/min',   # password-reset e-mails
        'reserve': '20/min',
    },
    # client IP comes from X-Forwarded-For set by our nginx (1 proxy); raise to 2+ if another proxy is added in front
    'NUM_PROXIES': config('NUM_PROXIES', default=1, cast=int),
}

# Counters live in process memory, so gunicorn runs a single worker (threads) to keep limits exact.
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# ── e-mail (Brevo SMTP) ──────────────────────────────────
# Put BREVO_SMTP_LOGIN and BREVO_SMTP_KEY in .env. Without them mails are only printed to the container log.
EMAIL_HOST = 'smtp-relay.brevo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('BREVO_SMTP_LOGIN', default='')
EMAIL_HOST_PASSWORD = config('BREVO_SMTP_KEY', default='')
EMAIL_BACKEND = (
    'django.core.mail.backends.smtp.EmailBackend'
    if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
    else 'django.core.mail.backends.console.EmailBackend'
)
EMAIL_TIMEOUT = 15
DEFAULT_FROM_EMAIL = config('EMAIL_FROM', default='Naša svadba <noreply@bytboyzserver.xyz>')
SITE_URL = config('SITE_URL', default='https://wedding.bytboyzserver.xyz')
PASSWORD_RESET_TIMEOUT = 7 * 24 * 3600  # setup links stay valid 7 days

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in config('CSRF_TRUSTED_ORIGINS', default='').split(',') if o.strip()]
# set HTTPS_ONLY=True once the site is served over https (cookies then get the Secure flag)
_https = config('HTTPS_ONLY', default=False, cast=bool)
SESSION_COOKIE_SECURE = _https
CSRF_COOKIE_SECURE = _https
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5201,http://127.0.0.1:5201',
).split(',')
CORS_ALLOW_CREDENTIALS = False  # auth is a Bearer token, no cookies

LANGUAGE_CODE = 'sk'
TIME_ZONE = 'Europe/Bratislava'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
