from django.db import migrations, models
import api.models


def plus_ones_to_guests(apps, schema_editor):
    """A +1 becomes a regular guest on the same invitation/table (nobody loses their seat)."""
    Guest = apps.get_model('api', 'Guest')
    for g in Guest.objects.filter(has_plus_one=True):
        name = (g.plus_one_name or '').strip()
        if not name:
            continue
        first, _, last = name.partition(' ')
        Guest.objects.create(
            first_name=first[:100], last_name=(last or g.last_name)[:100],
            dietary=g.plus_one_dietary, invited_side=g.invited_side,
            invitation=g.invitation, table_number=g.table_number,
            rsvp_status=g.rsvp_status,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_table_seat_layout'),
    ]

    operations = [
        migrations.RunPython(plus_ones_to_guests, migrations.RunPython.noop),
        migrations.RemoveField(model_name='guest', name='has_plus_one'),
        migrations.RemoveField(model_name='guest', name='plus_one_dietary'),
        migrations.RemoveField(model_name='guest', name='plus_one_name'),
        migrations.RemoveField(model_name='rsvpresponse', name='has_plus_one'),
        migrations.RemoveField(model_name='rsvpresponse', name='plus_one_dietary'),
        migrations.RemoveField(model_name='rsvpresponse', name='plus_one_name'),
        migrations.AlterField(
            model_name='photo',
            name='image',
            field=models.ImageField(upload_to=api.models._photo_path),
        ),
    ]
