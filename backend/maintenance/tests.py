"""Tests for the maintenance domain."""

from django.test import TestCase
from datetime import date, datetime, timedelta

from maintenance.models import (
    MaintenanceWorkOrder,
    PreventiveMaintenancePlan,
    Breakdown,
    SparePart,
    SparePartUsage,
)
from maintenance.services import (
    WorkOrderService,
    PreventiveMaintenanceService,
    BreakdownService,
    SparePartService,
    MaintenanceDashboardService,
)
from maintenance.exceptions import (
    WorkOrderNotFoundError,
    PreventiveMaintenanceNotFoundError,
    BreakdownNotFoundError,
    SparePartNotFoundError,
    InvalidStatusTransitionError,
    MaintenanceValidationError,
    InvalidTargetError,
)
from maintenance.constants import (
    WORK_ORDER_TYPE_PREVENTIVE,
    WORK_ORDER_TYPE_CORRECTIVE,
    WORK_ORDER_TYPE_BREAKDOWN,
    WORK_ORDER_TYPE_INSPECTION,
    WORK_ORDER_TYPE_OTHER,
    WORK_ORDER_STATUS_OPEN,
    WORK_ORDER_STATUS_PLANNED,
    WORK_ORDER_STATUS_IN_PROGRESS,
    WORK_ORDER_STATUS_COMPLETED,
    WORK_ORDER_STATUS_CANCELLED,
    WORK_ORDER_PRIORITY_MEDIUM,
    WORK_ORDER_PRIORITY_HIGH,
    WORK_ORDER_PRIORITY_CRITICAL,
    PM_FREQUENCY_WEEKLY,
    PM_FREQUENCY_MONTHLY,
    PM_FREQUENCY_DAILY,
    PM_STATUS_ACTIVE,
    PM_STATUS_PAUSED,
    PM_STATUS_ARCHIVED,
    BREAKDOWN_SEVERITY_HIGH,
    BREAKDOWN_SEVERITY_CRITICAL,
    BREAKDOWN_STATUS_REPORTED,
    BREAKDOWN_STATUS_UNDER_REPAIR,
    BREAKDOWN_STATUS_REPAIRED,
    BREAKDOWN_STATUS_CLOSED,
    BREAKDOWN_STATUS_CANCELLED,
    SPARE_PART_STATUS_ACTIVE,
    SPARE_PART_STATUS_INACTIVE,
    SPARE_PART_STATUS_OBSOLETE,
    APPROVED_TARGET_TYPES,
)


# ──────────────────────────────────────────────
#  WorkOrder Tests
# ──────────────────────────────────────────────

