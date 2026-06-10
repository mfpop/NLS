from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from manufacturing.models import (
    Plant, Department, ProductionLine,
    ResourceGroup, Resource, ReferenceTable,
    Profile, UserRole, ProductionLineDepartmentAssignment,
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
        self._seed_users()
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
                "code": "PP-01", "name": "Main Plant", "status": "active",
                "building": "Building A",
                "address": "123 Industrial Blvd",
                "city": "Detroit", "state": "MI", "country": "USA",
                "zipcode": "48201",
                "timezone": "America/Detroit (EST)",
                "latitude": "42.3314",
                "longitude": "-83.0458",
                "plant_type": "Manufacturing",
                "operating_since": "2018-03-15",
                "manager_name": "John Smith",
                "manager_email": "john.smith@leansync.com",
                "manager_phone": "+1 (313) 555-0101",
                "default_calendar": "Standard (Mon-Fri)",
                "default_shift_model": "2-shift (Morn/Aftn)",
                "week_start_day": "Monday",
                "default_schedule": "Day Shift",
                "manufacturing_focus": "Assembly, Machining, Quality",
                "description": "Primary assembly facility for cylinder and STB unit production.",
            },
            {
                "code": "PP-02", "name": "Secondary Plant", "status": "active",
                "building": "Building B",
                "address": "456 Manufacturing Dr",
                "city": "Toledo", "state": "OH", "country": "USA",
                "zipcode": "43601",
                "timezone": "America/New_York (EST)",
                "latitude": "41.6639",
                "longitude": "-83.5822",
                "plant_type": "Fabrication",
                "operating_since": "2019-06-01",
                "manager_name": "Sarah Chen",
                "manager_email": "sarah.chen@leansync.com",
                "manager_phone": "+1 (419) 555-0102",
                "default_calendar": "Standard (Mon-Fri)",
                "default_shift_model": "1-shift (Morning)",
                "week_start_day": "Monday",
                "default_schedule": "Morning Shift",
                "manufacturing_focus": "Harness, Pipes, Fabrication",
                "description": "Harnesses and pipes fabrication supporting main plant assembly.",
            },
            {
                "code": "WP-01", "name": "Warehouse Plant", "status": "inactive",
                "building": "Warehouse 1",
                "address": "789 Logistics Ave",
                "city": "Chicago", "state": "IL", "country": "USA",
                "zipcode": "60601",
                "timezone": "America/Chicago (CST)",
                "latitude": "41.8781",
                "longitude": "-87.6298",
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
            {
                "code": "MT-01", "name": "Monterrey Plant", "status": "active",
                "building": "ADN 2 Industrial Park",
                "address": "Autopista Monterrey-Laredo km 30",
                "city": "Ci\u00e9nega de Flores", "state": "Nuevo Le\u00f3n", "country": "Mexico",
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
                "description": "Manufacturing facility in Cienega de Flores, Nuevo Leon, serving North American liftgate production. Consolidates Monterrey assembly, machining, fabrication, welding, painting, harness, and pipe operations in one canonical plant record.",
            },
        ]

        for data in plants_data:
            Plant.objects.create(**data)
            self.stdout.write(f"  Created plant: {data['name']}")

    # ── Departments ──

    def _seed_departments(self):
        main_plant = Plant.objects.get(code="PP-01")
        depts_data = [
            {
                "code": "ASM", "name": "Assembly", "status": "active",
                "manager": "John Smith", "employees": 45,
                "plant": main_plant,
            },
            {
                "code": "MCH", "name": "Machining", "status": "active",
                "manager": "Sarah Chen", "employees": 32,
                "plant": main_plant,
            },
            {
                "code": "QC", "name": "Quality Control", "status": "active",
                "manager": "Mike Brown", "employees": 18,
                "plant": main_plant,
            },
            {
                "code": "LOG", "name": "Logistics", "status": "active",
                "manager": "Ana Garcia", "employees": 22,
                "plant": main_plant,
            },
            {
                "code": "MTN", "name": "Maintenance", "status": "inactive",
                "manager": "David Kim", "employees": 14,
                "plant": main_plant,
            },
            {
                "code": "WLD", "name": "Welding", "status": "active",
                "manager": "Robert Chen", "employees": 28,
                "plant": main_plant,
            },
            {
                "code": "CIT", "name": "Coating Internal", "status": "active",
                "manager": "Maria Lopez", "employees": 15,
                "plant": main_plant,
            },
            {
                "code": "CET", "name": "Coating External", "status": "active",
                "manager": "James Wilson", "employees": 14,
                "plant": main_plant,
            },
            {
                "code": "PKG", "name": "Packaging", "status": "active",
                "manager": "Emily Davis", "employees": 20,
                "plant": main_plant,
            },
        ]

        for data in depts_data:
            # First try plant+code, then plant+name (handles legacy codes from imports like '118'->'WLD')
            dept = (
                Department.objects.filter(plant=data["plant"], code=data["code"]).first()
                or Department.objects.filter(plant=data["plant"], name=data["name"]).first()
            )
            if dept is None:
                Department.objects.create(**data)
                self.stdout.write(f"  Created department: {data['name']}")
            else:
                # Update code if it differs (handles legacy codes from imports)
                if dept.code != data["code"]:
                    self.stdout.write(f"  Updated department {dept.name}: code {dept.code} -> {data['code']}")
                    dept.code = data["code"]
                    dept.save(update_fields=["code"])
                else:
                    self.stdout.write(f"  Department already exists: {data['name']}")

    # ── Production Lines (now has code + departments M2M) ──

    def _seed_production_lines(self):
        main_plant = Plant.objects.get(code="PP-01")
        secondary = Plant.objects.get(code="PP-02")

        # Departments scoped by plant
        def dept(p, code):
            return Department.objects.get(plant=p, code=code)

        lines_data = [
            {
                "code": "C2-LN", "name": "C2-Cylinder Assembly", "status": "ACTIVE",
                "plant": main_plant, "is_constraint": True,
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [dept(main_plant, "ASM"), dept(main_plant, "MCH"), dept(main_plant, "QC")],
            },
            {
                "code": "STB-LN", "name": "Line B (STB Units)", "status": "ACTIVE",
                "plant": main_plant,
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [dept(main_plant, "ASM"), dept(main_plant, "MCH")],
            },
            {
                "code": "PIPE-LN", "name": "Line C (Pipes)", "status": "ACTIVE",
                "plant": main_plant,
                "shift_pattern": "1-shift (Morning)",
                "depts": [dept(main_plant, "MCH")],
            },
            {
                "code": "LN-A", "name": "Line A", "status": "ACTIVE", "plant": main_plant,
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [dept(main_plant, "ASM")],
            },
            {
                "code": "LN-B2", "name": "Line B (Shared)", "status": "ACTIVE",
                "plant": secondary,
                "shift_pattern": "1-shift (Afternoon)",
                "depts": [dept(secondary, "PKG")],
            },
            {
                "code": "LN-C2", "name": "Line C (Quality)", "status": "INACTIVE",
                "plant": secondary,
                "shift_pattern": "1-shift (Morning)",
                "depts": [dept(secondary, "ASM")],
            },
            {
                "code": "C2-UL", "name": "C2 Units Line", "status": "ACTIVE",
                "plant": main_plant, "is_constraint": True,
                "shift_pattern": "2-shift (Morn/Aftn)",
                "depts": [
                    dept(main_plant, "ASM"), dept(main_plant, "MCH"),
                    dept(main_plant, "WLD"), dept(main_plant, "CIT"),
                    dept(main_plant, "CET"), dept(main_plant, "PKG"),
                ],
            },
        ]

        for data in lines_data:
            depts = data.pop("depts", [])
            line, created = ProductionLine.objects.get_or_create(code=data["code"], defaults=data)
            if created:
                for seq, dept in enumerate(depts):
                    ProductionLineDepartmentAssignment.objects.create(
                        production_line=line,
                        department=dept,
                        sequence=seq,
                    )
                self.stdout.write(f"  Created production line: {data['name']}")
            else:
                self.stdout.write(f"  Production line already exists: {data['name']}")

    # ── Resource Groups ──

    def _seed_resource_groups(self):
        main_plant = Plant.objects.get(code="PP-01")
        assembly = Department.objects.get(plant=main_plant, code="ASM")
        machining = Department.objects.get(plant=main_plant, code="MCH")
        qc = Department.objects.get(plant=main_plant, code="QC")
        logistics = Department.objects.get(plant=main_plant, code="LOG")
        welding = Department.objects.get(plant=main_plant, code="WLD")
        packaging = Department.objects.get(plant=main_plant, code="PKG")

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
            {
                "code": "RG-WLD-OP", "name": "Welding Operators", "group_type": "Production",
                "members": 10, "leader": "Tom Hardy", "status": "active",
                "department": welding,
            },
            {
                "code": "RG-WLD-TECH", "name": "Welding Technicians", "group_type": "Support",
                "members": 6, "leader": "Anna Schmidt", "status": "active",
                "department": welding,
            },
            {
                "code": "RG-WLD-QC", "name": "Welding Inspection", "group_type": "Quality",
                "members": 4, "leader": "Peter Kim", "status": "active",
                "department": welding,
            },
            {
                "code": "RG-WLD-LOG", "name": "Welding Material Handlers", "group_type": "Logistics",
                "members": 5, "leader": "Carlos Ruiz", "status": "active",
                "department": welding,
            },
            {
                "code": "RG-WLD-MGT", "name": "Welding Supervision", "group_type": "Management",
                "members": 3, "leader": "Diana Park", "status": "active",
                "department": welding,
            },
            {
                "code": "RG-PKG", "name": "Packaging Operators", "group_type": "Production",
                "members": 8, "leader": "Tom Nilsen", "status": "active",
                "department": packaging,
            },
        ]

        for data in groups_data:
            if not ResourceGroup.objects.filter(code=data["code"]).exists():
                ResourceGroup.objects.create(**data)
                self.stdout.write(f"  Created resource group: {data['name']}")
            else:
                self.stdout.write(f"  Resource group already exists: {data['name']}")

    # ── Resources (only resource_group FK kept) ──

    def _seed_resources(self):
        line_op = ResourceGroup.objects.get(code="RG-OP")
        setup_tech = ResourceGroup.objects.get(code="RG-SETUP")
        qc_insp = ResourceGroup.objects.get(code="RG-QC")
        mat_hand = ResourceGroup.objects.get(code="RG-LOG")
        weld_ops = ResourceGroup.objects.get(code="RG-WLD-OP")
        weld_tech = ResourceGroup.objects.get(code="RG-WLD-TECH")
        weld_qc = ResourceGroup.objects.get(code="RG-WLD-QC")
        weld_log = ResourceGroup.objects.get(code="RG-WLD-LOG")
        weld_mgt = ResourceGroup.objects.get(code="RG-WLD-MGT")
        pkg_ops = ResourceGroup.objects.get(code="RG-PKG")

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
            {
                "name": "Welding Station 1", "code": "WLD-ST-001",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 85.0,
                "shift": "Morning", "last_activity": "5 min ago",
                "flow_position": "Step 3/8",
                "resource_group": weld_ops,
            },
            {
                "name": "Welding Station 2", "code": "WLD-ST-002",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 72.0,
                "shift": "Morning", "last_activity": "12 min ago",
                "flow_position": "Step 3/8",
                "resource_group": weld_ops,
            },
            {
                "name": "Welding Station 3", "code": "WLD-ST-003",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Idle", "utilization": 45.0,
                "shift": "Afternoon", "last_activity": "30 min ago",
                "flow_position": "Step 3/8",
                "resource_group": weld_ops,
            },
            {
                "name": "Welding Robot 1", "code": "WLD-RBT-001",
                "resource_type": "Machine", "status": "active",
                "op_status": "Running", "utilization": 91.0,
                "shift": "Morning", "last_activity": "2 min ago",
                "flow_position": "Step 2/8",
                "resource_group": weld_tech,
            },
            {
                "name": "Welding Robot 2", "code": "WLD-RBT-002",
                "resource_type": "Machine", "status": "active",
                "op_status": "Running", "utilization": 88.0,
                "shift": "Morning", "last_activity": "4 min ago",
                "flow_position": "Step 2/8",
                "resource_group": weld_tech,
            },
            {
                "name": "Welding Robot 3", "code": "WLD-RBT-003",
                "resource_type": "Machine", "status": "active",
                "op_status": "Maintenance", "utilization": 0.0,
                "shift": "Afternoon", "last_activity": "2h ago",
                "flow_position": "Step 2/8",
                "resource_group": weld_tech,
            },
            {
                "name": "Weld Inspection Station 1", "code": "WLD-INSP-001",
                "resource_type": "Inspection Station", "status": "active",
                "op_status": "Running", "utilization": 63.0,
                "shift": "Morning", "last_activity": "15 min ago",
                "flow_position": "Step 5/8",
                "resource_group": weld_qc,
            },
            {
                "name": "Weld Inspection Station 2", "code": "WLD-INSP-002",
                "resource_type": "Inspection Station", "status": "active",
                "op_status": "Idle", "utilization": 38.0,
                "shift": "Afternoon", "last_activity": "1h ago",
                "flow_position": "Step 5/8",
                "resource_group": weld_qc,
            },
            {
                "name": "Weld Material Cart 1", "code": "WLD-CART-001",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 74.0,
                "shift": "Morning", "last_activity": "8 min ago",
                "flow_position": "Material Trans",
                "resource_group": weld_log,
            },
            {
                "name": "Weld Material Cart 2", "code": "WLD-CART-002",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 69.0,
                "shift": "Morning", "last_activity": "11 min ago",
                "flow_position": "Material Trans",
                "resource_group": weld_log,
            },
            {
                "name": "Weld Material Cart 3", "code": "WLD-CART-003",
                "resource_type": "Material Handling", "status": "active",
                "op_status": "Running", "utilization": 82.0,
                "shift": "Afternoon", "last_activity": "6 min ago",
                "flow_position": "Material Trans",
                "resource_group": weld_log,
            },
            {
                "name": "Welding Control Room", "code": "WLD-CTRL-001",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 100.0,
                "shift": "Morning", "last_activity": "1 min ago",
                "flow_position": "Supervision",
                "resource_group": weld_mgt,
            },
            {
                "name": "Welding Quality Terminal", "code": "WLD-TERM-001",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 55.0,
                "shift": "Morning", "last_activity": "20 min ago",
                "flow_position": "Supervision",
                "resource_group": weld_mgt,
            },
            {
                "name": "Packaging Line 1", "code": "PKG-LINE-001",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 76.0,
                "shift": "Morning", "last_activity": "3 min ago",
                "flow_position": "Step 1/4",
                "resource_group": pkg_ops,
            },
            {
                "name": "Packaging Line 2", "code": "PKG-LINE-002",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Idle", "utilization": 42.0,
                "shift": "Afternoon", "last_activity": "45 min ago",
                "flow_position": "Step 1/4",
                "resource_group": pkg_ops,
            },
            {
                "name": "Packaging Station 1", "code": "PKG-ST-001",
                "resource_type": "Workstation", "status": "active",
                "op_status": "Running", "utilization": 88.0,
                "shift": "Morning", "last_activity": "7 min ago",
                "flow_position": "Step 3/4",
                "resource_group": pkg_ops,
            },
        ]

        for data in resources_data:
            if data["resource_group"] is None:
                self.stdout.write(f"  SKIP resource '{data['name']}' — resource group not found")
                continue
            if not Resource.objects.filter(code=data["code"]).exists():
                Resource.objects.create(**data)
                self.stdout.write(f"  Created resource: {data['name']}")
            else:
                self.stdout.write(f"  Resource already exists: {data['name']}")

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

    # ── Auth Users ──

    def _seed_users(self):
        users_data = [
            {"username": "admin", "password": "admin", "email": "admin@leansync.com",
             "is_superuser": True, "role": UserRole.RoleType.DB_ADMIN},
            {"username": "manager", "password": "manager", "email": "manager@leansync.com",
             "is_superuser": False, "role": UserRole.RoleType.DEPT_MANAGER},
            {"username": "supervisor", "password": "supervisor", "email": "supervisor@leansync.com",
             "is_superuser": False, "role": UserRole.RoleType.SUPERVISOR},
            {"username": "operator", "password": "operator", "email": "operator@leansync.com",
             "is_superuser": False, "role": UserRole.RoleType.GUEST},
        ]

        for ud in users_data:
            if User.objects.filter(username=ud["username"]).exists():
                self.stdout.write(f"  User '{ud['username']}' already exists, skipping.")
                continue
            if ud["is_superuser"]:
                user = User.objects.create_superuser(
                    username=ud["username"], email=ud["email"], password=ud["password"],
                )
            else:
                user = User.objects.create_user(
                    username=ud["username"], email=ud["email"], password=ud["password"],
                )
            UserRole.objects.create(user=user, role=ud["role"])
            self.stdout.write(f"  Created user: {ud['username']} / {ud['password']} (role={ud['role']})")

    # ── User Profile ──

    def _seed_profile(self):
        admin_user = User.objects.filter(username="admin").first()

        defaults = dict(
            user=admin_user,
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
        profile, created = Profile.objects.update_or_create(pk=1, defaults=defaults)
        if created:
            self.stdout.write("  Created sample user profile.")
        else:
            self.stdout.write("  Updated sample user profile.")

    # ── Update counts on parent models ──

    def _update_counts(self):
        for plant in Plant.objects.all():
            plant.line_count = plant.production_lines.count()
            plant.save()

        for line in ProductionLine.objects.all():
            line.department_count = line.department_assignments.count()
            line.save()

        for dept in Department.objects.all():
            dept.group_count = dept.resource_groups.count()
            dept.save()

        for rg in ResourceGroup.objects.all():
            rg.resource_count = rg.resources.count()
            rg.save()

        self.stdout.write("  Counts updated on all parent models.")
