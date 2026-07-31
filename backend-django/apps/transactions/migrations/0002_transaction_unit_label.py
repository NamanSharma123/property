from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='unit_label',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
