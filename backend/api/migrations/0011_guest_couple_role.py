from django.db import migrations, models


def match_existing(apps, schema_editor):
    """Pick the guests that already match the groom/bride names from the wedding settings."""
    Guest = apps.get_model('api', 'Guest')
    Info = apps.get_model('api', 'WeddingInfo')
    info = Info.objects.first()
    if not info:
        return
    for role, name in (('groom', info.groom_name), ('bride', info.bride_name)):
        name = (name or '').strip().lower()
        if not name:
            continue
        hits = [g for g in Guest.objects.all()
                if g.first_name.strip().lower() == name or f"{g.first_name} {g.last_name}".strip().lower() == name]
        if len(hits) == 1:  # ambiguous names are left for the user to tick
            hits[0].couple_role = role
            hits[0].save(update_fields=['couple_role'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_weddinginfo_couple_emails'),
    ]

    operations = [
        migrations.AddField(
            model_name='guest',
            name='couple_role',
            field=models.CharField(blank=True, choices=[('', '—'), ('groom', 'Ženích'), ('bride', 'Nevesta')], default='', max_length=5),
        ),
        migrations.RunPython(match_existing, migrations.RunPython.noop),
    ]
