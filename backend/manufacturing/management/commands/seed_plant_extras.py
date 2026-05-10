from django.core.management.base import BaseCommand
from manufacturing.models.plant import Plant


PLANTS_UPDATE = {
    "MP-01": {
        "plant_type": "Manufacturing",
        "operating_since": "2018-03-15",
        "manager_phone": "+1 (313) 555-0101",
        "default_calendar": "Standard (Mon-Fri)",
        "default_shift_model": "2-shift (Morn/Aftn)",
        "week_start_day": "Monday",
        "manufacturing_focus": "Assembly, Machining, Quality",
    },
    "SP-01": {
        "plant_type": "Fabrication",
        "operating_since": "2019-06-01",
        "manager_phone": "+1 (419) 555-0102",
        "default_calendar": "Standard (Mon-Fri)",
        "default_shift_model": "1-shift (Morning)",
        "week_start_day": "Monday",
        "manufacturing_focus": "Harness, Pipes, Fabrication",
    },
    "WP-01": {
        "plant_type": "Warehouse",
        "operating_since": "2020-01-10",
        "manager_phone": "+1 (312) 555-0103",
        "default_calendar": "Standard (Mon-Fri)",
        "default_shift_model": "1-shift (Morning)",
        "week_start_day": "Monday",
        "manufacturing_focus": "Storage, Kitting, Logistics",
    },
}


class Command(BaseCommand):
    help = "Update plants with missing manufacturing fields"

    def handle(self, *args, **options):
        for code, data in PLANTS_UPDATE.items():
            try:
                plant = Plant.objects.get(code=code)
                for k, v in data.items():
                    setattr(plant, k, v)
                plant.save()
                self.stdout.write(f"  Updated plant: {plant.name} ({code})")
            except Plant.DoesNotExist:
                self.stdout.write(f"  Plant not found: {code}")
