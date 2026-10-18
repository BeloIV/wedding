"""Admin accounts for the couple and the password-setup e-mails."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

log = logging.getLogger(__name__)


def _unique_username(email):
    User = get_user_model()
    base = (email.split('@')[0] or 'admin')[:140]
    name, n = base, 1
    while User.objects.filter(username=name).exists():
        n += 1
        name = f'{base}{n}'
    return name


def ensure_admin(email):
    """Make sure a full admin (staff + superuser) exists for this address. Returns (user, created)."""
    User = get_user_model()
    email = (email or '').strip().lower()
    if not email:
        return None, False
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User(email=email, username=_unique_username(email), is_staff=True, is_superuser=True)
        user.set_unusable_password()
        user.save()
        return user, True
    if not (user.is_staff and user.is_superuser and user.is_active):
        user.is_staff = user.is_superuser = user.is_active = True
        user.save(update_fields=['is_staff', 'is_superuser', 'is_active'])
    return user, False


def password_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.SITE_URL.rstrip('/')}/nastavit-heslo?uid={uid}&token={token}"


def send_password_mail(user, new_account=False):
    """Sends the set/reset-password link. Returns True when the mail backend accepted it."""
    link = password_link(user)
    if new_account:
        subject = 'Prístup do administrácie svadby'
        intro = 'Boli ste pridaný/á ako administrátor svadobnej stránky. Heslo si nastavíte tu:'
    else:
        subject = 'Nastavenie hesla – svadobná administrácia'
        intro = 'Požiadali ste o nastavenie hesla do administrácie svadby. Nové heslo si zvolíte tu:'
    body = (
        f'{intro}\n\n{link}\n\n'
        f'Odkaz platí {settings.PASSWORD_RESET_TIMEOUT // 86400} dní a dá sa použiť raz. '
        'Ak ste o to nežiadali, tento e-mail ignorujte.\n'
    )
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return True
    except Exception:  # SMTP down / bad key: never break the request, the admin sees it in the response
        log.exception('password mail to %s failed', user.email)
        return False
