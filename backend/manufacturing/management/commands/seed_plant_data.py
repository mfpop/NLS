from django.core.management.base import BaseCommand
from manufacturing.models.plant import Plant


PLANTS_UPDATE = {
    "MP-01": {"latitude": "42.3314", "longitude": "-83.0458", "default_schedule": "Day Shift"},
    "SP-01": {"latitude": "41.6639", "longitude": "-83.5822", "default_schedule": "Morning Shift"},
    "WP-01": {"latitude": "41.8781", "longitude": "-87.6298", "default_schedule": "Morning Shift"},
    "MT-01": {"latitude": "25.6866", "longitude": "-100.3161", "default_schedule": "Day Shift"},
}


class Command(BaseCommand):
    help = "Update plant records with missing field values"

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