class WorkOrderServiceTest(TestCase):
    def setUp(self):
        self.service = WorkOrderService()
        self.wo = self.service.create_work_order(
            title="Lubricate press brake",
            description="Monthly lubrication of press brake #3",
            work_order_type=WORK_ORDER_TYPE_PREVENTIVE,
            target_type="RESOURCE",
            target_id=42,
            priority=WORK_ORDER_PRIORITY_MEDIUM,
            requested_by="Maintenance Lead",
            assigned_to="Tech A",
        )

    def test_create_work_order(self):
        wo = self.service.create_work_order(
            title="Inspect conveyor belt",
            work_order_type=WORK_ORDER_TYPE_INSPECTION,
            target_type="RESOURCE",
            target_id=10,
        )
        self.assertIsNotNone(wo.id)
        self.assertTrue(wo.number.startswith("WO-"))
        self.assertEqual(wo.title, "Inspect conveyor belt")
        self.assertEqual(wo.status, WORK_ORDER_STATUS_OPEN)

    def test_create_work_order_rejects_empty_title(self):
        with self.assertRaises(MaintenanceValidationError):
            self.service.create_work_order(
                title="", work_order_type=WORK_ORDER_TYPE_CORRECTIVE,
                target_type="RESOURCE",
            )

    def test_create_work_order_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_work_order(
                title="Bad target", work_order_type=WORK_ORDER_TYPE_CORRECTIVE,
                target_type="INVALID",
            )

    def test_create_work_order_accepts_all_target_types(self):
        for t in APPROVED_TARGET_TYPES:
            wo = self.service.create_work_order(
                title=f"WO for {t}",
                work_order_type=WORK_ORDER_TYPE_OTHER,
                target_type=t,
                target_id=1,
            )
            self.assertEqual(wo.target_type, t)

    def test_update_work_order(self):
        updated = self.service.update_work_order(
            self.wo.id, title="Updated title", priority=WORK_ORDER_PRIORITY_HIGH,
        )
        self.assertEqual(updated.title, "Updated title")
        self.assertEqual(updated.priority, WORK_ORDER_PRIORITY_HIGH)

    def test_plan_work_order(self):
        planned = self.service.plan_work_order(
            self.wo.id,
            planned_start=datetime.now(),
            planned_end=datetime.now() + timedelta(days=3),
        )
        self.assertEqual(planned.status, WORK_ORDER_STATUS_PLANNED)

    def test_plan_cancelled_wo_fails(self):
        self.service.cancel_work_order(self.wo.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.plan_work_order(self.wo.id)

    def test_start_work_order(self):
        self.service.plan_work_order(self.wo.id)
        started = self.service.start_work_order(self.wo.id)
        self.assertEqual(started.status, WORK_ORDER_STATUS_IN_PROGRESS)
        self.assertIsNotNone(started.actual_start_date)

    def test_start_from_open_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_work_order(self.wo.id)

    def test_complete_work_order(self):
        self.service.plan_work_order(self.wo.id)
        self.service.start_work_order(self.wo.id)
        completed = self.service.complete_work_order(
            self.wo.id, completion_notes="Done", downtime_minutes=120,
        )
        self.assertEqual(completed.status, WORK_ORDER_STATUS_COMPLETED)
        self.assertEqual(completed.completion_notes, "Done")
        self.assertEqual(completed.downtime_minutes, 120)

    def test_complete_from_planned_fails(self):
        self.service.plan_work_order(self.wo.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_work_order(self.wo.id)

    def test_cancel_work_order(self):
        cancelled = self.service.cancel_work_order(self.wo.id)
        self.assertEqual(cancelled.status, WORK_ORDER_STATUS_CANCELLED)

    def test_cancel_completed_fails(self):
        self.service.plan_work_order(self.wo.id)
        self.service.start_work_order(self.wo.id)
        self.service.complete_work_order(self.wo.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_work_order(self.wo.id)

    def test_full_wo_lifecycle(self):
        wo = self.wo
        self.assertEqual(wo.status, WORK_ORDER_STATUS_OPEN)
        wo = self.service.plan_work_order(wo.id)
        self.assertEqual(wo.status, WORK_ORDER_STATUS_PLANNED)
        wo = self.service.start_work_order(wo.id)
        self.assertEqual(wo.status, WORK_ORDER_STATUS_IN_PROGRESS)
        wo = self.service.complete_work_order(wo.id, "All done")
        self.assertEqual(wo.status, WORK_ORDER_STATUS_COMPLETED)

    def test_list_work_orders(self):
        results = self.service.list_work_orders()
        self.assertGreaterEqual(len(results), 1)

    def test_list_work_orders_with_status_filter(self):
        results = self.service.list_work_orders({"status": WORK_ORDER_STATUS_OPEN})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_work_orders({"status": WORK_ORDER_STATUS_COMPLETED})
        self.assertEqual(len(results), 0)

    def test_get_work_order(self):
        wo = self.service.get_work_order(self.wo.id)
        self.assertIsNotNone(wo)
        self.assertEqual(wo.title, "Lubricate press brake")

    def test_get_nonexistent_wo(self):
        wo = self.service.get_work_order(99999)
        self.assertIsNone(wo)

    def test_get_nonexistent_wo_raises(self):
        with self.assertRaises(WorkOrderNotFoundError):
            self.service._get(99999)


# ──────────────────────────────────────────────
#  Preventive Maintenance Tests
# ──────────────────────────────────────────────

class PreventiveMaintenanceServiceTest(TestCase):
    def setUp(self):
        self.service = PreventiveMaintenanceService()
        self.pm = self.service.create_pm(
            title="Weekly conveyor inspection",
            description="Inspect all conveyors for wear",
            frequency=PM_FREQUENCY_WEEKLY,
            target_type="RESOURCE",
            target_id=5,
            interval_value=7,
            next_due_date=date.today(),
            assigned_to="Tech B",
        )

    def test_create_pm(self):
        pm = self.service.create_pm(
            title="Monthly filter replacement",
            frequency=PM_FREQUENCY_MONTHLY,
            target_type="RESOURCE",
            target_id=10,
        )
        self.assertIsNotNone(pm.id)
        self.assertTrue(pm.code.startswith("PM-"))
        self.assertEqual(pm.status, PM_STATUS_ACTIVE)

    def test_create_pm_rejects_empty_title(self):
        with self.assertRaises(MaintenanceValidationError):
            self.service.create_pm(
                title="", frequency=PM_FREQUENCY_DAILY, target_type="RESOURCE",
            )

    def test_create_pm_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.create_pm(
                title="Bad", frequency=PM_FREQUENCY_DAILY, target_type="INVALID",
            )

    def test_update_pm(self):
        updated = self.service.update_pm(self.pm.id, title="Updated PM")
        self.assertEqual(updated.title, "Updated PM")

    def test_activate_pm(self):
        self.service.pause_pm(self.pm.id)
        activated = self.service.activate_pm(self.pm.id)
        self.assertEqual(activated.status, PM_STATUS_ACTIVE)

    def test_activate_already_active_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.activate_pm(self.pm.id)

    def test_pause_pm(self):
        paused = self.service.pause_pm(self.pm.id)
        self.assertEqual(paused.status, PM_STATUS_PAUSED)

    def test_pause_archived_fails(self):
        self.service.archive_pm(self.pm.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.pause_pm(self.pm.id)

    def test_archive_pm(self):
        archived = self.service.archive_pm(self.pm.id)
        self.assertEqual(archived.status, PM_STATUS_ARCHIVED)

    def test_generate_work_order_from_pm(self):
        wo = self.service.generate_work_order(self.pm.id)
        self.assertIsNotNone(wo.id)
        self.assertTrue(wo.title.startswith("PM:"))
        self.assertEqual(wo.work_order_type, WORK_ORDER_TYPE_PREVENTIVE)
        self.assertEqual(wo.linked_pm_id, self.pm.id)
        self.assertEqual(wo.status, WORK_ORDER_STATUS_OPEN)

    def test_generate_wo_from_paused_pm_fails(self):
        self.service.pause_pm(self.pm.id)
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.generate_work_order(self.pm.id)

    def test_list_pms(self):
        results = self.service.list_pms()
        self.assertGreaterEqual(len(results), 1)

    def test_list_pms_with_status_filter(self):
        results = self.service.list_pms({"status": PM_STATUS_ACTIVE})
        self.assertGreaterEqual(len(results), 1)
        results = self.service.list_pms({"status": PM_STATUS_ARCHIVED})
        self.assertEqual(len(results), 0)

    def test_due_pms(self):
        results = self.service.due_pms()
        self.assertGreaterEqual(len(results), 1)

    def test_get_pm(self):
        pm = self.service.get_pm(self.pm.id)
        self.assertIsNotNone(pm)

    def test_get_nonexistent_pm_raises(self):
        with self.assertRaises(PreventiveMaintenanceNotFoundError):
            self.service._get(99999)


# ──────────────────────────────────────────────
#  Breakdown Tests
# ──────────────────────────────────────────────

class BreakdownServiceTest(TestCase):
    def setUp(self):
        self.service = BreakdownService()
        self.bd = self.service.report_breakdown(
            title="Press brake #3 hydraulic failure",
            description="Hydraulic fluid leak on press brake #3",
            target_type="RESOURCE",
            target_id=42,
            severity=BREAKDOWN_SEVERITY_HIGH,
            reported_by="Operator A",
        )

    def test_report_breakdown(self):
        bd = self.service.report_breakdown(
            title="Conveyor motor overheating",
            target_type="RESOURCE",
            target_id=10,
        )
        self.assertIsNotNone(bd.id)
        self.assertTrue(bd.number.startswith("BD-"))
        self.assertEqual(bd.status, BREAKDOWN_STATUS_REPORTED)

    def test_report_breakdown_rejects_empty_title(self):
        with self.assertRaises(MaintenanceValidationError):
            self.service.report_breakdown(
                title="", target_type="RESOURCE",
            )

    def test_report_breakdown_rejects_invalid_target(self):
        with self.assertRaises(InvalidTargetError):
            self.service.report_breakdown(
                title="Bad", target_type="INVALID",
            )

    def test_update_breakdown(self):
        updated = self.service.update_breakdown(
            self.bd.id, severity=BREAKDOWN_SEVERITY_CRITICAL,
        )
        self.assertEqual(updated.severity, BREAKDOWN_SEVERITY_CRITICAL)

    def test_start_repair(self):
        started = self.service.start_repair(self.bd.id)
        self.assertEqual(started.status, BREAKDOWN_STATUS_UNDER_REPAIR)
        self.assertIsNotNone(started.repair_started_at)

    def test_start_repair_from_repaired_fails(self):
        self.service.start_repair(self.bd.id)
        self.service.complete_repair(self.bd.id, "Fixed")
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.start_repair(self.bd.id)

    def test_complete_repair(self):
        self.service.start_repair(self.bd.id)
        import time
        time.sleep(0.01)  # Ensure some time passes for downtime calc
        completed = self.service.complete_repair(
            self.bd.id, repair_summary="Replaced seal",
            root_cause="Worn seal gasket",
        )
        self.assertEqual(completed.status, BREAKDOWN_STATUS_REPAIRED)
        self.assertEqual(completed.repair_summary, "Replaced seal")
        self.assertEqual(completed.root_cause, "Worn seal gasket")
        self.assertIsNotNone(completed.downtime_minutes)

    def test_complete_repair_from_reported_fails(self):
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.complete_repair(self.bd.id, "Fixed")

    def test_close_breakdown(self):
        self.service.start_repair(self.bd.id)
        self.service.complete_repair(self.bd.id, "Fixed")
        closed = self.service.close_breakdown(self.bd.id)
        self.assertEqual(closed.status, BREAKDOWN_STATUS_CLOSED)

    def test_cancel_breakdown(self):
        cancelled = self.service.cancel_breakdown(self.bd.id)
        self.assertEqual(cancelled.status, BREAKDOWN_STATUS_CANCELLED)

    def test_cancel_repaired_fails(self):
        self.service.start_repair(self.bd.id)
        self.service.complete_repair(self.bd.id, "Fixed")
        with self.assertRaises(InvalidStatusTransitionError):
            self.service.cancel_breakdown(self.bd.id)

    def test_create_work_order_from_breakdown(self):
        wo = self.service.create_work_order(self.bd.id, assigned_to="Tech C")
        self.assertIsNotNone(wo.id)
        self.assertTrue(wo.title.startswith("Repair:"))
        self.assertEqual(wo.work_order_type, WORK_ORDER_TYPE_BREAKDOWN)
        self.assertEqual(wo.linked_breakdown_id, self.bd.id)
        # Verify breakdown is linked back
        bd_refreshed = self.service.get_breakdown(self.bd.id)
        self.assertEqual(bd_refreshed.linked_work_order_id, wo.id)

    def test_full_breakdown_lifecycle(self):
        bd = self.bd
        self.assertEqual(bd.status, BREAKDOWN_STATUS_REPORTED)
        bd = self.service.start_repair(bd.id)
        self.assertEqual(bd.status, BREAKDOWN_STATUS_UNDER_REPAIR)
        bd = self.service.complete_repair(bd.id, "Fixed")
        self.assertEqual(bd.status, BREAKDOWN_STATUS_REPAIRED)
        bd = self.service.close_breakdown(bd.id)
        self.assertEqual(bd.status, BREAKDOWN_STATUS_CLOSED)

    def test_list_breakdowns(self):
        results = self.service.list_breakdowns()
        self.assertGreaterEqual(len(results), 1)

    def test_get_nonexistent_breakdown_raises(self):
        with self.assertRaises(BreakdownNotFoundError):
            self.service._get(99999)

    def test_downtime_calculation(self):
        self.service.start_repair(self.bd.id)
        import time
        time.sleep(0.02)
        self.service.complete_repair(self.bd.id, "Done")
        bd = self.service.get_breakdown(self.bd.id)
        self.assertIsNotNone(bd.downtime_minutes)


# ──────────────────────────────────────────────
#  Spare Part Tests
# ──────────────────────────────────────────────

class SparePartServiceTest(TestCase):
    def setUp(self):
        self.service = SparePartService()
        self.part = self.service.create_spare_part(
            part_number="HYD-SEAL-001",
            name="Hydraulic Seal Kit",
            description="Seal kit for press brake hydraulics",
            category="Seals",
            uom="EA",
            min_quantity=5,
            quantity_on_hand=10,
            storage_location="Aisle 3, Bin 12",
        )

    def test_create_spare_part(self):
        sp = self.service.create_spare_part(
            part_number="FILTER-002",
            name="Oil Filter",
            quantity_on_hand=20,
        )
        self.assertIsNotNone(sp.id)
        self.assertEqual(sp.part_number, "FILTER-002")
        self.assertEqual(sp.status, SPARE_PART_STATUS_ACTIVE)

    def test_create_spare_part_rejects_empty_part_number(self):
        with self.assertRaises(MaintenanceValidationError):
            self.service.create_spare_part(part_number="", name="Test")

    def test_create_spare_part_rejects_empty_name(self):
        with self.assertRaises(MaintenanceValidationError):
            self.service.create_spare_part(part_number="TEST", name="")

    def test_update_spare_part(self):
        updated = self.service.update_spare_part(
            self.part.id, name="Updated Seal Kit",
        )
        self.assertEqual(updated.name, "Updated Seal Kit")

    def test_adjust_quantity_positive(self):
        part = self.service.adjust_quantity(self.part.id, 5)
        self.assertEqual(part.quantity_on_hand, 15)

    def test_adjust_quantity_negative(self):
        part = self.service.adjust_quantity(self.part.id, -3)
        self.assertEqual(part.quantity_on_hand, 7)

    def test_adjust_quantity_below_zero(self):
        part = self.service.adjust_quantity(self.part.id, -100)
        self.assertEqual(part.quantity_on_hand, 0)

    def test_record_usage(self):
        wo_svc = WorkOrderService()
        wo = wo_svc.create_work_order(
            title="Test WO", work_order_type=WORK_ORDER_TYPE_CORRECTIVE,
            target_type="RESOURCE",
        )
        usage = self.service.record_usage(
            self.part.id, wo.id, quantity=3, used_by="Tech A",
        )
        self.assertIsNotNone(usage.id)
        self.assertEqual(usage.quantity, 3)
        self.assertEqual(usage.used_by, "Tech A")
        # Verify stock decreased
        part = self.service.get_spare_part(self.part.id)
        self.assertEqual(part.quantity_on_hand, 7)

    def test_record_usage_insufficient_stock_fails(self):
        wo_svc = WorkOrderService()
        wo = wo_svc.create_work_order(
            title="Test WO", work_order_type=WORK_ORDER_TYPE_CORRECTIVE,
            target_type="RESOURCE",
        )
        with self.assertRaises(MaintenanceValidationError):
            self.service.record_usage(self.part.id, wo.id, quantity=100)

    def test_record_usage_zero_quantity_fails(self):
        wo_svc = WorkOrderService()
        wo = wo_svc.create_work_order(
            title="Test WO", work_order_type=WORK_ORDER_TYPE_CORRECTIVE,
            target_type="RESOURCE",
        )
        with self.assertRaises(MaintenanceValidationError):
            self.service.record_usage(self.part.id, wo.id, quantity=0)

    def test_mark_inactive(self):
        part = self.service.mark_inactive(self.part.id)
        self.assertEqual(part.status, SPARE_PART_STATUS_INACTIVE)

    def test_mark_obsolete(self):
        part = self.service.mark_obsolete(self.part.id)
        self.assertEqual(part.status, SPARE_PART_STATUS_OBSOLETE)

    def test_list_spare_parts(self):
        results = self.service.list_spare_parts()
        self.assertGreaterEqual(len(results), 1)

    def test_low_stock_parts(self):
        # Create a part with low stock
        self.service.create_spare_part(
            part_number="LOW-001", name="Low Stock Item",
            min_quantity=10, quantity_on_hand=3,
        )
        results = self.service.low_stock_parts()
        self.assertGreaterEqual(len(results), 1)

    def test_get_nonexistent_part_raises(self):
        with self.assertRaises(SparePartNotFoundError):
            self.service._get(99999)


# ──────────────────────────────────────────────
#  Dashboard Tests
# ──────────────────────────────────────────────

class MaintenanceDashboardServiceTest(TestCase):
    def setUp(self):
        # Create some test data
        wo_svc = WorkOrderService()
        for i in range(3):
            wo_svc.create_work_order(
                title=f"Open WO {i}",
                work_order_type=WORK_ORDER_TYPE_CORRECTIVE,
                target_type="RESOURCE",
            )
        pm_svc = PreventiveMaintenanceService()
        pm_svc.create_pm(
            title="PM Due Today",
            frequency=PM_FREQUENCY_DAILY,
            target_type="RESOURCE",
            next_due_date=date.today(),
        )
        bd_svc = BreakdownService()
        bd_svc.report_breakdown(
            title="Active breakdown",
            target_type="RESOURCE",
        )

    def test_summary_returns_all_fields(self):
        svc = MaintenanceDashboardService()
        summary = svc.get_summary()
        self.assertIn("open_work_orders", summary)
        self.assertIn("overdue_work_orders", summary)
        self.assertIn("active_breakdowns", summary)
        self.assertIn("pm_due_this_week", summary)
        self.assertIn("completed_work_orders", summary)
        self.assertIn("total_downtime_minutes", summary)
        self.assertIn("low_stock_spare_parts", summary)

    def test_summary_counts(self):
        svc = MaintenanceDashboardService()
        summary = svc.get_summary()
        self.assertEqual(summary["open_work_orders"], 3)
        self.assertEqual(summary["active_breakdowns"], 1)
        self.assertEqual(summary["pm_due_this_week"], 1)


# ──────────────────────────────────────────────
#  No MER/Improvement Ownership Tests
# ──────────────────────────────────────────────

class MaintenanceBoundaryTest(TestCase):
    def test_models_do_not_own_mer_or_improvement(self):
        """
        Maintenance models must not own MER or Improvement models.
        They may link/reference them (e.g. linked_mer FK), but not own them.
        """
        import maintenance.models as models
        # Explicitly allowed FK references (maintenance may link to these)
        allowed_relations = {
            "MaintenanceWorkOrder": ["linked_mer"],
        }
        model_classes = [
            models.MaintenanceWorkOrder,
            models.PreventiveMaintenancePlan,
            models.Breakdown,
            models.SparePart,
            models.SparePartUsage,
        ]
        for cls in model_classes:
            for field in cls._meta.get_fields():
                if field.is_relation and field.related_model:
                    field_name = field.name
                    cls_name = cls.__name__
                    # Skip explicitly allowed relations
                    allowed = allowed_relations.get(cls_name, [])
                    if field_name in allowed:
                        continue
                    related_name = field.related_model.__name__
                    # Maintenance should not own Kaizen or Suggestion
                    self.assertNotIn(
                        "Kaizen", related_name,
                        f"{cls_name}.{field_name} references Kaizen",
                    )
                    self.assertNotIn(
                        "Suggestion", related_name,
                        f"{cls_name}.{field_name} references Suggestion",
                    )
