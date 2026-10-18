from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_invitation_rsvpresponse_invite_token_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='weddinginfo',
            name='dress_code_colors',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='weddinginfo',
            name='dress_code_image',
            field=models.ImageField(blank=True, null=True, upload_to='dress_code/'),
        ),
    ]
