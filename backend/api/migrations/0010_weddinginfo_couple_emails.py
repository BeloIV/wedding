from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_remove_plus_one'),
    ]

    operations = [
        migrations.AddField(
            model_name='weddinginfo',
            name='groom_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='weddinginfo',
            name='bride_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
    ]
