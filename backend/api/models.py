from django.db import models
import secrets
import uuid


def _gen_invite_token():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(secrets.choice(chars) for _ in range(5))


def _photo_path(instance, filename):
    # unguessable names: photos of non-public galleries must not be enumerable by URL
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    return f'photos/{uuid.uuid4().hex}.{ext[:5]}'


class Invitation(models.Model):
    token = models.CharField(max_length=5, unique=True, blank=True)
    label = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.token:
            token = _gen_invite_token()
            while Invitation.objects.filter(token=token).exists():
                token = _gen_invite_token()
            self.token = token
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.token} — {self.label or '?'}"


class WeddingInfo(models.Model):
    groom_name = models.CharField(max_length=100, default='')
    bride_name = models.CharField(max_length=100, default='')
    wedding_date = models.DateField(null=True, blank=True)
    ceremony_venue = models.CharField(max_length=200, blank=True)
    ceremony_address = models.TextField(blank=True)
    ceremony_time = models.TimeField(null=True, blank=True)
    reception_venue = models.CharField(max_length=200, blank=True)
    reception_address = models.TextField(blank=True)
    reception_time = models.TimeField(null=True, blank=True)
    dress_code = models.CharField(max_length=100, blank=True)
    dress_code_colors = models.JSONField(default=list, blank=True)
    dress_code_image = models.ImageField(upload_to='dress_code/', null=True, blank=True)
    additional_info = models.TextField(blank=True)
    accommodation_info = models.TextField(blank=True)
    hero_image = models.ImageField(upload_to='hero/', null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Wedding Info'


DIETARY_CHOICES = [
    ('none', 'Bez obmedzení'),
    ('vegetarian', 'Vegetarián'),
    ('vegan', 'Vegán'),
    ('gluten_free', 'Bezlepková diéta'),
    ('other', 'Iné'),
]

SIDE_CHOICES = [
    ('bride', 'Nevesta'),
    ('groom', 'Ženích'),
    ('both', 'Obaja'),
]


class Guest(models.Model):
    RSVP_PENDING = 'pending'
    RSVP_CONFIRMED = 'confirmed'
    RSVP_DECLINED = 'declined'
    RSVP_CHOICES = [
        (RSVP_PENDING, 'Čaká sa'),
        (RSVP_CONFIRMED, 'Potvrdený'),
        (RSVP_DECLINED, 'Odmietnutý'),
    ]
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    rsvp_status = models.CharField(max_length=20, choices=RSVP_CHOICES, default=RSVP_PENDING)
    dietary = models.CharField(max_length=20, choices=DIETARY_CHOICES, default='none')
    dietary_notes = models.TextField(blank=True)
    table_number = models.IntegerField(null=True, blank=True)
    seat = models.IntegerField(null=True, blank=True)  # 0-based seat index within the table
    invited_side = models.CharField(max_length=10, choices=SIDE_CHOICES, default='both')
    notes = models.TextField(blank=True)
    invitation = models.ForeignKey(
        'Invitation', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='guests'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class BudgetCategory(models.Model):
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#6366f1')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Budget Categories'

    def __str__(self):
        return self.name


class BudgetItem(models.Model):
    PAYER_CHOICES = [
        ('couple', 'Manželia'),
        ('bride_family', 'Rodičia nevesty'),
        ('groom_family', 'Rodičia ženícha'),
        ('other', 'Iné'),
    ]
    category = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    planned_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    supplier = models.ForeignKey(
        'Vendor', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='expenses',
    )
    paid = models.BooleanField(default=False)
    paid_by = models.CharField(max_length=20, choices=PAYER_CHOICES, default='couple')
    # percentage split between payers, e.g. {"couple": 50, "bride_family": 50}; sums to 100
    paid_split = models.JSONField(default=dict, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Nízka'),
        ('medium', 'Stredná'),
        ('high', 'Vysoká'),
    ]
    CATEGORY_CHOICES = [
        ('venue', 'Miesto'),
        ('catering', 'Catering'),
        ('flowers', 'Kvety & Dekor'),
        ('music', 'Hudba & Zábava'),
        ('photography', 'Fotografia'),
        ('attire', 'Oblečenie'),
        ('invitations', 'Pozývky'),
        ('travel', 'Cestovanie & Ubytovanie'),
        ('legal', 'Papierovanie'),
        ('other', 'Ostatné'),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['completed', 'due_date', '-priority']

    def __str__(self):
        return self.title


class Vendor(models.Model):
    CATEGORY_CHOICES = [
        ('venue', 'Miesto'),
        ('catering', 'Catering'),
        ('flowers', 'Kvety & Dekor'),
        ('photography', 'Fotografia'),
        ('videography', 'Video'),
        ('music', 'Hudba & DJ'),
        ('cake', 'Svadobná torta'),
        ('attire', 'Oblečenie'),
        ('hair_makeup', 'Vlasy & Make-up'),
        ('transport', 'Doprava'),
        ('other', 'Ostatné'),
    ]
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    contact_person = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    contract_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deposit_paid = models.BooleanField(default=False)
    fully_paid = models.BooleanField(default=False)
    contract_signed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return self.name


class WishlistItem(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Nízka'),
        ('medium', 'Stredná'),
        ('high', 'Vysoká'),
    ]
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    url = models.URLField(blank=True)
    image_url = models.URLField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    reserved = models.BooleanField(default=False)
    reserved_by = models.CharField(max_length=200, blank=True)
    reserved_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['reserved', '-priority', 'name']

    def __str__(self):
        return self.name


class Gallery(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Galleries'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Photo(models.Model):
    gallery = models.ForeignKey(Gallery, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to=_photo_path)
    caption = models.CharField(max_length=500, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Photo in {self.gallery.name}"


class RSVPResponse(models.Model):
    guest_name = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    attending = models.BooleanField()
    dietary = models.CharField(max_length=20, choices=DIETARY_CHOICES, default='none')
    dietary_notes = models.TextField(blank=True)
    message = models.TextField(blank=True)
    invite_token = models.CharField(max_length=5, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"RSVP od {self.guest_name}"


class Table(models.Model):
    name = models.CharField(max_length=100)
    capacity = models.IntegerField(default=8)
    shape = models.CharField(
        max_length=10,
        choices=[('round', 'Okrúhly'), ('rect', 'Obdĺžnikový')],
        default='round',
    )
    pos_x = models.FloatField(default=60)
    pos_y = models.FloatField(default=60)
    width = models.FloatField(default=120)
    height = models.FloatField(default=120)
    rotation = models.FloatField(default=0)
    # rect tables only: custom seat positions [{side: top|bottom|left|right, t: 0..1}]; null = default two rows
    seat_layout = models.JSONField(null=True, blank=True, default=None)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class ProgramItem(models.Model):
    time = models.TimeField()
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, default='circle')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'time']

    def __str__(self):
        return self.title
