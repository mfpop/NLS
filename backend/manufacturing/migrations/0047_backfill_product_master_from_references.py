from django.db import migrations


def backfill_product_master(apps, schema_editor):
    ReferenceValue = apps.get_model("manufacturing", "ReferenceValue")
    ProductFamily = apps.get_model("manufacturing", "ProductFamily")
    ProductModel = apps.get_model("manufacturing", "ProductModel")
    PartNumber = apps.get_model("manufacturing", "PartNumber")

    family_refs = ReferenceValue.objects.filter(category__code="production_family").order_by("sort_order", "code")
    families_by_code = {}
    for ref in family_refs:
        family, _ = ProductFamily.objects.update_or_create(
            code=ref.code,
            defaults={
                "name": ref.name,
                "description": ref.description or "",
                "status": "ACTIVE" if ref.is_active else "INACTIVE",
                "is_active": ref.is_active,
            },
        )
        families_by_code[family.code] = family

    model_refs = ReferenceValue.objects.filter(category__code="product_model").order_by("sort_order", "code")
    for ref in model_refs:
        metadata = ref.metadata if isinstance(ref.metadata, dict) else {}
        family_code = metadata.get("family")
        if not family_code:
            continue

        family = families_by_code.get(family_code)
        if family is None:
            family, _ = ProductFamily.objects.update_or_create(
                code=family_code,
                defaults={
                    "name": family_code.replace("_", " ").title(),
                    "description": "Backfilled from product model family metadata.",
                    "status": "ACTIVE",
                    "is_active": True,
                },
            )
            families_by_code[family.code] = family

        model, _ = ProductModel.objects.update_or_create(
            code=ref.code,
            defaults={
                "family": family,
                "name": ref.name,
                "description": ref.description or "",
                "status": "ACTIVE" if ref.is_active else "INACTIVE",
            },
        )

        if model.family_id != family.id:
            model.family = family
            model.save(update_fields=["family", "updated_at"])

        PartNumber.objects.update_or_create(
            part_number=ref.code,
            defaults={
                "family": family,
                "model": model,
                "variant": None,
                "description": ref.description or ref.name,
                "revision": "",
                "uom": "EA",
                "status": "ACTIVE" if ref.is_active else "INACTIVE",
                "is_active": ref.is_active,
            },
        )


def reverse_backfill_product_master(apps, schema_editor):
    # Product master data may be edited after migration; do not delete user-owned records on reverse.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("manufacturing", "0046_capacitysnapshot_missing_reasons"),
    ]

    operations = [
        migrations.RunPython(backfill_product_master, reverse_backfill_product_master),
    ]
