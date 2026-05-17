from django.db import migrations


def move_backfilled_parts_to_variants(apps, schema_editor):
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")
    PartNumber = apps.get_model("manufacturing", "PartNumber")
    ProductVariant = apps.get_model("manufacturing", "ProductVariant")
    Routing = apps.get_model("manufacturing", "Routing")
    BOM = apps.get_model("manufacturing", "BOM")
    ProcessFlow = apps.get_model("manufacturing", "ProcessFlow")

    model_refs = ReferenceValue.objects.filter(category__code="product_model").order_by("sort_order", "code")
    for ref in model_refs:
        part = PartNumber.objects.filter(part_number=ref.code).select_related("model").first()
        if not part or not part.model_id:
            continue

        ProductVariant.objects.update_or_create(
            model_id=part.model_id,
            code=ref.code,
            defaults={
                "name": ref.name,
                "configuration_summary": ref.description or "",
                "status": "ACTIVE" if ref.is_active else "INACTIVE",
                "is_active": ref.is_active,
            },
        )

        is_referenced = (
            Routing.objects.filter(part_number_id=part.id).exists()
            or BOM.objects.filter(part_number_id=part.id).exists()
            or ProcessFlow.objects.filter(part_number_id=part.id).exists()
        )
        if not is_referenced:
            part.delete()


def reverse_move_backfilled_parts_to_variants(apps, schema_editor):
    # Part numbers are intentionally user-created going forward; do not recreate generated records.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("manufacturing", "0047_backfill_product_master_from_references"),
    ]

    operations = [
        migrations.RunPython(move_backfilled_parts_to_variants, reverse_move_backfilled_parts_to_variants),
    ]
