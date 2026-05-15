from django.core.management.base import BaseCommand
from manufacturing.models import ReferenceCategory, ReferenceValue


CATEGORIES = {
    "role_category": {"name": "Role Category", "description": "Categories for staff roles in the production organization."},
    "role": {"name": "Role", "description": "Standard roles used in production and support functions."},
    "skill_type": {"name": "Skill Type", "description": "Skills that operators and technicians can be certified in."},
    "shift_team": {"name": "Shift Team", "description": "Named shift teams for production scheduling."},
    "status": {"name": "Entity Status", "description": "Standard lifecycle statuses for production entities."},
    "priority": {"name": "Priority", "description": "Priority levels for tasks, issues, and improvements."},
    "lean_value": {"name": "Lean / Quality Value", "description": "Core lean manufacturing principles and quality values."},
    "downtime_reason": {"name": "Downtime Reason", "description": "Root causes for production downtime events."},
    "defect_type": {"name": "Defect Type", "description": "Categories of quality defects found during inspection."},
    "maintenance_type": {"name": "Maintenance Type", "description": "Types of maintenance work orders and activities."},
    "material_flow_type": {"name": "Material Flow Type", "description": "Categories for material movement and inventory staging."},
    "process_type": {"name": "Process Type", "description": "Types of manufacturing and support processes."},
    "label_badge": {"name": "Label / Badge", "description": "Visual labels used to classify operational records and workflow state."},
}

ROLE_CATEGORIES = [
    ("production", "Production", "Shop-floor execution, supervision, and output ownership.", 10),
    ("quality", "Quality", "Inspection, defects, containment, and approval workflows.", 20),
    ("maintenance", "Maintenance", "Equipment reliability, downtime response, and preventive maintenance.", 30),
    ("logistics", "Logistics", "Internal movement, shipping, receiving, and material coordination.", 40),
    ("warehouse", "Warehouse", "Storage, inventory, picking, staging, and replenishment.", 50),
    ("engineering", "Engineering", "Process design, routing, standards, and technical support.", 60),
    ("lean_ci", "Lean / CI", "Kaizen, VSM, waste reduction, and continuous improvement.", 70),
    ("ehs_safety", "EHS / Safety", "Safety checks, incidents, compliance, and risk controls.", 80),
    ("administration", "Administration", "System setup, master data, and user administration.", 90),
]

ROLES = [
    ("plant_manager", "Plant Manager", "Owns plant-level performance, approvals, and escalation.", "administration", 10),
    ("production_manager", "Production Manager", "Owns production execution across lines.", "production", 20),
    ("line_supervisor", "Line Supervisor", "Owns daily line execution, staffing, and escalation.", "production", 30),
    ("team_leader", "Team Leader", "Coordinates operators and shift execution.", "production", 40),
    ("operator", "Operator", "Executes standard work and reports production activity.", "production", 50),
    ("quality_manager", "Quality Manager", "Owns quality systems, approvals, and containment decisions.", "quality", 60),
    ("quality_inspector", "Quality Inspector", "Performs inspections and records defects.", "quality", 70),
    ("maintenance_manager", "Maintenance Manager", "Owns maintenance planning and reliability.", "maintenance", 80),
    ("maintenance_tech", "Maintenance Technician", "Performs repairs, PM, and downtime response.", "maintenance", 90),
    ("planner", "Planner / Scheduler", "Builds production plans, shift schedules, and capacity plans.", "production", 100),
    ("warehouse_op", "Warehouse Operator", "Executes picking, staging, receiving, and inventory movement.", "warehouse", 110),
    ("logistics_coordinator", "Logistics Coordinator", "Coordinates material flow and shipments.", "logistics", 120),
    ("process_engineer", "Process Engineer", "Maintains routings, standards, cycle times, and process parameters.", "engineering", 130),
    ("industrial_engineer", "Industrial Engineer", "Owns time studies, line balance, capacity, and labor standards.", "engineering", 140),
    ("lean_coordinator", "Lean / CI Specialist", "Owns kaizen, VSM, waste tracking, and improvement routines.", "lean_ci", 150),
    ("ehs_specialist", "EHS / Safety Specialist", "Owns safety observations, incidents, and compliance tasks.", "ehs_safety", 160),
    ("system_admin", "System Admin", "Owns users, permissions, reference tables, and system setup.", "administration", 170),
    ("viewer", "Viewer", "Read-only user for reporting and review.", "administration", 180),
]

