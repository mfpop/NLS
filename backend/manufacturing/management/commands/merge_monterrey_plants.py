from django.core.management.base import BaseCommand
from django.db import transaction

from manufacturing.models import Plant, ProductionLine, ReferenceValue


MONTERREY_PLANT = {
    "code": "MT-01",
    "name": "Monterrey Plant",
    "status": "ACTIVE",
    "building": "ADN 2 Industrial Park",
    "address": "Autopista Monterrey-Laredo km 30",
    "city": "Cienega de Flores",
    "state": "Nuevo Leon",
    "country": "Mexico",
    "zipcode": "65550",
    "timezone": "America/Monterrey",
    "latitude": "25.6866",
    "longitude": "-100.3161",
    "plant_type": "Manufacturing",
    "operating_since": "2023-01-15",
    "manager_name": "Carlos Mendoza",
    "manager_email": "carlos.mendoza@maxonlift.com",
    "manager_phone": "+52 (81) 555-0104",
    "default_calendar": "Standard (Mon-Fri)",
    "default_shift_model": "2-shift (Morn/Aftn)",
    "week_start_day": "Monday",
    "default_schedule": "Day Shift",
    "manufacturing_focus": "Liftgate Assembly, Machining, Welding, Painting, Harness, Pipes, Assembly",
    "description": (
        "Manufacturing facility in Cienega de Flores, Nuevo Leon, serving North American "
        "liftgate production. Consolidates Monterrey assembly, machining, fabrication, "
        "welding, painting, harness, and pipe operations in one canonical plant record."
    ),
}

FOCUS_NAMES = ["Liftgate Assembly", "Machining", "Welding", "Painting", "Harness", "Pipes", "Assembly"]


def _normalized(value: str | None) -> str:
    return (value or "").strip().casefold()


def _monterrey_duplicates(canonical: Plant):
    candidates = Plant.objects.exclude(pk=canonical.pk).filter(name__icontains="Monterrey")
    return candidates | Plant.objects.exclude(pk=canonical.pk).filter(
        country__iexact="Mexico",
        timezone__icontains="Monterrey",
    ) | Plant.objects.exclude(pk=canonical.pk).filter(
        country__iexact="Mexico",
        state__icontains="Nuevo",
    ).filter(city__icontains="Flores")


class Command(BaseCommand):
    help = "Merge duplicate Monterrey plants into the canonical MT-01 plant"

    @transaction.atomic
    def handle(self, *args, **options):
        canonical, created = Plant.objects.get_or_create(
            code=MONTERREY_PLANT["code"],
            defaults=MONTERREY_PLANT,
        )

        for field, value in MONTERREY_PLANT.items():
            setattr(canonical, field, value)
        canonical.save()

        refs = ReferenceValue.objects.filter(category__code="manufacturing_focus", name__in=FOCUS_NAMES)
        if refs.exists():
            canonical.manufacturing_focus_refs.set(refs)

        duplicates = list(_monterrey_duplicates(canonical).distinct())
        moved_lines = 0
        deleted = 0

        for duplicate in duplicates:
            if _normalized(duplicate.code) == _normalized(canonical.code):
                continue
            moved_lines += ProductionLine.objects.filter(plant=duplicate).update(plant=canonical)
            duplicate.delete()
            deleted += 1

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} canonical Monterrey plant {canonical.name} ({canonical.code}); "
                f"moved {moved_lines} production line(s), deleted {deleted} duplicate plant(s)."
            )
        )
