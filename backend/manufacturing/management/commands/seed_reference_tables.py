from django.core.management.base import BaseCommand
from manufacturing.models.reference_table import ReferenceTable

GROUP_MAP = {
    "organization": [
        ("Manufacturing Organization", "Company-level manufacturing configuration settings"),
        ("Production Calendars", "Work day and holiday calendar definitions"),
        ("Shift Patterns", "Standard shift schedule definitions"),
        ("Languages", "Supported interface and documentation languages"),
        ("Timezones", "Global timezone reference list"),
    ],
    "manufacturing": [
        ("Manufacturing Types", "Production methodology classifications"),
        ("Work Centers", "Production area and cell definitions"),
        ("Machine Types", "Equipment and machinery category codes"),
        ("Operation Codes", "Standard operation and routing codes"),
        ("Routing Types", "Production routing and path classifications"),
    ],
    "material_flow": [
        ("Material Categories", "Raw material and component classification"),
        ("Inventory Types", "Stock and inventory classification codes"),
        ("Kanban Types", "Kanban signal and container type codes"),
        ("Container Types", "Material handling container standards"),
        ("Unit Types", "Measurement and quantity unit definitions"),
    ],
    "lean_quality": [
        ("Downtime Codes", "Production stoppage and downtime reason codes"),
        ("Defect Codes", "Quality defect classification codes"),
        ("Scrap Reasons", "Material scrap and waste reason codes"),
        ("Kaizen Categories", "Continuous improvement category codes"),
    ],
    "people": [
        ("Skill Types", "Operator skill and certification types"),
        ("Roles", "Job role and responsibility definitions"),
        ("Shift Teams", "Shift crew and team structure codes"),
    ],
}


class Command(BaseCommand):
    help = "Seed reference tables for manufacturing configuration"

    def handle(self, *args, **options):
        created = 0
        for group, tables in GROUP_MAP.items():
            for name, desc in tables:
                obj, is_new = ReferenceTable.objects.get_or_create(
                    name=name, defaults={
                        "description": desc,
                        "group": group,
                        "status": "active",
                        "entry_count": 0,
                    },
                )
                if is_new:
                    created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} reference tables"))