SKILL_TYPES = [
    ("std_work_cert", "Standard Work Certified", "Certified to execute standard work without supervision.", 10),
    ("machine_op", "Machine Operation", "Qualified to operate production machinery.", 20),
    ("setup_cco", "Setup / Changeover", "Trained to perform equipment setup and changeover.", 30),
    ("quality_inspection", "Quality Inspection", "Certified to perform in-process and final inspections.", 40),
    ("material_handling", "Material Handling", "Trained in safe material movement and handling.", 50),
    ("maintenance_basic", "Maintenance Basic", "Able to perform basic maintenance and minor repairs.", 60),
    ("troubleshooting", "Troubleshooting", "Skilled in diagnosing and resolving process issues.", 70),
    ("forklift_op", "Forklift Operation", "Licensed forklift operator.", 80),
    ("safety_loto", "Safety / LOTO", "Trained in lockout/tagout and safety procedures.", 90),
    ("s_5s", "5S", "Trained in 5S workplace organization methodology.", 100),
    ("kaizen", "Kaizen", "Trained in continuous improvement and kaizen events.", 110),
    ("problem_solving", "Problem Solving", "Skilled in root cause analysis and structured problem solving.", 120),
    ("welding", "Welding", "Certified welder for production and repair work.", 130),
    ("cnc_op", "CNC Operation", "Qualified to set up and operate CNC equipment.", 140),
    ("assembly", "Assembly", "Skilled in mechanical and electrical assembly.", 150),
    ("packing", "Packing", "Trained in finished goods packing and labeling.", 160),
    ("kitting", "Kitting", "Skilled in material kitting and line-side replenishment.", 170),
]

SHIFT_TEAMS = [
    ("a_shift", "A Shift", "Primary day shift team covering morning production.", 10),
    ("b_shift", "B Shift", "Secondary afternoon shift team.", 20),
    ("c_shift", "C Shift", "Night shift team covering overnight production.", 30),
    ("weekend", "Weekend Shift", "Weekend production coverage team.", 40),
    ("day", "Day Shift", "Standard daytime operating hours.", 50),
    ("night", "Night Shift", "Standard overnight operating hours.", 60),
    ("relief", "Relief Team", "Covers breaks, absences, and rotating relief.", 70),
    ("training", "Training Team", "Dedicated to onboarding and skills training.", 80),
]

STATUSES = [
    ("active", "Active", "Available for selection and operational use.", 10, False),
    ("inactive", "Inactive", "Hidden from new selections but retained for history.", 20, False),
    ("draft", "Draft", "Created but not approved for operational use.", 30, False),
    ("pending_approval", "Pending Approval", "Awaiting review before activation.", 40, False),
    ("archived", "Archived", "Retained for audit and history only.", 50, False),
    ("locked", "Locked", "System-managed record protected from editing.", 60, True),
]

PRIORITIES = [
    ("critical", "Critical", "Immediate action required; production or customer impact.", 10),
    ("high", "High", "Needs urgent attention within the shift or day.", 20),
    ("medium", "Medium", "Planned action required within the week.", 30),
    ("low", "Low", "Non-urgent improvement or cleanup task.", 40),
    ("monitor", "Monitor", "Observe trend before determining action.", 50),
]

