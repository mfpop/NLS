from django.db import migrations


def drop_company_tax_id(apps, schema_editor):
    table_name = "manufacturing_company"
    column_name = "tax_id"

    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }

    if column_name in columns:
        schema_editor.execute(
            f"ALTER TABLE {schema_editor.quote_name(table_name)} DROP COLUMN {schema_editor.quote_name(column_name)}"
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("manufacturing", "0010_reference_item"),
    ]

    operations = [
        migrations.RunPython(
            drop_company_tax_id,
            noop,
        ),
    ]