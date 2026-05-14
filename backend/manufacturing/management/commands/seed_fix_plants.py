from django.core.management.base import BaseCommand
from manufacturing.models.plant import Plant


PLANTS = {
    "PP-01": {
        "name": "Tijuana Plant",
        "status": "ACTIVE",
        "building": "Tijuana Manufacturing Campus",
        "address": "Blvd. de los Insurgentes 20230",
        "city": "Tijuana", "state": "Baja California", "country": "Mexico",
        "zipcode": "22244",
        "timezone": "America/Tijuana",
        "latitude": "32.5149", "longitude": "-116.9987",
        "plant_type": "Manufacturing",
        "operating_since": "2008-06-01",
        "manager_name": "Carlos Ruiz",
        "manager_email": "carlos.ruiz@maxonlift.com",
        "manager_phone": "+52 (664) 555-0100",
        "default_calendar": "Standard (Mon-Fri)",
        "default_shift_model": "2-shift (Morn/Aftn)",
        "week_start_day": "Monday",
        "default_schedule": "Day Shift",
        "manufacturing_focus": "Liftgate Assembly, Welding, Logistics",
        "description": "Primary manufacturing facility for liftgate production serving the western US and Mexico markets.",
    },
    "WP-01": {
        "name": "WH15 Warehouse",
        "status": "ACTIVE",
        "building": "Warehouse 15",
        "address": "789 Logistics Ave",
        "city": "Chicago", "state": "IL", "country": "USA",
        "zipcode": "60601",
        "timezone": "America/Chicago (CST)",
        "latitude": "41.8781", "longitude": "-87.6298",
        "plant_type": "Warehouse",
        "operating_since": "2020-01-10",
        "manager_name": "Mike Brown",
        "manager_email": "mike.brown@leansync.com",
        "manager_phone": "+1 (312) 555-0103",
        "default_calendar": "Standard (Mon-Fri)",
        "default_shift_model": "1-shift (Morning)",
        "week_start_day": "Monday",
        "default_schedule": "Morning Shift",
        "manufacturing_focus": "Storage, Kitting, Logistics",
        "description": "Storage and kitting facility. Currently inactive pending reconfiguration.",
    },
    "POWNIW4": {
        "name": "Greenleaf WareHouse",
        "status": "ACTIVE",
        "building": "Greenleaf Industrial Park",
        "address": "1200 Greenleaf Blvd",
        "city": "Greenleaf", "state": "California", "country": "USA",
        "zipcode": "90210",
        "timezone": "America/Los_Angeles",
        "latitude": "33.9425", "longitude": "-118.2550",
        "plant_type": "Warehouse",
        "operating_since": "2015-03-01",
        "manager_name": "Tom Green",
        "manager_email": "tom.green@leansync.com",
        "manager_phone": "+1 (310) 555-0105",
        "default_calendar": "Standard (Mon-Fri)",
        "default_shift_model": "1-shift (Morning)",
        "week_start_day": "Monday",
        "default_schedule": "Day Shift",
        "manufacturing_focus": "Packaging, Logistics",
        "description": "Packaging and distribution center for finished goods.",
    },
    "MT-01": {
        "name": "Monterrey Plant",
        "status": "ACTIVE",
        "building": "ADN 2 Industrial Park",
        "address": "Autopista Monterrey-Laredo km 30",
        "city": "Ci\u00e9nega de Flores", "state": "Nuevo Le\u00f3n", "country": "Mexico",
        "zipcode": "65550",
        "timezone": "America/Monterrey",
        "latitude": "25.6866", "longitude": "-100.3161",
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
        "description": "Manufacturing facility in Cienega de Flores, Nuevo Leon, serving North American liftgate production. Consolidates Monterrey assembly, machining, fabrication, welding, painting, harness, and pipe operations in one canonical plant record.",
    },
}


class Command(BaseCommand):
    help = "Update all plants with complete field data"

    def handle(self, *args, **options):
        for code, data in PLANTS.items():
            try:
                plant = Plant.objects.get(code=code)
                for k, v in data.items():
                    setattr(plant, k, v)
                plant.save()
                self.stdout.write(f"  Updated: {plant.name} ({code})")
            except Plant.DoesNotExist:
                self.stdout.write(f"  Not found: {code}")