LEAN_VALUES = [
    ("safety", "Safety", "Prioritizing hazard-free work environment and risk reduction.", 10),
    ("quality", "Quality", "Building quality into every process; zero defects mindset.", 20),
    ("delivery", "Delivery", "Meeting customer demand on time, every time.", 30),
    ("cost", "Cost", "Reducing waste to deliver value at lowest cost.", 40),
    ("morale", "Morale", "Engaged, respected, and empowered workforce.", 50),
    ("s_5s", "5S", "Workplace organization: Sort, Set, Shine, Standardize, Sustain.", 60),
    ("kaizen", "Kaizen", "Continuous incremental improvement driven by every employee.", 70),
    ("std_work", "Standard Work", "Documented best practice for consistency and improvement baseline.", 80),
    ("visual_mgmt", "Visual Management", "Information displayed so status is evident at a glance.", 90),
    ("problem_solving", "Problem Solving", "Structured approach to identify and eliminate root causes.", 100),
    ("root_cause", "Root Cause Analysis", "Systematic method to find true cause of problems.", 110),
    ("gemba", "Gemba Walk", "Leader goes to the actual place to observe and engage.", 120),
    ("vsm", "VSM", "Value stream mapping to visualize and improve flow.", 130),
    ("andon", "Andon", "Visual signal system to raise attention to abnormalities.", 140),
    ("kanban", "Kanban", "Pull-based signaling system for material replenishment.", 150),
    ("smed", "SMED", "Single-minute exchange of die; rapid changeover methodology.", 160),
    ("tpm", "TPM", "Total productive maintenance; operator-led equipment care and reliability routines.", 170),
    ("poka_yoke", "Poka-Yoke", "Mistake-proofing devices to prevent defects.", 180),
    ("heijunka", "Heijunka", "Production leveling to smooth volume and mix.", 190),
    ("jidoka", "Jidoka", "Automation with human intelligence; stop-at-abnormality.", 200),
]

DOWNTIME_REASONS = [
    ("equip_failure", "Equipment Failure", "Machine or equipment breakdown requiring repair.", 10),
    ("changeover", "Changeover", "Scheduled product or tooling changeover.", 20),
    ("material_shortage", "Material Shortage", "Production stopped due to lack of required material.", 30),
    ("quality_hold", "Quality Hold", "Product held for quality review or containment.", 40),
    ("no_operator", "No Operator", "No qualified operator available to run the process.", 50),
    ("no_schedule", "No Schedule", "No production scheduled for this resource.", 60),
    ("waiting_maint", "Waiting for Maintenance", "Equipment requires maintenance before production can resume.", 70),
    ("tooling_issue", "Tooling Issue", "Tooling worn, broken, or not available.", 80),
    ("setup_adj", "Setup Adjustment", "Fine-tuning setup parameters after changeover.", 90),
    ("cleaning", "Cleaning", "Scheduled or event-driven cleaning of equipment or area.", 100),
    ("preventive_maint", "Preventive Maintenance", "Planned maintenance activity.", 110),
    ("engineering_trial", "Engineering Trial", "Process or product trial managed by engineering.", 120),
    ("safety_stop", "Safety Stop", "Production halted for safety incident or drill.", 130),
    ("power_utility", "Power / Utility Issue", "Loss of power, air, water, or other utility.", 140),
    ("blocked_downstream", "Blocked Downstream", "Downstream process cannot accept output.", 150),
    ("starved_upstream", "Starved Upstream", "Upstream process not supplying input.", 160),
]

DEFECT_TYPES = [
    ("dimensional", "Dimensional Defect", "Part dimension outside specification tolerance.", 10),
    ("surface", "Surface Defect", "Surface finish, scratch, or appearance defect.", 20),
    ("missing_comp", "Missing Component", "Required component not installed.", 30),
    ("wrong_comp", "Wrong Component", "Incorrect component installed in assembly.", 40),
    ("assembly_err", "Assembly Error", "Incorrect assembly sequence or orientation.", 50),
    ("weld_defect", "Weld Defect", "Weld porosity, crack, or incomplete fusion.", 60),
    ("coating_defect", "Coating Defect", "Coating thickness, adhesion, or coverage issue.", 70),
    ("labeling_err", "Labeling Error", "Incorrect or missing label on product or package.", 80),
    ("packaging_defect", "Packaging Defect", "Damaged or incorrect packaging.", 90),
    ("test_failure", "Test Failure", "Product failed functional test.", 100),
    ("leak_failure", "Leak Failure", "Product failed pressure or leak test.", 110),
    ("contamination", "Contamination", "Foreign material or contamination found on product.", 120),
    ("doc_error", "Documentation Error", "Incorrect or incomplete documentation with shipment.", 130),
    ("customer_return", "Customer Return", "Product returned by customer for quality issue.", 140),
]

