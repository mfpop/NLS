"""
Seed script for GPT production line setup on Monterrey Plant.
Run: python manage.py seed_gpt_line
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from manufacturing.models import (
    Plant, Company, ProductModel, ProductFamily, ProductVariant, PartNumber,
    ProductionLine, Department, ResourceGroup, Resource,
    ProductionLineDepartmentAssignment,
    ReferenceValue, ReferenceCategory,
)
from manufacturing.models.production_line_resource_group import ProductionLineResourceGroup
from manufacturing.models.routing import (
    Routing, RoutingStep, RoutingStatus, ProcessFlow, ProcessStep,
    BOM, BOMItem, Material, Warehouse, MaterialBin, MaterialBinType,
)

MONTERREY_PLANT_CODE = "PP-02"

# ── Department definitions ──
DEPARTMENTS = [
    {"code": "MCH", "name": "Machining", "desc": "CNC and manual machining operations"},
    {"code": "WLD", "name": "Welding", "desc": "Robotic and manual welding operations"},
    {"code": "COT", "name": "Coating", "desc": "Powder coating and painting operations"},
    {"code": "ASM", "name": "Assembly", "desc": "Main and sub-assembly operations"},
    {"code": "PIP", "name": "Pipes", "desc": "Pipe cutting, bending, and preparation"},
    {"code": "KIT", "name": "Kitting", "desc": "Material kitting and staging"},
    {"code": "HRS", "name": "Harnesses", "desc": "Wire harness and cable assembly"},
    {"code": "PKG", "name": "Packaging", "desc": "Final packaging and labeling"},
]

RESOURCE_GROUPS = {
    "MCH": [
        {"code": "MCH-CNC", "name": "CNC Machining"},
        {"code": "MCH-MAN", "name": "Manual Machining"},
    ],
    "WLD": [
        {"code": "WLD-ROB", "name": "Robotic Welding"},
        {"code": "WLD-MAN", "name": "Manual Welding"},
    ],
    "COT": [
        {"code": "COT-PDR", "name": "Powder Coating"},
        {"code": "COT-PNT", "name": "Paint Booth"},
    ],
    "ASM": [
        {"code": "ASM-MAIN", "name": "Main Assembly"},
        {"code": "ASM-SUB", "name": "Sub Assembly"},
    ],
    "PIP": [
        {"code": "PIP-CUT", "name": "Pipe Cutting"},
        {"code": "PIP-BND", "name": "Pipe Bending"},
    ],
    "KIT": [
        {"code": "KIT-MAT", "name": "Material Kitting"},
        {"code": "KIT-STG", "name": "Kit Staging"},
    ],
    "HRS": [
        {"code": "HRS-WIRE", "name": "Wire Harness"},
        {"code": "HRS-CBL", "name": "Cable Assembly"},
    ],
    "PKG": [
        {"code": "PKG-FINAL", "name": "Final Packaging"},
        {"code": "PKG-LBL", "name": "Labeling"},
    ],
}

RESOURCES = {
    "MCH-CNC": [
        {"code": "CNC-MILL-01", "name": "CNC Mill #1"},
        {"code": "CNC-LATHE-01", "name": "CNC Lathe #1"},
    ],
    "MCH-MAN": [
        {"code": "MAN-LATHE-01", "name": "Manual Lathe #1"},
        {"code": "MAN-MILL-01", "name": "Manual Mill #1"},
    ],
    "WLD-ROB": [
        {"code": "ROB-WELD-01", "name": "Robotic Welder #1"},
        {"code": "ROB-WELD-02", "name": "Robotic Welder #2"},
    ],
    "WLD-MAN": [
        {"code": "MAN-WELD-01", "name": "Manual Welding Station #1"},
        {"code": "MAN-WELD-02", "name": "Manual Welding Station #2"},
    ],
    "COT-PDR": [
        {"code": "PDR-LINE-01", "name": "Powder Coating Line #1"},
        {"code": "PDR-OVEN-01", "name": "Curing Oven #1"},
    ],
    "COT-PNT": [
        {"code": "PNT-BOOTH-01", "name": "Paint Booth #1"},
        {"code": "PNT-MIX-01", "name": "Paint Mix Station"},
    ],
    "ASM-MAIN": [
        {"code": "ASM-LINE-01", "name": "Main Assembly Station 1"},
        {"code": "ASM-LINE-02", "name": "Main Assembly Station 2"},
    ],
    "ASM-SUB": [
        {"code": "ASM-SUB-01", "name": "Sub Assembly Bench #1"},
        {"code": "ASM-SUB-02", "name": "Sub Assembly Bench #2"},
    ],
    "PIP-CUT": [
        {"code": "PIP-SAW-01", "name": "Pipe Saw #1"},
        {"code": "PIP-DEBUR-01", "name": "Deburring Station #1"},
    ],
    "PIP-BND": [
        {"code": "PIP-BND-01", "name": "CNC Pipe Bender #1"},
        {"code": "PIP-BND-02", "name": "CNC Pipe Bender #2"},
    ],
    "KIT-MAT": [
        {"code": "KIT-BENCH-01", "name": "Kitting Bench #1"},
        {"code": "KIT-BENCH-02", "name": "Kitting Bench #2"},
    ],
    "KIT-STG": [
        {"code": "KIT-RACK-01", "name": "Staging Rack Area 1"},
        {"code": "KIT-RACK-02", "name": "Staging Rack Area 2"},
    ],
    "HRS-WIRE": [
        {"code": "HRS-TABLE-01", "name": "Wire Harness Table #1"},
        {"code": "HRS-TABLE-02", "name": "Wire Harness Table #2"},
    ],
    "HRS-CBL": [
        {"code": "HRS-CRIMP-01", "name": "Crimp Station #1"},
        {"code": "HRS-CUT-01", "name": "Wire Cutter #1"},
    ],
    "PKG-FINAL": [
        {"code": "PKG-CRATE-01", "name": "Crating Station #1"},
        {"code": "PKG-CRATE-02", "name": "Crating Station #2"},
    ],
    "PKG-LBL": [
        {"code": "PKG-LBL-01", "name": "Labeling Station #1"},
        {"code": "PKG-LBL-02", "name": "Labeling Station #2"},
    ],
}

# 50 Part Numbers (mix of components, sub-assemblies, hardware, raw materials)
PART_NUMBERS = [
    ("100-001-01", "Main Frame Assembly - Primary Structure"),
    ("100-002-01", "Lifting Arm Assembly - Left Side"),
    ("100-003-01", "Lifting Arm Assembly - Right Side"),
    ("100-004-01", "Platform Deck Assembly - Steel"),
    ("100-005-01", "Hydraulic Power Unit - Complete Assembly"),
    ("100-006-01", "Control Valve Assembly - 3-Way"),
    ("100-007-01", "Hydraulic Cylinder - Main Lift 6in Stroke"),
    ("100-008-01", "Hydraulic Cylinder - Tilt 4in Stroke"),
    ("200-001-01", "Mounting Bracket - Frame Connection"),
    ("200-002-01", "Pivot Pin - Hardened Steel 25mm"),
    ("200-003-01", "Cross Member - Tubular Steel 2x4in"),
    ("200-004-01", "Support Leg - Adjustable Assembly"),
    ("200-005-01", "Safety Latch - Spring Loaded"),
    ("300-001-01", "Wire Harness - Main Power 48in Length"),
    ("300-002-01", "Wire Harness - Control Signals 36in Length"),
    ("300-003-01", "Control Module - ECU Assembly"),
    ("300-004-01", "Solenoid Driver Board - 4-Channel"),
    ("300-005-01", "Limit Switch Assembly - Waterproof"),
    ("300-006-01", "Pressure Sensor - Hydraulic 5000 PSI"),
    ("300-007-01", "Position Sensor - Linear Encoder"),
    ("400-001-01", "Hydraulic Hose - 3/8in x 48in Pre-Crimped"),
    ("400-002-01", "Hydraulic Hose - 1/4in x 36in Pre-Crimped"),
    ("400-003-01", "Steel Tube - 1.5in Schedule 40 Cut to Length"),
    ("400-004-01", "Steel Tube - 2in Schedule 80 Cut to Length"),
    ("400-005-01", "Pipe Fitting Kit - Elbows and Tees 10 pcs"),
    ("400-006-01", "Pipe Fitting Kit - Reducers and Caps 8 pcs"),
    ("400-007-01", "Hydraulic Fitting - JIC 3/8in Male"),
    ("400-008-01", "Hydraulic Fitting - JIC 1/4in Male"),
    ("500-001-01", "Steel Plate - 3/8in x 48in x 96in Pickled"),
    ("500-002-01", "Steel Plate - 1/4in x 48in x 96in HRPO"),
    ("500-003-01", "Steel Bar - 1in Round 6061-T6 12 ft"),
    ("500-004-01", "Aluminum Extrusion - Channel 2inx2in 12 ft"),
    ("500-005-01", "Steel Angle - 2inx2inx1/4in 20 ft"),
    ("500-006-01", "Fastener Kit - Grade 8 Bolts and Nuts M10"),
    ("500-007-01", "Fastener Kit - Grade 8 Bolts and Nuts M12"),
    ("500-008-01", "Lock Washer Kit - M8/M10/M12 Assorted"),
    ("500-009-01", "Cotter Pin Kit - Assorted Sizes 50 pcs"),
    ("500-010-01", "Grease Fitting Kit - Straight and 45 deg"),
    ("600-001-01", "Rubber Bumper - Rectangular 2inx4inx1in"),
    ("600-002-01", "Polyurethane Pad - 1in Thick x 12inx12in"),
    ("600-003-01", "Nylon Wear Strip - 1/4inx2inx48in"),
    ("600-004-01", "O-Ring Seal Kit - Buna-N Assorted"),
    ("600-005-01", "Dust Cover - Neoprene 6in Diameter"),
    ("700-001-01", "Warning Decal Set - English/Spanish"),
    ("700-002-01", "Rating Plate - Stainless Steel Laser Etched"),
    ("700-003-01", "Serial Number Plate - Aluminum"),
    ("700-004-01", "Safety Instruction Card - Laminated"),
    ("800-001-01", "Paint Kit - Primer and Top Coat Black"),
    ("800-002-01", "Touch Up Paint - Aerosol Can Safety Yellow"),
]

# Material codes for BOM (subset of part numbers that represent sourced materials)
BOM_MATERIALS = [
    ("500-001-01", "Steel Plate 3/8 Pickled", 2.0),
    ("500-002-01", "Steel Plate 1/4 HRPO", 1.5),
    ("500-003-01", "Steel Bar 1in Round", 4.0),
    ("500-004-01", "Aluminum Extrusion Channel", 2.0),
    ("500-005-01", "Steel Angle 2x2x1/4", 3.0),
    ("500-006-01", "Fastener Kit M10", 8.0),
    ("500-007-01", "Fastener Kit M12", 6.0),
    ("500-008-01", "Lock Washer Kit Assorted", 4.0),
    ("500-009-01", "Cotter Pin Kit Assorted", 10.0),
    ("500-010-01", "Grease Fitting Kit", 2.0),
    ("400-007-01", "Hydraulic Fitting JIC 3/8", 6.0),
    ("400-008-01", "Hydraulic Fitting JIC 1/4", 4.0),
    ("600-001-01", "Rubber Bumper Rectangular", 4.0),
    ("600-002-01", "Polyurethane Pad", 2.0),
    ("600-003-01", "Nylon Wear Strip", 8.0),
    ("600-004-01", "O-Ring Seal Kit Buna-N", 2.0),
    ("600-005-01", "Dust Cover Neoprene", 1.0),
    ("400-003-01", "Steel Tube 1.5in Sch 40", 3.0),
    ("400-004-01", "Steel Tube 2in Sch 80", 2.0),
    ("700-001-01", "Warning Decal Set", 1.0),
    ("700-002-01", "Rating Plate SS Laser Etched", 1.0),
    ("700-003-01", "Serial Number Plate Aluminum", 1.0),
    ("700-004-01", "Safety Instruction Card Laminated", 1.0),
    ("800-001-01", "Paint Kit Primer and Top Coat", 2.0),
    ("800-002-01", "Touch Up Paint Aerosol Yellow", 1.0),
    ("300-005-01", "Limit Switch Assembly Waterproof", 2.0),
    ("300-006-01", "Pressure Sensor Hydraulic 5000 PSI", 1.0),
    ("300-007-01", "Position Sensor Linear Encoder", 1.0),
    ("200-002-01", "Pivot Pin Hardened Steel 25mm", 4.0),
    ("200-005-01", "Safety Latch Spring Loaded", 2.0),
]


class Command(BaseCommand):
    help = "Seed GPT production line on Monterrey Plant (8 depts, 16 RGs, 32+ res, 50 PNs, routing, bins)"

    def _ref(self, cat_code, val_code):
        """Lookup a ReferenceValue by category code and value code."""
        return ReferenceValue.objects.get(category__code=cat_code, code=val_code)

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  GPT LINE SEED COMMAND"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        # Resolve reference values
        self.stdout.write("Resolving reference values...")
        ref_status_active = self._ref("status", "ACTIVE").id
        ref_line_type_assembly = self._ref("line_type", "assembly_line").id
        ref_shift_2shift = self._ref("shift_model", "2_shift_morn_aftn").id
        ref_cal_standard = self._ref("calendar", "standard_mo_fri").id
        ref_week_mon = self._ref("week_start_day", "monday").id
        ref_tz_mty = self._ref("timezone", "America/Mexico_City").id
        ref_uom_shift = self._ref("unit_of_measure", "units_per_shift").id
        ref_uom_pieces = self._ref("unit_of_measure", "pieces").id

        plant = Plant.objects.get(code=MONTERREY_PLANT_CODE)
        company = Company.objects.first()

        warehouse = Warehouse.objects.filter(plant=plant, code="MTY-WH").first()
        if warehouse:
            self.stdout.write(f"  Warehouse: {warehouse.name} ({warehouse.code}) ID={warehouse.id}")
        else:
            self.stdout.write("  WARNING: Warehouse MTY-WH not found!")

        try:
            gpt_model = ProductModel.objects.get(code="GPT")
        except ProductModel.DoesNotExist:
            self.stdout.write("  ERROR: GPT model not found!")
            return

        # ── 0. Clean up any existing GPT-related data for a clean slate ──
        self.stdout.write("\n[0/10] Cleaning up existing GPT data...")

        # Delete old production line if exists (archived or active)
        old_line = ProductionLine.objects.filter(plant=plant, code="GPT").first()
        if old_line:
            # Assignments (ProductionLineResourceGroup imported at module level)
            ProductionLineResourceGroup.objects.filter(production_line=old_line).delete()
            # Work orders
            from execution.models import WorkOrder
            wo_count = WorkOrder.objects.filter(production_line=old_line).count()
            if wo_count:
                WorkOrder.objects.filter(production_line=old_line).delete()
                self.stdout.write(f"  Deleted {wo_count} work orders for line")
            # Material bins
            MaterialBin.objects.filter(production_line=old_line).delete()
            # Routings
            Routing.objects.filter(production_line=old_line).delete()
            ProcessFlow.objects.filter(production_line=old_line).delete()
            # Delete assignments to departments
            ProductionLineDepartmentAssignment.objects.filter(production_line=old_line).delete()
            old_line.delete()
            self.stdout.write("  Deleted old GPT production line")

        # Delete leftover GPT-related departments
        old_dept_codes = [d.code for d in Department.objects.filter(plant=plant) if d.code not in {d2["code"] for d2 in DEPARTMENTS}]
        for code in old_dept_codes:
            dept = Department.objects.filter(plant=plant, code=code).first()
            if not dept:
                continue
            for rg in ResourceGroup.objects.filter(department=dept):
                MaterialBin.objects.filter(resource_group=rg).delete()
                Resource.objects.filter(resource_group=rg).delete()
                ProductionLineResourceGroup.objects.filter(resource_group=rg).delete()
                RoutingStep.objects.filter(resource_group=rg).delete()
                rg.delete()
            ProductionLineDepartmentAssignment.objects.filter(department=dept).delete()
            dept.delete()
            self.stdout.write(f"  Cleaned up old department: {code}")

        # Delete old BOM
        for bom in BOM.objects.filter(product_model=gpt_model):
            cnt = BOMItem.objects.filter(bom=bom).count()
            BOMItem.objects.filter(bom=bom).delete()
            bom.delete()
            self.stdout.write(f"  Deleted old BOM #{bom.id} ({cnt} items)")

        self.stdout.write("  Cleanup complete")

        # ── 1. Create 8 departments ──
        self.stdout.write("\n[1/10] Creating departments...")

        # ── 2. Create departments ──
        dept_map = {}
        for d in DEPARTMENTS:
            obj, created = Department.objects.get_or_create(
                plant=plant, code=d["code"],
                defaults={"name": d["name"], "description": d["desc"],
                          "status": "ACTIVE", "employees": 10},
            )
            dept_map[d["code"]] = obj
            self.stdout.write(f"  {'Created' if created else 'Already exists'}: {d['name']} ({d['code']})")

        # ── 3. Create resource groups ──
        self.stdout.write("\n[3/10] Creating resource groups (2 per department)...")
        rg_map = {}
        for dept_code, rgs in RESOURCE_GROUPS.items():
            dept = dept_map[dept_code]
            for rg in rgs:
                obj, created = ResourceGroup.objects.get_or_create(
                    department=dept, code=rg["code"],
                    defaults={"name": rg["name"], "status": "ACTIVE",
                              "capability_type": "SHARED", "members": 4},
                )
                rg_map[rg["code"]] = obj
                self.stdout.write(f"  {'Created' if created else 'Exists'}: {rg['code']}")

        # ── 4. Create resources ──
        self.stdout.write("\n[4/10] Creating resources (2 per RG)...")
        res_map = {}
        for rg_code, resources in RESOURCES.items():
            rg = rg_map[rg_code]
            for res in resources:
                obj, created = Resource.objects.get_or_create(
                    resource_group=rg, code=res["code"],
                    defaults={"name": res["name"], "status": "ACTIVE"},
                )
                res_map[res["code"]] = obj
                self.stdout.write(f"  {'Created' if created else 'Exists'}: {res['code']}")

        # ── 5. Create variant 239364-01 and 50 part numbers ──
        self.stdout.write("\n[5/10] Creating variant 239364-01 and 50 part numbers...")

        variant, _ = ProductVariant.objects.get_or_create(
            model=gpt_model, code="239364-01",
            defaults={
                "name": "GPT Columnlift 239364-01",
                "configuration_summary": "6000lb capacity, 12V hydraulic",
                "status": "ACTIVE", "part_number": "239364-01", "is_active": True,
            },
        )
        self.stdout.write(f"  Variant: 239364-01 ({'created' if _ else 'already exists'})")

        fam = gpt_model.family
        if not fam:
            self.stdout.write("  ERROR: GPT model has no family!")
            return

        created_count = 0
        for pn, desc in PART_NUMBERS:
            pn_obj, created = PartNumber.objects.get_or_create(
                part_number=pn,
                defaults={
                    "family": fam, "model": gpt_model, "variant": variant,
                    "description": desc, "revision": "A", "uom": "EA",
                    "status": "ACTIVE", "is_active": True,
                },
            )
            if created:
                created_count += 1

        total_pn = PartNumber.objects.filter(model=gpt_model, variant=variant).count()
        self.stdout.write(f"  Created {created_count} new part numbers ({total_pn} total for variant)")

        # ── 6. Create BOM with part numbers ──
        self.stdout.write("\n[6/10] Creating new BOM for GPT...")
        bom, _ = BOM.objects.get_or_create(
            product_model=gpt_model,
            defaults={"version": "1.0", "status": "ACTIVE",
                      "notes": "GPT 239364-01 Bill of Materials"},
        )
        if bom.status != "ACTIVE":
            bom.status = "ACTIVE"
            bom.save(update_fields=["status"])
        self.stdout.write(f"  BOM #{bom.id} ({'created' if _ else 'already exists'})")

        for pn_code, mat_name, qty in BOM_MATERIALS:
            try:
                part = PartNumber.objects.get(part_number=pn_code)
                # Create as a material if needed, or reference directly
                mat, _ = Material.objects.get_or_create(
                    code="MAT-" + pn_code,
                    defaults={
                        "name": mat_name,
                        "description": f"Material: {part.description}",
                        "material_state": "RAW_MATERIAL",
                        "status": "ACTIVE",
                    },
                )
                item, item_created = BOMItem.objects.get_or_create(
                    bom=bom, material=mat,
                    defaults={"quantity": qty, "scrap_factor": 0.05},
                )
                if item_created:
                    self.stdout.write(f"  BOM Item: {mat.code} x {qty}")
            except PartNumber.DoesNotExist:
                self.stdout.write(f"  WARNING: Part number {pn_code} not found, skipping BOM item")

        self.stdout.write(f"  BOM #{bom.id} has {BOMItem.objects.filter(bom=bom).count()} items")

        # ── 7. Create production line ──
        self.stdout.write("\n[7/10] Creating production line...")
        existing = ProductionLine.objects.filter(plant=plant, code="GPT").exclude(status="ARCHIVED").first()
        if existing:
            line = existing
            self.stdout.write(f"  GPT line already exists (ID={line.id}, status={line.status})")
        else:
            line, created = ProductionLine.objects.get_or_create(
                plant=plant, code="GPT",
                defaults={
                    "name": "GPT Production Line",
                    "description": "GPT line for model BMR - Variant 239364-01",
                    "status": "ACTIVE",
                },
            )
            if not created:
                line.status = "ACTIVE"
                line.save(update_fields=["status", "updated_at"])
            self.stdout.write(f"  {'Created' if created else 'Reactivated'} GPT line (ID={line.id})")

        # ── 8. Assign RGs, create routing, process flow ──
        self.stdout.write("\n[8/10] Assigning RGs, creating routing and process flow...")

        # Assign RGs to line in sequence
        rg_sequence = [
            "MCH-CNC", "MCH-MAN", "WLD-ROB", "WLD-MAN",
            "COT-PDR", "COT-PNT", "PIP-CUT", "PIP-BND",
            "KIT-MAT", "KIT-STG", "HRS-WIRE", "HRS-CBL",
            "ASM-MAIN", "ASM-SUB", "PKG-FINAL", "PKG-LBL",
        ]
        # Clear existing assignments to avoid unique constraint conflicts
        ProductionLineResourceGroup.objects.filter(production_line=line).delete()
        for seq, rg_code in enumerate(rg_sequence, start=1):
            rg = rg_map.get(rg_code)
            if not rg:
                continue
            ProductionLineResourceGroup.objects.create(
                production_line=line, resource_group=rg,
                sequence=seq, is_active=True,
            )
        self.stdout.write(f"  Assigned {len(rg_sequence)} RGs to production line")

        # Create routing
        routing, _ = Routing.objects.get_or_create(
            production_line=line, product_model=gpt_model,
            defaults={
                "version": "1.0", "status": RoutingStatus.DRAFT,
                "notes": "GPT routing: Machining > Welding > Coating > Pipes > Kitting > Harnesses > Assembly > Packaging",
            },
        )
        RoutingStep.objects.filter(routing=routing).delete()

        step_defs = [
            ("MCH", "Machining - CNC Operations", 45.0),
            ("WLD", "Welding - Frame Assembly", 60.0),
            ("COT", "Coating - Surface Treatment", 30.0),
            ("PIP", "Pipes - Hydraulic Line Assembly", 35.0),
            ("KIT", "Kitting - Material Preparation", 20.0),
            ("HRS", "Harnesses - Electrical Assembly", 40.0),
            ("ASM", "Assembly - Final Product Assembly", 90.0),
            ("PKG", "Packaging - Final Packaging", 25.0),
        ]
        for i, (dc, sn, ct) in enumerate(step_defs, start=1):
            dept = dept_map.get(dc)
            first_rg_code = RESOURCE_GROUPS.get(dc, [{}])[0].get("code", "")
            rg = rg_map.get(first_rg_code)
            RoutingStep.objects.create(
                routing=routing, sequence=i, department=dept, resource_group=rg,
                cycle_time_sec=int(ct * 60), setup_time_sec=300,
                changeover_time_sec=600, required_operators=2,
                schedule_source="LINE",
                notes=f"Step {i}: {sn}",
            )

        routing.status = RoutingStatus.ACTIVE
        routing.save(update_fields=["status"])
        self.stdout.write(f"  Routing active with {RoutingStep.objects.filter(routing=routing).count()} steps")

        # Create process flow
        flow, _ = ProcessFlow.objects.get_or_create(
            code="GPT-FLOW-001",
            defaults={
                "name": "GPT Production Flow - 239364-01",
                "description": "Standard flow for GPT variant 239364-01",
                "product_model": gpt_model, "production_line": line,
                "version": "1.0", "status": "ACTIVE",
            },
        )
        ProcessStep.objects.filter(process_flow=flow).delete()
        for i, (dc, sn, desc) in enumerate([
            ("MCH", "Machining", "Machine frame components"),
            ("WLD", "Welding", "Weld frame assembly"),
            ("COT", "Coating", "Apply powder coating"),
            ("PIP", "Pipes", "Assemble hydraulic pipes"),
            ("KIT", "Kitting", "Kit materials"),
            ("HRS", "Harnesses", "Route wire harnesses"),
            ("ASM", "Assembly", "Final assembly"),
            ("PKG", "Packaging", "Package and label"),
        ], start=1):
            dept = dept_map.get(dc)
            ProcessStep.objects.create(
                process_flow=flow, sequence=i, name=sn,
                description=desc, entity_type="DEPARTMENT",
                entity_id=str(dept.id) if dept else "",
                lead_time_minutes=60, status="ACTIVE",
            )

        # ── 9. Create material bins ──
        self.stdout.write("\n[9/10] Creating material bins...")
        if warehouse:
            bin_defs = [
                ("MCH-CNC", "BIN-MCH-INPUT-01", "CNC Input - Raw Steel", "INPUT", 2000),
                ("MCH-CNC", "BIN-MCH-OUTPUT-01", "CNC Output - Machined Parts", "OUTPUT", 1500),
                ("MCH-MAN", "BIN-MCH-MAN-IN", "Manual Input - Raw Stock", "INPUT", 1000),
                ("MCH-MAN", "BIN-MCH-MAN-OUT", "Manual Output - Finished Parts", "OUTPUT", 800),
                ("WLD-ROB", "BIN-WLD-ROB-IN", "Welding Input - Components", "INPUT", 1200),
                ("WLD-ROB", "BIN-WLD-ROB-OUT", "Welding Output - Assemblies", "OUTPUT", 1000),
                ("WLD-MAN", "BIN-WLD-MAN-IN", "Manual Weld Input", "INPUT", 800),
                ("WLD-MAN", "BIN-WLD-MAN-OUT", "Manual Weld Output", "OUTPUT", 600),
                ("COT-PDR", "BIN-COT-PDR-IN", "Coating Input - Parts", "INPUT", 900),
                ("COT-PDR", "BIN-COT-PDR-OUT", "Coating Output - Finished", "OUTPUT", 700),
                ("COT-PNT", "BIN-COT-PNT-IN", "Paint Input", "INPUT", 500),
                ("COT-PNT", "BIN-COT-PNT-OUT", "Paint Output", "OUTPUT", 400),
                ("PIP-CUT", "BIN-PIP-CUT-IN", "Pipe Cutting Input", "INPUT", 1000),
                ("PIP-CUT", "BIN-PIP-CUT-OUT", "Pipe Cutting Output", "OUTPUT", 800),
                ("PIP-BND", "BIN-PIP-BND-IN", "Pipe Bending Input", "INPUT", 600),
                ("PIP-BND", "BIN-PIP-BND-OUT", "Pipe Bending Output", "OUTPUT", 500),
                ("KIT-MAT", "BIN-KIT-MAT", "Kitting Materials", "SUPERMARKET", 2000),
                ("KIT-STG", "BIN-KIT-STG", "Kit Staging Area", "WIP", 1500),
                ("HRS-WIRE", "BIN-HRS-WIRE-IN", "Harness Input - Wires/Connectors", "INPUT", 800),
                ("HRS-WIRE", "BIN-HRS-WIRE-OUT", "Harness Output - Completed", "OUTPUT", 600),
                ("HRS-CBL", "BIN-HRS-CBL-IN", "Cable Assembly Input", "INPUT", 500),
                ("HRS-CBL", "BIN-HRS-CBL-OUT", "Cable Assembly Output", "OUTPUT", 400),
                ("ASM-MAIN", "BIN-ASM-MAIN-IN", "Main Assembly Input", "INPUT", 1000),
                ("ASM-MAIN", "BIN-ASM-MAIN-OUT", "Main Assembly Output - WIP", "WIP", 800),
                ("ASM-SUB", "BIN-ASM-SUB-IN", "Sub Assembly Input", "INPUT", 600),
                ("ASM-SUB", "BIN-ASM-SUB-OUT", "Sub Assembly Output", "OUTPUT", 500),
                ("PKG-FINAL", "BIN-PKG-FINAL-IN", "Packaging Input", "INPUT", 700),
                ("PKG-FINAL", "BIN-PKG-FINAL-OUT", "Finished Goods - FG", "FG", 900),
                ("PKG-LBL", "BIN-PKG-LBL-IN", "Labeling Input", "INPUT", 300),
                ("PKG-LBL", "BIN-PKG-LBL-OUT", "Labeling Output", "OUTPUT", 250),
            ]
            for rg_code, bin_code, bin_name, bin_type, capacity in bin_defs:
                rg = rg_map.get(rg_code)
                if not rg:
                    continue
                MaterialBin.objects.get_or_create(
                    plant=plant, code=bin_code,
                    defaults={
                        "name": bin_name,
                        "description": f"{bin_name} for {rg.name}",
                        "bin_type": bin_type,
                        "resource_group": rg,
                        "production_line": line,
                        "capacity": capacity,
                        "warehouse": warehouse,
                        "replenishment_mode": "PULL",
                        "is_active": True,
                    },
                )
            self.stdout.write(f"  Created {len(bin_defs)} material bins for warehouse {warehouse.code}")
        else:
            self.stdout.write("  Skipping bins - no warehouse found")

        # ── 10. Assign departments to production line ──
        self.stdout.write("\n[10/10] Assigning departments to production line...")
        for seq, (dept_code, dept) in enumerate(dept_map.items(), start=1):
            ProductionLineDepartmentAssignment.objects.get_or_create(
                production_line=line, department=dept,
                defaults={"sequence": seq * 10, "status": "ACTIVE", "plant": plant},
            )
        self.stdout.write(f"  Assigned {len(dept_map)} departments to production line")

        # ── Summary ──
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("  SEED COMPLETE - GPT LINE READY"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  Plant:          {plant.name} ({plant.code})")
        self.stdout.write(f"  Departments:    {Department.objects.filter(plant=plant).count()}")
        self.stdout.write(f"  Resource Groups: {ResourceGroup.objects.filter(department__plant=plant).count()}")
        self.stdout.write(f"  Resources:      {Resource.objects.filter(resource_group__department__plant=plant).count()}")
        self.stdout.write(f"  Variant:        239364-01 for GPT model")
        self.stdout.write(f"  Part Numbers:   {PartNumber.objects.filter(model=gpt_model, variant=variant).count()}")
        self.stdout.write(f"  BOM Items:      {BOMItem.objects.filter(bom=bom).count()}")
        self.stdout.write(f"  Production Line: {line.name} ({line.code}) - {line.status}")
        self.stdout.write(f"  Routing Steps:  {RoutingStep.objects.filter(routing=routing).count()}")
        self.stdout.write(f"  RG Assignments: {ProductionLineResourceGroup.objects.filter(production_line=line).count()}")
        self.stdout.write(f"  Material Bins:  {MaterialBin.objects.filter(plant=plant, production_line=line).count()}")
        self.stdout.write(self.style.SUCCESS("=" * 60))
