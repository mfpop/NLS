from django.core.management.base import BaseCommand
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable,
)


class Command(BaseCommand):
    help = "Seed the database with default manufacturing data"

    def handle(self, *args, **options):
        self._seed_plants()
        self._seed_departments()
        self._seed_production_lines()
        self._seed_resource_groups()
        self._seed_resources()
        self._seed_reference_tables()
        self._update_counts()

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))

    # ── Plants ──

    def _seed_plants(self):
        if Plant.objects.exists():
            self.stdout.write("  Plants already exist, skipping.")
            return

        plants_data = [
            {
                "code": "MP-01", "name": "Main Plant", "status": "active",
                "building": "Building A",
                "address": "123 Industrial Blvd, Detroit, MI 48201",
                "timezone": "America/Detroit (EST)",
                "manager_name": "John Smith",
                "manager_email": "john.smith@leansync.com",
                "description": "Primary assembly facility for cylinder and STB unit production.",
            },
            {
                "code": "SP-01", "name": "Secondary Plant", "status": "active",
                "building": "Building B",
                "address": "456 Manufacturing Dr, Toledo, OH 43601",
                "timezone": "America/New_York (EST)",
                "manager_name": "Sarah Chen",
                "manager_email": "sarah.chen@leansync.com",
                "description": "Harnesses and pipes fabrication supporting main plant assembly.",
            },
            {
                "code": "WP-01", "name": "Warehouse Plant", "status": "inactive",
                "building": "Warehouse 1",
                "address": "789 Logistics Ave, Chicago, IL 60601",
                "timezone": "America/Chicago (CST)",
                "manager_name": "Mike Brown",
                "manager_email": "mike.brown@leansync.com",
                "description": "Storage and kitting facility. Currently inactive pending reconfiguration.",
            },
        ]

        for data in plants_data:
            Plant.objects.create(**data)
            self.stdout.write(f"  Created plant: {data['name']}")

    # ── Departments ──

    def _seed_departments(self):
        if Department.objects.exists():
            self.stdout.write("  Departments already exist, skipping.")
            return

        main_plant = Plant.objects.get(code="MP-01")
        secondary = Plant.objects.get(code="SP-01")

        depts_data = [
            {
                "code": "ASM", "name": "Assembly", "status": "active",
                "manager": "John Smith", "employees": 45, "plant": main_plant,
            },
            {
                "code": "MCH", "name": "Machining", "status": "active",
                "manager": "Sarah Chen", "employees": 32, "plant": main_plant,
            },
            {
                "code": "QC", "name": "Quality Control", "status": "active",
                "manager": "Mike Brown", "employees": 18, "plant": main_plant,
            },
            {
                "code": "LOG", "name": "Logistics", "status": "active",
                "manager": "Ana Garcia", "employees": 22, "plant": secondary,
            },
            {
                "code": "MTN", "name": "Maintenance", "status": "inactive",
                "manager": "David Kim", "employees": 14, "plant": secondary,
            },
        ]

        for data in depts_data:
            Department.objects.create(**data)
            self.stdout.write(f"  Created department: {data['name']}")

    # ── Production Lines ──

    def _seed_production_lines(self):
        if ProductionLine.objects.exists():
            self.stdout.write("  Production lines already exist, skipping.")
            return

        main_plant = Plant.objects.get(code="MP-01")
        secondary = Plant.objects.get(code="SP-01")

        lines_data = [
            {
                "name": "C2-Cylinder Assembly", "status": "active",
                "plant": main_plant, "is_constraint": True,
                "models_produced": "C2 Cylinder, STB Valve Body, Flange Ring",
                "shift_pattern": "2-shift (Morn/Aftn)",
            },
            {
                "name": "Line B (STB Units)", "status": "active",
                "plant": main_plant,
                "models_produced": "STB Unit Type A, STB Unit Type B",
                "shift_pattern": "2-shift (Morn/Aftn)",
            },
            {
                "name": "Line C (Pipes)", "status": "active",
                "plant": main_plant,
                "models_produced": "Pipe Assembly DN40, Pipe Assembly DN80",
                "shift_pattern": "1-shift (Morning)",
            },
            {
                "name": "Line A", "status": "active", "plant": main_plant,
                "models_produced": "Assembly Base Unit",
                "shift_pattern": "2-shift (Morn/Aftn)",
            },
            {
                "name": "Line B (Shared)", "status": "active",
                "plant": secondary,
                "models_produced": "Forklift Attachment, Pallet Adapter",
                "shift_pattern": "1-shift (Afternoon)",
            },
            {
                "name": "Line C (Quality)", "status": "inactive",
                "plant": secondary,
                "models_produced": "QC Test Specimen",
                "shift_pattern": "1-shift (Morning)",
            },
        ]

        for data in lines_data:
            ProductionLine.objects.create(**data)
            self.stdout.write(f"  Created production line: {data['name']}")

    # ── Resource Groups ──

    def _seed_resource_groups(self):
        if ResourceGroup.objects.exists():
            self.stdout.write("  Resource groups already exist, skipping.")
            return

        assembly = Department.objects.get(code="ASM")
        machining = Department.objects.get(code="MCH")
        qc = Department.objects.get(code="QC")
        logistics = Department.objects.get(code="LOG")
        main_plant = Plant.objects.get(code="MP-01")
        secondary = Plant.objects.get(code="SP-01")

        groups_data = [
            {
                "name": "Line Operators", "group_type": "Production",
                "members": 28, "leader": "Tom Wilson", "status": "active",
                "department": assembly, "plant": main_plant,
            },
            {
                "name": "Setup Technicians", "group_type": "Support",
                "members": 12, "leader": "Lisa Park", "status": "active",
                "department": machining, "plant": main_plant,
            },
            {
                "name": "Quality Inspectors", "group_type": "Quality",
                "members": 8, "leader": "James Lee", "status": "active",
                "department": qc, "plant": main_plant,
            },
            {
                "name": "Material Handlers", "group_type": "Logistics",
                "members": 15, "leader": "Maria Santos", "status": "active",
                "department": logistics, "plant": secondary,
            },
            {
                "name": "Shift Supervisors", "group_type": "Management",
                "members": 6, "leader": "Robert Chen", "status": "active",
                "department": None, "plant": secondary,
            },
        ]

        for data in groups_data:
            ResourceGroup.objects.create(**data)
            self.stdout.write(f"  Created resource group: {data['name']}")

    # ── Resources ──

    def _seed_resources(self):
        if Resource.objects.exists():
            self.stdout.write("  Resources already exist, skipping.")
            return

        main_plant = Plant.objects.get(code="MP-01")
        secondary = Plant.objects.get(code="SP-01")
        assembly = Department.objects.get(code="ASM")
        machining = Department.objects.get(code="MCH")
        qc = Department.objects.get(code="QC")
        logistics = Department.objects.get(code="LOG")
        line_op = ResourceGroup.objects.get(name="Line Operators")
        setup_tech = ResourceGroup.objects.get(name="Setup Technicians")
        qc_insp = ResourceGroup.objects.get(name="Quality Inspectors")
        mat_hand = ResourceGroup.objects.get(name="Material Handlers")
        c2_line = ProductionLine.objects.get(name="C2-Cylinder Assembly")

        resources_data = [
            {
                "name": "Welding Station 2", "code": "WS-002",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 94.0,
                "shift": "Morning", "last_activity": "12 min ago",
                "flow_position": "Step 4/12",
                "resource_group": line_op, "department": assembly,
                "production_line": c2_line, "plant": main_plant,
            },
            {
                "name": "CNC Mill 1", "code": "CNC-MILL-01",
                "resource_type": "Machine", "status": "active",
                "op_status": "Running", "utilization": 87.0,
                "shift": "Morning", "last_activity": "5 min ago",
                "flow_position": "Step 2/12",
                "resource_group": setup_tech, "department": machining,
                "production_line": c2_line, "plant": main_plant,
            },
            {
                "name": "QC Gate 1", "code": "QC-GATE-01",
                "resource_type": "Inspection Station", "status": "active",
                "op_status": "Idle", "utilization": 42.0,
                "shift": "Morning", "last_activity": "2h ago",
                "flow_position": "Step 8/12",
                "resource_group": qc_insp, "department": qc,
                "production_line": c2_line, "plant": main_plant,
            },
            {
                "name": "Forklift 3", "code": "FORKLIFT-03",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 65.0,
                "shift": "Afternoon", "last_activity": "3 min ago",
                "flow_position": "Material Trans",
                "resource_group": mat_hand, "department": logistics,
                "production_line": None, "plant": secondary,
            },
            {
                "name": "Assembly Station A1", "code": "WS-A1",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 78.0,
                "shift": "Morning", "last_activity": "8 min ago",
                "flow_position": "Step 5/12",
                "resource_group": line_op, "department": assembly,
                "production_line": None, "plant": main_plant,
            },
            {
                "name": "Assembly Station A2", "code": "WS-A2",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Idle", "utilization": 55.0,
                "shift": "Morning", "last_activity": "45 min ago",
                "flow_position": "Step 5/12",
                "resource_group": line_op, "department": assembly,
                "production_line": None, "plant": main_plant,
            },
            {
                "name": "CNC Lathe 1", "code": "CNC-LATHE-01",
                "resource_type": "Machine", "status": "active",
                "op_status": "Down", "utilization": 0.0,
                "shift": "Morning", "last_activity": "3h ago",
                "flow_position": "Step 3/12",
                "resource_group": setup_tech, "department": machining,
                "production_line": None, "plant": main_plant,
            },
            {
                "name": "Torque Tool Set", "code": "TQ-001",
                "resource_type": "Tool", "status": "active",
                "op_status": "Running", "utilization": 100.0,
                "shift": "Morning", "last_activity": "1 min ago",
                "flow_position": "Step 5/12",
                "resource_group": line_op, "department": assembly,
                "production_line": None, "plant": main_plant,
            },
            {
                "name": "QC Gate 2", "code": "QC-GATE-02",
                "resource_type": "Inspection Station", "status": "active",
                "op_status": "Maintenance", "utilization": 0.0,
                "shift": "Afternoon", "last_activity": "1h ago",
                "flow_position": "Step 8/12",
                "resource_group": qc_insp, "department": qc,
                "production_line": None, "plant": main_plant,
            },
            {
                "name": "Forklift 1", "code": "FORKLIFT-01",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 72.0,
                "shift": "Afternoon", "last_activity": "10 min ago",
                "flow_position": "Material Trans",
                "resource_group": mat_hand, "department": logistics,
                "production_line": None, "plant": secondary,
            },
            {
                "name": "Forklift 2", "code": "FORKLIFT-02",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 81.0,
                "shift": "Morning", "last_activity": "7 min ago",
                "flow_position": "Material Trans",
                "resource_group": mat_hand, "department": logistics,
                "production_line": None, "plant": secondary,
            },
            {
                "name": "Supervisor Tablet", "code": "TAB-SUP-01",
                "resource_type": "Tool", "status": "active",
                "op_status": "Running", "utilization": 35.0,
                "shift": "All", "last_activity": "15 min ago",
                "flow_position": "Mgmt",
                "resource_group": None, "department": None,
                "production_line": None, "plant": secondary,
            },
        ]

        for data in resources_data:
            Resource.objects.create(**data)
            self.stdout.write(f"  Created resource: {data['name']}")

    # ── Reference Tables ──

    def _seed_reference_tables(self):
        if ReferenceTable.objects.exists():
            self.stdout.write("  Reference tables already exist, skipping.")
            return

        tables_data = [
            {"name": "Shift Patterns", "entry_count": 3, "status": "active",
             "description": "Standard shift schedules"},
            {"name": "Machine Types", "entry_count": 12, "status": "active",
             "description": "Equipment taxonomy"},
            {"name": "Material Categories", "entry_count": 24, "status": "active",
             "description": "Raw material classifications"},
            {"name": "Work Centers", "entry_count": 15, "status": "active",
             "description": "Production work center definitions"},
            {"name": "Operation Codes", "entry_count": 42, "status": "active",
             "description": "Manufacturing operation identifiers"},
            {"name": "Holiday Calendar", "entry_count": 14, "status": "inactive",
             "description": "Non-working day schedule"},
        ]

        for data in tables_data:
            ReferenceTable.objects.create(**data)
            self.stdout.write(f"  Created table: {data['name']}")

    # ── Update counts on parent models ──

    def _update_counts(self):
        for plant in Plant.objects.all():
            plant.department_count = plant.departments.count()
            plant.line_count = plant.production_lines.count()
            plant.group_count = plant.resource_groups.count()
            plant.resource_count = plant.resources.count()
            plant.save()

        for dept in Department.objects.all():
            dept.group_count = dept.resource_groups.count()
            dept.resource_count = dept.resources.count()
            dept.save()

        for line in ProductionLine.objects.all():
            line.department_count = line.resources.filter(
                department__isnull=False
            ).values("department").distinct().count()
            line.group_count = line.resources.filter(
                resource_group__isnull=False
            ).values("resource_group").distinct().count()
            line.resource_count = line.resources.count()
            line.save()

        self.stdout.write("  Counts updated on all parent models.")
