from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_budgetitem_paid_split'),
    ]

    operations = [
        migrations.AddField(
            model_name='table',
            name='seat_layout',
            field=models.JSONField(blank=True, default=None, null=True),
        ),
    ]
