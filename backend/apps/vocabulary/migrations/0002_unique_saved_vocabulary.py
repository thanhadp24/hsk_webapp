from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("vocabulary", "0001_initial"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="usersavedvocabulary",
            constraint=models.UniqueConstraint(
                fields=("user", "vocabulary"), name="unique_saved_vocabulary"
            ),
        ),
    ]