MAINTENANCE_TYPES = [
    ("corrective", "Corrective Maintenance", "Unscheduled repair to restore failed equipment.", 10),
    ("preventive", "Preventive Maintenance", "Scheduled maintenance to prevent failure.", 20),
    ("predictive", "Predictive Maintenance", "Condition-based maintenance using monitoring data.", 30),
    ("autonomous", "Autonomous Maintenance", "Operator-led cleaning, inspection, and basic care.", 40),
    ("emergency", "Emergency Repair", "Immediate repair for critical production stop.", 50),
    ("planned_repair", "Planned Repair", "Non-emergency repair scheduled in advance.", 60),
    ("inspection", "Inspection", "Equipment inspection to assess condition.", 70),
    ("calibration", "Calibration", "Instrument calibration to maintain accuracy.", 80),
    ("lubrication", "Lubrication", "Scheduled lubrication of equipment components.", 90),
    ("cleaning_maint", "Cleaning", "Deep cleaning of equipment and work areas.", 100),
    ("tooling_maint", "Tooling Maintenance", "Repair or refurbishment of production tooling.", 110),
]

MATERIAL_FLOW_TYPES = [
    ("raw_material", "Raw Material", "Unprocessed material received from supplier.", 10),
    ("wip", "WIP", "Work-in-process moving between operations.", 20),
    ("finished_goods", "Finished Goods", "Completed product ready for shipment.", 30),
    ("kanban", "Kanban", "Pull-signaled material in a kanban loop.", 40),
    ("supermarket", "Supermarket", "Decoupled inventory buffer between processes.", 50),
    ("fifo_lane", "FIFO Lane", "First-in-first-out controlled material flow.", 60),
    ("replenishment", "Replenishment", "Material pulled to replenish line-side stock.", 70),
    ("internal_transfer", "Internal Transfer", "Material moved between internal locations.", 80),
    ("receiving", "Receiving", "Incoming material at receiving dock.", 90),
    ("shipping", "Shipping", "Outbound product at shipping dock.", 100),
    ("line_side", "Line-Side Stock", "Material staged at the point of use.", 110),
    ("safety_stock", "Safety Stock", "Buffer stock held for demand variability.", 120),
    ("scrap", "Scrap", "Material designated for disposal.", 130),
    ("rework", "Rework", "Material returned to process for correction.", 140),
]

PROCESS_TYPES = [
    ("machining", "Machining", "Material removal using cutting or grinding equipment.", 10),
    ("welding", "Welding", "Joining materials using heat or pressure.", 20),
    ("coating", "Coating", "Application of protective or decorative coating.", 30),
    ("assembly", "Assembly", "Joining components to create a finished product.", 40),
    ("inspection", "Inspection", "Verification of product conformance to specifications.", 50),
    ("testing", "Testing", "Functional test of product performance.", 60),
    ("packing", "Packing", "Packaging of finished goods for shipment.", 70),
    ("kitting", "Kitting", "Preparing material kits for production orders.", 80),
    ("material_handling_proc", "Material Handling", "Movement of materials between locations.", 90),
    ("maintenance_proc", "Maintenance", "Equipment upkeep and repair activities.", 100),
    ("changeover_proc", "Changeover", "Transitioning equipment between production runs.", 110),
    ("rework_proc", "Rework", "Corrective processing of non-conforming product.", 120),
    ("shipping_proc", "Shipping", "Preparation and loading of outbound shipments.", 130),
    ("receiving_proc", "Receiving", "Unloading and inspection of inbound materials.", 140),
]

