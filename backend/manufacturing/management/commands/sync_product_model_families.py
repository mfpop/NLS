from django.core.management.base import BaseCommand

from manufacturing.models import ReferenceCategory, ReferenceValue


MODEL_FAMILIES = {
    "BMR": "COLUMNLIFT",
    "BMR-CS": "COLUMNLIFT",
    "C2-DMP": "LIGHT_DUTY",
    "C2-PU": "LIGHT_DUTY",
    "C2-SB": "LIGHT_DUTY",
    "C2-STK": "LIGHT_DUTY",
    "DMD": "RAILIFT",
    "DMD-DIB": "RAILIFT",
    "DMD-TT": "RAILIFT",
    "GPC-X1": "CONVENTIONAL",
    "GPC-X1-LDF": "CONVENTIONAL",
    "GPC-X4": "CONVENTIONAL",
    "GPS": "SLIDELIFT",
    "GPSLR": "SLIDELIFT",
    "GPSLRT": "SLIDELIFT",
    "GPST": "SLIDELIFT",
    "GPT": "TUKAWAY",
    "GPTLR": "TUKAWAY",
    "GPTWR": "TUKAWAY",
    "MAXLINK": "MAXLINK",
    "MERLIN-SOL": "CHARGING",
    "MLA": "LIGHT_DUTY",
    "MXT-25": "TUKAWAY",
    "MXT-33": "TUKAWAY",
    "PHIL-KIT1": "CHARGING",
    "PHIL-KIT2": "CHARGING",
    "PHIL-VCHK": "CHARGING",
    "PURKEYS-DIR": "CHARGING",
    "PURKEYS-SEL": "CHARGING",
    "PURKEYS-STS": "CHARGING",
    "RA": "SLIDELIFT",
    "RC": "RAILIFT",
    "RC-CS": "RAILIFT",
    "RCT": "RAILIFT",
    "TE-20": "TUKAWAY",
    "TE-25": "TUKAWAY",
    "TE-33": "TUKAWAY",
}


class Command(BaseCommand):
    help = "Attach production family metadata to product model reference values."

    def handle(self, *args, **options):
        try:
            category = ReferenceCategory.objects.get(code="product_model")
        except ReferenceCategory.DoesNotExist:
            self.stderr.write("Product model reference category not found.")
            return

        updated = 0
        for model in ReferenceValue.objects.filter(category=category, code__in=MODEL_FAMILIES):
            metadata = dict(model.metadata or {})
            family = MODEL_FAMILIES[model.code]
            if metadata.get("family") == family:
                continue
            metadata["family"] = family
            model.metadata = metadata
            model.save(update_fields=["metadata", "updated_at"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} product model family mappings."))
