from django.db import migrations


FIELDS_TO_REMOVE = ("description", "thumbnail_url", "title", "topic")


def drop_columns_if_exist(apps, schema_editor):
    visual_image_model = apps.get_model("visual_learning", "VisualLearningImage")
    table_name = visual_image_model._meta.db_table

    with schema_editor.connection.cursor() as cursor:
        existing_columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        }

    for field_name in FIELDS_TO_REMOVE:
        field = visual_image_model._meta.get_field(field_name)
        if field.column in existing_columns:
            schema_editor.remove_field(visual_image_model, field)


class Migration(migrations.Migration):

    dependencies = [
        ("visual_learning", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(drop_columns_if_exist, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.RemoveField(
                    model_name="visuallearningimage",
                    name="description",
                ),
                migrations.RemoveField(
                    model_name="visuallearningimage",
                    name="thumbnail_url",
                ),
                migrations.RemoveField(
                    model_name="visuallearningimage",
                    name="title",
                ),
                migrations.RemoveField(
                    model_name="visuallearningimage",
                    name="topic",
                ),
            ],
        ),
    ]