LABEL_BADGES = [
    ("blocked", "Blocked", "Work is blocked and needs escalation before it can progress.", 10, True),
    ("at_risk", "At Risk", "Record or activity has risk that may affect safety, quality, delivery, or cost.", 20, True),
    ("on_track", "On Track", "Activity is progressing as expected against the current plan.", 30, True),
    ("needs_review", "Needs Review", "Record requires review or approval before operational use.", 40, True),
    ("new", "New", "Recently created record that has not yet been fully validated.", 50, True),
    ("hot", "Hot", "High-visibility item requiring frequent follow-up.", 60, True),
    ("kaizen", "Kaizen", "Continuous improvement opportunity or action.", 70, True),
    ("safety", "Safety", "Safety-related item requiring EHS awareness or control.", 80, True),
    ("quality", "Quality", "Quality-related item requiring inspection or containment awareness.", 90, True),
]


DATA = {
    "role_category": ROLE_CATEGORIES,
    "role": ROLES,
    "skill_type": SKILL_TYPES,
    "shift_team": SHIFT_TEAMS,
    "status": STATUSES,
    "priority": PRIORITIES,
    "lean_value": LEAN_VALUES,
    "downtime_reason": DOWNTIME_REASONS,
    "defect_type": DEFECT_TYPES,
    "maintenance_type": MAINTENANCE_TYPES,
    "material_flow_type": MATERIAL_FLOW_TYPES,
    "process_type": PROCESS_TYPES,
    "label_badge": LABEL_BADGES,
}


class Command(BaseCommand):
    help = "Seeds all lean manufacturing reference values with complete descriptions and usage context."

    def handle(self, *args, **options):
        for cat_code, cat_info in CATEGORIES.items():
            category, _ = ReferenceCategory.objects.update_or_create(
                code=cat_code,
                defaults={
                    "name": cat_info["name"],
                    "description": cat_info["description"],
                    "status": "ACTIVE",
                },
            )
            self.stdout.write(f"  Category: {cat_code} ({cat_info['name']})")

            rows = DATA.get(cat_code, [])
            for row in rows:
                code = row[0]
                name = row[1]
                desc = row[2]
                extra = {"metadata": {}}
                if cat_code == "role":
                    extra["metadata"]["category_code"] = row[3]
                    sort_order = row[4]
                    is_system_managed = False
                else:
                    sort_order = row[3] if len(row) > 3 else 0
                    is_system_managed = row[4] if len(row) > 4 and isinstance(row[4], bool) else False

                usage_context = f"Used in {cat_info['name'].lower()} selection across production structure and planning."

                ReferenceValue.objects.update_or_create(
                    category=category,
                    code=code,
                    defaults={
                        "name": name,
                        "description": desc,
                        "usage_context": usage_context,
                        "sort_order": sort_order,
                        "is_active": True,
                        "is_system_managed": is_system_managed,
                        "is_configurable": not is_system_managed,
                        "status": "ACTIVE",
                        **extra,
                    },
                )

        repaired = 0
        for value in ReferenceValue.objects.select_related("category").all():
            updates = {}
            if not (value.description or "").strip():
                updates["description"] = (
                    f"{value.name} reference value for {value.category.name.lower()} "
                    "used in manufacturing configuration and production operations."
                )
            if not (value.usage_context or "").strip():
                updates["usage_context"] = (
                    f"Used in {value.category.name.lower()} selection across production structure, "
                    "planning, execution, and reporting."
                )
            if value.is_system_managed and value.is_configurable:
                updates["is_configurable"] = False
            if updates:
                for field, field_value in updates.items():
                    setattr(value, field, field_value)
                value.save(update_fields=[*updates.keys(), "updated_at"])
                repaired += 1

        if repaired:
            self.stdout.write(f"Backfilled required reference metadata for {repaired} existing values.")

        self.stdout.write(self.style.SUCCESS(f"Seeded {sum(len(v) for v in DATA.values())} reference values across {len(CATEGORIES)} categories."))
