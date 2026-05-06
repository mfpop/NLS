from django.core.management.base import BaseCommand
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable,
    Profile,
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
        self._seed_profile()
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

    # ── Departments (reusable master data — no plant FK) ──

    def _seed_departments(self):
        if Department.objects.exists():
            self.stdout.write("  Departments already exist, skipping.")
            return

        depts_data = [
            {
                "code": "ASM", "name": "Assembly", "status": "active",
                "manager": "John Smith", "employees": 45,
            },
            {
                "code": "MCH", "name": "Machining", "status": "active",
                "manager": "Sarah Chen", "employees": 32,
            },
            {
                "code": "QC", "name": "Quality Control", "status": "active",
                "manager": "Mike Brown", "employees": 18,
            },
            {
                "code": "LOG", "name": "Logistics", "status": "active",
                "manager": "Ana Garcia", "employees": 22,
            },
            {
                "code": "MTN", "name": "Maintenance", "status": "inactive",
                "manager": "David Kim", "employees": 14,
            },
        ]

        for data in depts_data:
            Department.objects.create(**data)
            self.stdout.write(f"  Created department: {data['name']}")

    # ── Production Lines (now has code + departments M2M) ──

    def _seed_production_lines(self):
        if ProductionLine.objects.exists():
            self.stdout.write("  Production lines already exist, skipping.")
            return

        main_plant = Plant.objects.get(code="MP-01")
        secondary = Plant.objects.get(code="SP-01")

        assembly = Department.objects.get(code="ASM")
        machining = Department.objects.get(code="MCH")
        qc = Department.objects.get(code="QC")
        logistics = Department.objects.get(code="LOG")

        lines_data = [
            {
                "code": "C2-LN", "name": "C2-Cylinder Assembly", "status": "active",
                "plant": main_plant, "is_constraint": True,
                "models_produced": "C2 Cylinder, STB Valve Body, Flange Ring",
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [assembly, machining, qc],
            },
            {
                "code": "STB-LN", "name": "Line B (STB Units)", "status": "active",
                "plant": main_plant,
                "models_produced": "STB Unit Type A, STB Unit Type B",
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [assembly, machining],
            },
            {
                "code": "PIPE-LN", "name": "Line C (Pipes)", "status": "active",
                "plant": main_plant,
                "models_produced": "Pipe Assembly DN40, Pipe Assembly DN80",
                "shift_pattern": "1-shift (Morning)",
                "depts": [machining],
            },
            {
                "code": "LN-A", "name": "Line A", "status": "active", "plant": main_plant,
                "models_produced": "Assembly Base Unit",
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [assembly],
            },
            {
                "code": "LN-B2", "name": "Line B (Shared)", "status": "active",
                "plant": secondary,
                "models_produced": "Forklift Attachment, Pallet Adapter",
                "shift_pattern": "1-shift (Afternoon)",
                "depts": [logistics],
            },
            {
                "code": "LN-C2", "name": "Line C (Quality)", "status": "inactive",
                "plant": secondary,
                "models_produced": "QC Test Specimen",
                "shift_pattern": "1-shift (Morning)",
                "depts": [qc],
            },
        ]

        for data in lines_data:
            depts = data.pop("depts", [])
            line = ProductionLine.objects.create(**data)
            line.departments.set(depts)
            self.stdout.write(f"  Created production line: {data['name']}")

    # ── Resource Groups (now has code, no plant FK) ──

    def _seed_resource_groups(self):
        if ResourceGroup.objects.exists():
            self.stdout.write("  Resource groups already exist, skipping.")
            return

        assembly = Department.objects.get(code="ASM")
        machining = Department.objects.get(code="MCH")
        qc = Department.objects.get(code="QC")
        logistics = Department.objects.get(code="LOG")

        groups_data = [
            {
                "code": "RG-OP", "name": "Line Operators", "group_type": "Production",
                "members": 28, "leader": "Tom Wilson", "status": "active",
                "department": assembly,
            },
            {
                "code": "RG-SETUP", "name": "Setup Technicians", "group_type": "Support",
                "members": 12, "leader": "Lisa Park", "status": "active",
                "department": machining,
            },
            {
                "code": "RG-QC", "name": "Quality Inspectors", "group_type": "Quality",
                "members": 8, "leader": "James Lee", "status": "active",
                "department": qc,
            },
            {
                "code": "RG-LOG", "name": "Material Handlers", "group_type": "Logistics",
                "members": 15, "leader": "Maria Santos", "status": "active",
                "department": logistics,
            },
        ]

        for data in groups_data:
            ResourceGroup.objects.create(**data)
            self.stdout.write(f"  Created resource group: {data['name']}")

    # ── Resources (only resource_group FK kept) ──

    def _seed_resources(self):
        if Resource.objects.exists():
            self.stdout.write("  Resources already exist, skipping.")
            return

        line_op = ResourceGroup.objects.get(code="RG-OP")
        setup_tech = ResourceGroup.objects.get(code="RG-SETUP")
        qc_insp = ResourceGroup.objects.get(code="RG-QC")
        mat_hand = ResourceGroup.objects.get(code="RG-LOG")

        resources_data = [
            {
                "name": "Welding Station 2", "code": "WS-002",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 94.0,
                "shift": "Morning", "last_activity": "12 min ago",
                "flow_position": "Step 4/12",
                "resource_group": line_op,
            },
            {
                "name": "CNC Mill 1", "code": "CNC-MILL-01",
                "resource_type": "Machine", "status": "active",
                "op_status": "Running", "utilization": 87.0,
                "shift": "Morning", "last_activity": "5 min ago",
                "flow_position": "Step 2/12",
                "resource_group": setup_tech,
            },
            {
                "name": "QC Gate 1", "code": "QC-GATE-01",
                "resource_type": "Inspection Station", "status": "active",
                "op_status": "Idle", "utilization": 42.0,
                "shift": "Morning", "last_activity": "2h ago",
                "flow_position": "Step 8/12",
                "resource_group": qc_insp,
            },
            {
                "name": "Forklift 3", "code": "FORKLIFT-03",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 65.0,
                "shift": "Afternoon", "last_activity": "3 min ago",
                "flow_position": "Material Trans",
                "resource_group": mat_hand,
            },
            {
                "name": "Assembly Station A1", "code": "WS-A1",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 78.0,
                "shift": "Morning", "last_activity": "8 min ago",
                "flow_position": "Step 5/12",
                "resource_group": line_op,
            },
            {
                "name": "Assembly Station A2", "code": "WS-A2",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Idle", "utilization": 55.0,
                "shift": "Morning", "last_activity": "45 min ago",
                "flow_position": "Step 5/12",
                "resource_group": line_op,
            },
            {
                "name": "CNC Lathe 1", "code": "CNC-LATHE-01",
                "resource_type": "Machine", "status": "active",
                "op_status": "Down", "utilization": 0.0,
                "shift": "Morning", "last_activity": "3h ago",
                "flow_position": "Step 3/12",
                "resource_group": setup_tech,
            },
            {
                "name": "Torque Tool Set", "code": "TQ-001",
                "resource_type": "Tool", "status": "active",
                "op_status": "Running", "utilization": 100.0,
                "shift": "Morning", "last_activity": "1 min ago",
                "flow_position": "Step 5/12",
                "resource_group": line_op,
            },
            {
                "name": "QC Gate 2", "code": "QC-GATE-02",
                "resource_type": "Inspection Station", "status": "active",
                "op_status": "Maintenance", "utilization": 0.0,
                "shift": "Afternoon", "last_activity": "1h ago",
                "flow_position": "Step 8/12",
                "resource_group": qc_insp,
            },
            {
                "name": "Forklift 1", "code": "FORKLIFT-01",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 72.0,
                "shift": "Afternoon", "last_activity": "10 min ago",
                "flow_position": "Material Trans",
                "resource_group": mat_hand,
            },
            {
                "name": "Forklift 2", "code": "FORKLIFT-02",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 81.0,
                "shift": "Morning", "last_activity": "7 min ago",
                "flow_position": "Material Trans",
                "resource_group": mat_hand,
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

    # ── User Profile ──

    def _seed_profile(self):
        if Profile.objects.exists():
            self.stdout.write("  Profile already exists, skipping.")
            return

        Profile.objects.create(
            name="Mihai Popescu",
            role="Manufacturing Systems Lead",
            email="mihai.popescu@leansync.com",
            phone="+1 (313) 555-0147",
            location="Detroit, Michigan, USA",
            plant="Detroit Plant",
            department="Manufacturing Systems",
            reports_to="VP of Operations",
            language="English, Romanian",
            about=(
                "Operations leader focused on lean transformation, digital shopfloor visibility, "
                "and cross-plant standardization. Experienced in deploying KPI routines, "
                "stabilizing bottlenecks, and coaching supervisors through continuous improvement."
            ),
            work_history=[
                {
                    "id": "w1",
                    "role": "Manufacturing Systems Lead",
                    "company": "LeanSync Manufacturing",
                    "period": "2023 - Present",
                    "description": "Rolled out standard metrics, digital boards, and accountability cadences across three plants.",
                },
                {
                    "id": "w2",
                    "role": "Plant Operations Manager",
                    "company": "AutoMotion Components",
                    "period": "2020 - 2023",
                    "description": "Improved OEE by 11 points and reduced expedited freight through better scheduling discipline.",
                },
                {
                    "id": "w3",
                    "role": "Continuous Improvement Engineer",
                    "company": "Northline Industrial",
                    "period": "2017 - 2020",
                    "description": "Led kaizen events, value stream redesign, and layered process audits for high-mix assembly cells.",
                },
            ],
            education=[
                {
                    "id": "e1",
                    "degree": "M.Sc. Industrial Engineering",
                    "school": "Wayne State University",
                    "period": "2015 - 2017",
                },
                {
                    "id": "e2",
                    "degree": "B.Sc. Mechanical Engineering",
                    "school": "Politehnica University of Bucharest",
                    "period": "2011 - 2015",
                },
            ],
        )
        self.stdout.write("  Created sample user profile.")

    # ── Update counts on parent models ──

    def _update_counts(self):
        for plant in Plant.objects.all():
            plant.line_count = plant.production_lines.count()
            plant.save()

        for line in ProductionLine.objects.all():
            line.department_count = line.departments.count()
            line.save()

        for dept in Department.objects.all():
            dept.group_count = dept.resource_groups.count()
            dept.save()

        for rg in ResourceGroup.objects.all():
            rg.resource_count = rg.resources.count()
            rg.save()

        self.stdout.write("  Counts updated on all parent models.")
