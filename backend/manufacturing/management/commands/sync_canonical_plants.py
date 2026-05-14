from django.core.management.base import BaseCommand
from django.db import transaction

# pylint: disable=no-member

from manufacturing.management.commands.merge_monterrey_plants import MONTERREY_PLANT
from manufacturing.management.commands.seed_fix_plants import PLANTS
from manufacturing.models import Plant, ProductionLine, ReferenceValue


CANONICAL_CODES = ("PP-01", "MT-01", "POWNIW4", "WP-01")
FOCUS_CATEGORY = "manufacturing_focus"


def _focus_names(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _set_focus_refs(plant: Plant) -> None:
    names = _focus_names(plant.manufacturing_focus)
    if not names:
        plant.manufacturing_focus_refs.clear()
        return
    refs = ReferenceValue.objects.filter(category__code=FOCUS_CATEGORY, name__in=names)
    plant.manufacturing_focus_refs.set(refs)


class Command(BaseCommand):
    help = "Sync the database to the four canonical plant records"

    @transaction.atomic
    def handle(self, *args, **options):
        canonical_data = {
            "PP-01": PLANTS["PP-01"],
            "MT-01": MONTERREY_PLANT,
            "POWNIW4": PLANTS["POWNIW4"],
            "WP-01": PLANTS["WP-01"],
        }

        canonical: dict[str, Plant] = {}
        for code, data in canonical_data.items():
            plant, _ = Plant.objects.get_or_create(code=code, defaults={"name": data["name"]})
            for field, value in data.items():
                if field != "code":
                    setattr(plant, field, value)
            plant.code = code
            plant.save()
            _set_focus_refs(plant)
            canonical[code] = plant

        monterrey = canonical["MT-01"]
        moved_monterrey = ProductionLine.objects.filter(
            plant__name__icontains="Monterrey",
        ).exclude(plant=monterrey).update(plant=monterrey)

        extra_plants = list(Plant.objects.exclude(code__in=CANONICAL_CODES))
        deleted_count = 0
        for plant in extra_plants:
            if plant.production_lines.exists():
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping delete for {plant.name} ({plant.code}) because it still has production lines."
                    )
                )
                continue
            plant.delete()
            deleted_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Canonical plants synced: "
                f"{', '.join(CANONICAL_CODES)}. "
                f"Moved {moved_monterrey} Monterrey production line(s); "
                f"deleted {deleted_count} extra plant(s)."
            )
        )
