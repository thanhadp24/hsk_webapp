from django.db import migrations


QUESTION_TYPES = [
    ("SHORT_ESSAY", "Viết đoạn văn ngắn", 8),
    ("PICTURE_ESSAY", "Nhìn tranh viết đoạn văn", 9),
]


def add_hsk5_writing_question_types(apps, schema_editor):
    QuestionType = apps.get_model("exercises", "QuestionType")
    for code, name, order_number in QUESTION_TYPES:
        QuestionType.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "order_number": order_number,
                "status": True,
            },
        )


def remove_hsk5_writing_question_types(apps, schema_editor):
    QuestionType = apps.get_model("exercises", "QuestionType")
    QuestionType.objects.filter(code__in=[code for code, _, _ in QUESTION_TYPES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("exercises", "0004_remove_attemptanswer_grading_status_and_more"),
    ]

    operations = [
        migrations.RunPython(add_hsk5_writing_question_types, remove_hsk5_writing_question_types),
    ]
