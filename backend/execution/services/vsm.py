"""VSM (Value Stream Map) services — chart builder + chart CRUD."""

from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from api.types.vsm import (
        VsmDiagramNode, VsmFlowLink, VsmInformationFlow,
        VsmInventoryNode, VsmProcessNode, VsmProductionControl,
        VsmTimelineEvent,
    )


class VsmDiagramBuilder:
    """Builds a VSM diagram from production line and routing data."""

    def build(
        self,
        line_id: str,
        product_variant_code: Optional[str] = None,
    ) -> Optional["VsmDiagramNode"]:
        from api.types.vsm import (
            VsmDiagramNode, VsmFlowLink, VsmInformationFlow,
            VsmInventoryNode, VsmProcessNode, VsmProductionControl,
            VsmTimelineEvent,
        )
        from manufacturing.models.production_line import ProductionLine
        from manufacturing.models.routing import Routing, RoutingStep

        try:
            line = ProductionLine.objects.select_related(
                "plant__company", "bottleneck_resource_group"
            ).get(id=line_id)
        except ProductionLine.DoesNotExist:
            return None

        routing = self._find_routing(line, product_variant_code)
        if not routing:
            return None

        steps = list(
            routing.steps.select_related("department", "resource_group").order_by("sequence")
        )
        if not steps:
            return None

        process_nodes = self._build_process_nodes(steps, line)
        inventory_nodes = self._build_inventory(steps, process_nodes)
        flow_links = self._build_flow_links(process_nodes, inventory_nodes)
        information_flows = self._build_information_flows(process_nodes)
        timeline = self._build_timeline(steps, process_nodes)

        total_lead = sum(e.wait_time_minutes + e.process_time_minutes for e in timeline)
        total_va = sum(e.process_time_minutes for e in timeline)

        pc = VsmProductionControl(
            id="PC-001",
            label="Production Control",
            scheduling_type=f"{line.name} · Kanban / Pull",
            scheduling_interval="Daily",
        )

        supplier_name = "RM Supply"
        customer_name = "FG Customer"
        product_name = self._get_product_name(routing)

        # Demand / takt — from production line or defaults
        demand_rate = getattr(line, "customer_demand_rate", None)
        avail_min = getattr(line, "available_minutes_per_shift", 450.0)
        shifts = getattr(line, "chart_shifts_per_day", 1)
        takt_sec = None
        if demand_rate and demand_rate > 0 and avail_min and avail_min > 0:
            takt_sec = round((avail_min * 60 * shifts) / demand_rate, 1)

        return VsmDiagramNode(
            line_id=str(line.id),
            line_name=line.name,
            product_name=product_name,
            process_nodes=process_nodes,
            inventory_nodes=inventory_nodes,
            flow_links=flow_links,
            information_flows=information_flows,
            production_control=pc,
            timeline=timeline,
            supplier_name=supplier_name,
            customer_name=customer_name,
            total_lead_time_minutes=round(total_lead, 1),
            total_value_add_minutes=round(total_va, 1),
            customer_demand_rate=demand_rate,
            available_minutes_per_shift=avail_min,
            chart_shifts_per_day=shifts,
            takt_time_seconds=takt_sec,
            last_updated_at=routing.updated_at.isoformat() if routing.updated_at else None,
        )

    def _find_routing(self, line, product_variant_code: Optional[str] = None):
        from manufacturing.models.routing import Routing, RoutingStatus
        qs = Routing.objects.filter(
            production_line=line,
            status=RoutingStatus.ACTIVE,
        ).select_related("product_model")
        if product_variant_code:
            from manufacturing.models.routing import PartNumber
            qs = qs.filter(part_number__code=product_variant_code)
        return qs.order_by("-created_at").first()

    def _get_product_name(self, routing) -> str:
        if routing.product_model:
            return f"{routing.product_model.name}"
        if routing.part_number:
            return f"Part {routing.part_number.part_number}"
        return "Standard Product"

    def _build_process_nodes(self, steps, line):
        from api.types.vsm import VsmProcessNode
        nodes = []
        for i, step in enumerate(steps):
            rg_name = step.resource_group.name if step.resource_group else "Unassigned"
            is_bn = False
            if line.bottleneck_resource_group_id and step.resource_group_id:
                is_bn = str(step.resource_group_id) == str(line.bottleneck_resource_group_id)
            if not is_bn and step.resource_group and step.resource_group.is_bottleneck:
                is_bn = True
            ct = step.cycle_time_sec or 30.0
            co = step.changeover_time_sec or 300.0
            uptime = 95.0
            operators = step.required_operators or 1
            wip_before = step.wip_min or 0
            wip_after = step.wip_max or int(wip_before * 1.5) or 50
            # Pacemaker is typically the first process after the schedule point.
            # In a derived diagram, the first active process is the pacemaker.
            is_pm = (i == 0)
            nodes.append(VsmProcessNode(
                id=f"PN-{i + 1:03d}",
                sequence=i + 1,
                label=step.department.name if step.department else step.resource_group.name if step.resource_group else f"Step {step.sequence}",
                resource_group_name=rg_name,
                cycle_time_seconds=float(ct),
                changeover_seconds=float(co),
                uptime_percent=float(uptime),
                operator_count=int(operators),
                wip_before=int(wip_before),
                wip_after=int(wip_after),
                defect_rate=None,
                is_bottleneck=is_bn,
                is_pacemaker=is_pm,
                is_active=True,
            ))
        return nodes

    def _build_inventory(self, steps, process_nodes):
        from api.types.vsm import VsmInventoryNode
        inventory = []
        inventory.append(VsmInventoryNode(id="INV-RM", label="Raw Materials", type="RM", quantity=500, days_of_inventory=3.0))
        for i in range(len(process_nodes) - 1):
            wip = process_nodes[i].wip_after
            inventory.append(VsmInventoryNode(
                id=f"INV-WIP-{i + 1}",
                label=f"WIP {process_nodes[i].label} → {process_nodes[i + 1].label}",
                type="WIP", quantity=max(wip, 20),
                days_of_inventory=round(max(wip, 20) / 100, 1),
            ))
        inventory.append(VsmInventoryNode(id="INV-FG", label="Finished Goods", type="FG", quantity=300, days_of_inventory=2.0))
        return inventory

    def _build_flow_links(self, process_nodes, inventory_nodes):
        from api.types.vsm import VsmFlowLink
        links = []
        inv_count = len(inventory_nodes)
        if inv_count > 0:
            links.append(VsmFlowLink(id="FL-SUP-RM", from_id="SUPPLIER", to_id=inventory_nodes[0].id, type="PUSH", label="Weekly delivery", delivery_frequency="Weekly"))
            links.append(VsmFlowLink(id="FL-RM-P1", from_id=inventory_nodes[0].id, to_id=process_nodes[0].id, type="FIFO", label="FIFO", delivery_frequency=""))
        for i in range(len(process_nodes)):
            inv_idx = i + 1
            if inv_idx < inv_count:
                links.append(VsmFlowLink(id=f"FL-P{i + 1}-INV{inv_idx}", from_id=process_nodes[i].id, to_id=inventory_nodes[inv_idx].id, type="PUSH", label="", delivery_frequency=""))
                if inv_idx < len(process_nodes):
                    links.append(VsmFlowLink(id=f"FL-INV{inv_idx}-P{inv_idx + 1}", from_id=inventory_nodes[inv_idx].id, to_id=process_nodes[inv_idx].id, type="PUSH", label="", delivery_frequency=""))
        last_inv = inventory_nodes[-1]
        last_proc = process_nodes[-1]
        links.append(VsmFlowLink(id=f"FL-P{len(process_nodes)}-FG", from_id=last_proc.id, to_id=last_inv.id, type="PUSH", label="", delivery_frequency=""))
        links.append(VsmFlowLink(id="FL-FG-CUST", from_id=last_inv.id, to_id="CUSTOMER", type="PULL", label="Ship daily", delivery_frequency="Daily"))
        return links

    def _build_information_flows(self, process_nodes):
        from api.types.vsm import VsmInformationFlow
        flows = []
        flows.append(VsmInformationFlow(id="IF-CUST-PC", from_id="CUSTOMER", to_id="PC-001", label="Customer demand", frequency="Daily", flow_style="ELECTRONIC", method="EDI", transmission_type="ELECTRONIC", trigger_type="CUSTOMER_ORDER", controlled_process_id="", notes=""))
        flows.append(VsmInformationFlow(id="IF-PC-SUP", from_id="PC-001", to_id="SUPPLIER", label="Release schedule", frequency="Weekly", flow_style="ELECTRONIC", method="ERP email", transmission_type="ELECTRONIC", trigger_type="RELEASE_SCHEDULE", controlled_process_id="", notes=""))
        if process_nodes:
            flows.append(VsmInformationFlow(id="IF-PC-P1", from_id="PC-001", to_id=process_nodes[0].id, label="Production schedule", frequency="Daily", flow_style="MANUAL", method="Dispatch list", transmission_type="MANUAL", trigger_type="PRODUCTION_SCHEDULE", controlled_process_id=process_nodes[0].id, notes=""))
        return flows

    def _build_timeline(self, steps, process_nodes):
        from api.types.vsm import VsmTimelineEvent
        events = []
        for i, pn in enumerate(process_nodes):
            wip = pn.wip_after or pn.wip_before or 50
            lead_min = max(wip * pn.cycle_time_seconds / 60, 3.0)
            va_min = max(pn.cycle_time_seconds / 60, 0.5)
            wait_min = max(lead_min - va_min, 1.0)
            events.append(VsmTimelineEvent(step_name=pn.label, process_time_minutes=round(va_min, 1), wait_time_minutes=round(wait_min, 1), is_bottleneck=pn.is_bottleneck))
        return events


# ── VSM Chart Service ──


class VsmChartService:
    """CRUD service for VSM Chart models."""

    # ── Chart CRUD ──

    def create_chart(self, input_data, user_id: Optional[str] = None):
        """Create a new VSM chart from GraphQL input."""
        from execution.models import VsmChart
        from manufacturing.models import Plant, ProductionLine, Department

        data = {}
        for f in ["name", "chart_type", "source_mode", "supplier_name",
                   "customer_name", "production_control_title", "control_method",
                   "schedule_frequency", "customer_demand_rate",
                   "customer_demand_period", "customer_demand_unit",
                   "available_minutes_per_shift", "chart_shifts_per_day",
                   "break_time_per_shift", "planned_downtime_per_shift",
                   "working_days_per_week"]:
            v = getattr(input_data, f, None)
            if v is not None:
                data[f] = v

        # Default values for optional fields
        if "supplier_name" not in data or not data["supplier_name"]:
            data["supplier_name"] = "RM Supply"
        if "customer_name" not in data or not data["customer_name"]:
            data["customer_name"] = "FG Customer"
        if "production_control_title" not in data or not data["production_control_title"]:
            data["production_control_title"] = "Production Control"
        if "control_method" not in data or not data["control_method"]:
            data["control_method"] = "Kanban / Pull"
        if "schedule_frequency" not in data or not data["schedule_frequency"]:
            data["schedule_frequency"] = "Daily"

        if input_data.plant_id:
            try:
                data["plant"] = Plant.objects.get(id=input_data.plant_id)
            except Plant.DoesNotExist:
                pass
        if input_data.production_line_id:
            try:
                data["production_line"] = ProductionLine.objects.get(id=input_data.production_line_id)
            except ProductionLine.DoesNotExist:
                pass
        if input_data.department_id:
            try:
                data["department"] = Department.objects.get(id=input_data.department_id)
            except Department.DoesNotExist:
                pass

        if user_id:
            from django.contrib.auth.models import User
            try:
                data["created_by"] = User.objects.get(id=user_id)
                data["updated_by"] = data["created_by"]
            except User.DoesNotExist:
                pass

        chart = VsmChart.objects.create(**data)
        return chart

    def update_chart(self, chart_id: str, input_data, user_id: Optional[str] = None):
        """Update an existing VSM chart."""
        from execution.models import VsmChart

        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None

        for f in ["name", "chart_type", "supplier_name", "customer_name",
                   "production_control_title", "control_method",
                   "schedule_frequency", "status", "customer_demand_rate",
                   "customer_demand_period", "customer_demand_unit",
                   "available_minutes_per_shift", "chart_shifts_per_day",
                   "break_time_per_shift", "planned_downtime_per_shift",
                   "working_days_per_week"]:
            v = getattr(input_data, f, None)
            if v is not None:
                setattr(chart, f, v)

        if user_id:
            from django.contrib.auth.models import User
            try:
                chart.updated_by = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        chart.save()
        return chart

    def update_demand_and_takt(self, chart_id: str, input_data) -> dict:
        """Update demand/takt parameters into dedicated VsmDemandTakt table.

        Validation rules:
        - demand_quantity > 0 if provided
        - available_work_time > 0 if provided
        - shifts_per_day > 0 if provided
        - takt calculated as: (available_production_time) / demand_per_day

        Returns dict with chart_id, demand_summary, takt_time_seconds,
        takt_status, and computed fields.
        """
        from execution.models import VsmChart, VsmDemandTakt

        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return {"errors": ["Chart not found"]}

        errors = []

        # Get or create the VsmDemandTakt record (one per chart)
        takt_record, created = VsmDemandTakt.objects.get_or_create(chart=chart)

        # Map input fields to VsmDemandTakt model fields
        demand_qty = getattr(input_data, "customer_demand_quantity", None)
        if demand_qty is not None:
            if demand_qty <= 0:
                errors.append("Demand quantity must be greater than 0")
            else:
                takt_record.customer_demand_rate = float(demand_qty)

        demand_unit = getattr(input_data, "customer_demand_unit", None)
        if demand_unit is not None:
            takt_record.customer_demand_unit = demand_unit

        demand_period = getattr(input_data, "customer_demand_period", None)
        if demand_period is not None:
            takt_record.customer_demand_period = demand_period

        avail_work = getattr(input_data, "available_work_time_per_shift", None)
        if avail_work is not None:
            if avail_work <= 0:
                errors.append("Available work time must be greater than 0")
            else:
                takt_record.available_minutes_per_shift = float(avail_work)

        break_time = getattr(input_data, "break_time_per_shift", None)
        if break_time is not None:
            takt_record.break_time_per_shift = float(break_time)

        downtime = getattr(input_data, "planned_downtime_per_shift", None)
        if downtime is not None:
            takt_record.planned_downtime_per_shift = float(downtime)

        shifts = getattr(input_data, "shifts_per_day", None)
        if shifts is not None:
            if shifts <= 0:
                errors.append("Shifts per day must be greater than 0")
            else:
                takt_record.chart_shifts_per_day = int(shifts)

        work_days = getattr(input_data, "working_days_per_week", None)
        if work_days is not None:
            takt_record.working_days_per_week = int(work_days)

        if errors:
            return {"errors": errors}

        takt_record.save()

        # Compute derived values from VsmDemandTakt fields
        demand_rate = takt_record.customer_demand_rate
        avail_min = takt_record.available_minutes_per_shift or 0
        break_min = takt_record.break_time_per_shift or 0
        downtime_min = takt_record.planned_downtime_per_shift or 0
        shifts_per_day = takt_record.chart_shifts_per_day or 1
        work_days_per_week = takt_record.working_days_per_week or 5

        net_avail_per_shift = max(0, avail_min - break_min - downtime_min)
        avail_per_day = net_avail_per_shift * shifts_per_day
        avail_per_week = avail_per_day * work_days_per_week

        period_days_map = {"day": 1, "shift": 1, "week": work_days_per_week, "month": work_days_per_week * 4}
        period_days = period_days_map.get(takt_record.customer_demand_period, 1)
        demand_per_day = demand_rate / period_days if demand_rate and period_days > 0 else None

        takt_sec = None
        takt_status = "ok"
        takt_missing_reason = None

        if demand_per_day and demand_per_day > 0 and avail_per_day > 0:
            takt_sec = round((avail_per_day * 60) / demand_per_day, 1)
            if takt_sec <= 0:
                takt_status = "not_calculated"
                takt_missing_reason = "Calculated takt is zero or negative"
        elif not demand_rate or demand_rate <= 0:
            takt_status = "missing_demand"
            takt_missing_reason = "Customer demand is not set"
        elif avail_per_day <= 0:
            takt_status = "missing_available_time"
            takt_missing_reason = "Available working time is zero or not configured"

        def fmt_minutes(m: float) -> str:
            h = int(m // 60)
            mn = int(m % 60)
            if h > 0 and mn > 0:
                return f"{h}h {mn}m/shift"
            elif h > 0:
                return f"{h}h/shift"
            return f"{mn}m/shift"

        demand_per_day_str = f"{demand_per_day:.0f}/{takt_record.customer_demand_period}" if demand_per_day else "—"
        takt_display = f"{takt_sec}s/unit" if takt_sec else "—"

        return {
            "chart_id": str(chart.id),
            "takt_time_seconds": takt_sec,
            "takt_time_display": takt_display,
            "takt_status": takt_status,
            "takt_missing_reason": takt_missing_reason,
            "demand_summary": demand_per_day_str,
            "demand_per_day": demand_per_day,
            "available_production_time_per_shift": fmt_minutes(net_avail_per_shift),
            "available_production_time_per_day": f"{avail_per_day:.0f} min/day",
            "available_production_time_seconds": avail_per_day * 60,
            "break_time_per_shift": break_min,
            "planned_downtime_per_shift": downtime_min,
            "shifts_per_day": shifts_per_day,
            "working_days_per_week": work_days_per_week,
        }

    def delete_chart(self, chart_id: str) -> bool:
        """Delete a VSM chart."""
        from execution.models import VsmChart
        try:
            chart = VsmChart.objects.get(id=chart_id)
            chart.delete()
            return True
        except VsmChart.DoesNotExist:
            return False

    def get_chart(self, chart_id: str):
        """Get a single VSM chart with all nested data."""
        from execution.models import VsmChart
        try:
            return VsmChart.objects.prefetch_related(
                "processes", "inventories", "information_flows",
                "material_flows", "timeline_segments", "demand_takt",
            ).get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None

    def list_charts(self, production_line_id: Optional[str] = None,
                    source_mode: Optional[str] = None,
                    chart_type: Optional[str] = None) -> list:
        """List VSM charts with optional filtering."""
        from execution.models import VsmChart
        qs = VsmChart.objects.prefetch_related(
            "processes", "inventories", "information_flows",
            "material_flows", "timeline_segments", "demand_takt",
        ).all()
        if production_line_id:
            qs = qs.filter(production_line_id=production_line_id)
        if source_mode:
            qs = qs.filter(source_mode=source_mode)
        if chart_type:
            qs = qs.filter(chart_type=chart_type)
        return list(qs.order_by("-updated_at"))

    # ── Process CRUD ──

    def add_process(self, chart_id: str, input_data):
        from execution.models import VsmChart, VsmChartProcess
        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None

        proc = VsmChartProcess.objects.create(
            chart=chart,
            sequence=input_data.sequence,
            name=input_data.name,
            department_name=getattr(input_data, "department_name", "") or "",
            resource_group_name=getattr(input_data, "resource_group_name", "") or "",
            operator_count=getattr(input_data, "operator_count", 1) or 1,
            cycle_time_value=input_data.cycle_time_value,
            cycle_time_unit=getattr(input_data, "cycle_time_unit", "sec") or "sec",
            changeover_time_value=input_data.changeover_time_value,
            changeover_time_unit=getattr(input_data, "changeover_time_unit", "sec") or "sec",
            uptime_percent=input_data.uptime_percent,
            yield_percent=input_data.yield_percent,
            wip=input_data.wip,
            shifts_per_day=getattr(input_data, "shifts_per_day", 1) or 1,
            is_bottleneck=getattr(input_data, "is_bottleneck", False) or False,
            is_pacemaker=getattr(input_data, "is_pacemaker", False) or False,
            target_wip=getattr(input_data, "target_wip", None),
            target_cycle_time_value=getattr(input_data, "target_cycle_time_value", None),
            process_type=getattr(input_data, "process_type", "MANUFACTURING") or "MANUFACTURING",
            value_add_type=getattr(input_data, "value_add_type", "VALUE_ADD") or "VALUE_ADD",
            notes=getattr(input_data, "notes", "") or "",
        )
        return proc

    def update_process(self, process_id: str, input_data):
        from execution.models import VsmChartProcess
        try:
            proc = VsmChartProcess.objects.get(id=process_id)
        except VsmChartProcess.DoesNotExist:
            return None

        for f in ["sequence", "name", "department_name", "resource_group_name",
                   "operator_count", "cycle_time_value", "cycle_time_unit",
                   "changeover_time_value", "changeover_time_unit",
                   "uptime_percent", "yield_percent", "wip",
                   "shifts_per_day", "is_bottleneck", "notes",
                   "process_type", "value_add_type"]:
            v = getattr(input_data, f, None)
            if v is not None:
                setattr(proc, f, v)
        for f in ["is_pacemaker", "target_wip", "target_cycle_time_value"]:
            v = getattr(input_data, f, None)
            if v is not None:
                setattr(proc, f, v)

        proc.save()
        return proc

    def delete_process(self, process_id: str) -> bool:
        from execution.models import VsmChartProcess
        try:
            proc = VsmChartProcess.objects.get(id=process_id)
            proc.delete()
            return True
        except VsmChartProcess.DoesNotExist:
            return False

    def reorder_processes(self, chart_id: str, process_ids: list[str]) -> bool:
        from execution.models import VsmChartProcess
        try:
            for i, pid in enumerate(process_ids):
                VsmChartProcess.objects.filter(id=pid, chart_id=chart_id).update(sequence=i + 1)
            return True
        except Exception:
            return False

    # ── Inventory CRUD ──

    def add_inventory(self, chart_id: str, input_data):
        from execution.models import VsmChart, VsmChartInventory
        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None
        inv = VsmChartInventory.objects.create(
            chart=chart, sequence=input_data.sequence,
            label=getattr(input_data, "label", "") or "",
            quantity=input_data.quantity,
            wait_time_value=input_data.wait_time_value,
            wait_time_unit=getattr(input_data, "wait_time_unit", "days") or "days",
            severity=getattr(input_data, "severity", "NORMAL") or "NORMAL",
        )
        return inv

    def update_inventory(self, inventory_id: str, input_data):
        from execution.models import VsmChartInventory
        try:
            inv = VsmChartInventory.objects.get(id=inventory_id)
        except VsmChartInventory.DoesNotExist:
            return None
        for f in ["sequence", "label", "quantity", "wait_time_value", "wait_time_unit", "severity"]:
            v = getattr(input_data, f, None)
            if v is not None:
                setattr(inv, f, v)
        inv.save()
        return inv

    def delete_inventory(self, inventory_id: str) -> bool:
        from execution.models import VsmChartInventory
        try:
            inv = VsmChartInventory.objects.get(id=inventory_id)
            inv.delete()
            return True
        except VsmChartInventory.DoesNotExist:
            return False

    # ── Information Flow CRUD ──

    def add_info_flow(self, chart_id: str, input_data):
        from execution.models import VsmChart, VsmChartInformationFlow
        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None
        flow = VsmChartInformationFlow.objects.create(
            chart=chart,
            from_type=input_data.from_type,
            from_id=getattr(input_data, "from_id", "") or "",
            to_type=input_data.to_type,
            to_id=getattr(input_data, "to_id", "") or "",
            label=getattr(input_data, "label", "") or "",
            frequency=getattr(input_data, "frequency", "") or "",
            flow_style=getattr(input_data, "flow_style", "MANUAL") or "MANUAL",
            method=getattr(input_data, "method", "") or "",
            transmission_type=getattr(input_data, "transmission_type", "MANUAL") or "MANUAL",
            trigger_type=getattr(input_data, "trigger_type", "") or "",
            controlled_process_id=getattr(input_data, "controlled_process_id", "") or "",
            notes=getattr(input_data, "notes", "") or "",
        )
        return flow

    def update_info_flow(self, flow_id: str, input_data):
        from execution.models import VsmChartInformationFlow
        try:
            flow = VsmChartInformationFlow.objects.get(id=flow_id)
        except VsmChartInformationFlow.DoesNotExist:
            return None
        for f in ["from_type", "from_id", "to_type", "to_id", "label", "frequency",
                   "flow_style", "method", "transmission_type", "trigger_type",
                   "controlled_process_id", "notes"]:
            v = getattr(input_data, f, None)
            if v is not None:
                setattr(flow, f, v)
        flow.save()
        return flow

    def delete_info_flow(self, flow_id: str) -> bool:
        from execution.models import VsmChartInformationFlow
        try:
            flow = VsmChartInformationFlow.objects.get(id=flow_id)
            flow.delete()
            return True
        except VsmChartInformationFlow.DoesNotExist:
            return False

    # ── Material Flow CRUD ──

    def add_material_flow(self, chart_id: str, input_data):
        from execution.models import VsmChart, VsmChartMaterialFlow
        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None
        flow = VsmChartMaterialFlow.objects.create(
            chart=chart,
            from_type=input_data.from_type,
            from_id=getattr(input_data, "from_id", "") or "",
            to_type=input_data.to_type,
            to_id=getattr(input_data, "to_id", "") or "",
            label=getattr(input_data, "label", "") or "",
            flow_type=getattr(input_data, "flow_type", "PUSH") or "PUSH",
            delivery_frequency=getattr(input_data, "delivery_frequency", "") or "",
            equipment_type=getattr(input_data, "equipment_type", "UNKNOWN") or "UNKNOWN",
            equipment_label=getattr(input_data, "equipment_label", "") or "",
            distance=getattr(input_data, "distance", None),
            distance_unit=getattr(input_data, "distance_unit", "m") or "m",
            trip_frequency=getattr(input_data, "trip_frequency", "") or "",
            batch_size=getattr(input_data, "batch_size", None),
            handling_time=getattr(input_data, "handling_time", None),
            handling_time_unit=getattr(input_data, "handling_time_unit", "min") or "min",
            transport_severity=getattr(input_data, "transport_severity", "UNKNOWN") or "UNKNOWN",
            transport_cost_level=getattr(input_data, "transport_cost_level", "UNKNOWN") or "UNKNOWN",
            is_internal_transport=getattr(input_data, "is_internal_transport", False) or False,
            is_transportation_waste=getattr(input_data, "is_transportation_waste", False) or False,
            notes=getattr(input_data, "notes", "") or "",
        )
        return flow

    def update_material_flow(self, flow_id: str, input_data):
        from execution.models import VsmChartMaterialFlow
        try:
            flow = VsmChartMaterialFlow.objects.get(id=flow_id)
        except VsmChartMaterialFlow.DoesNotExist:
            return None
        for f in ["from_type", "from_id", "to_type", "to_id", "label", "flow_type",
                   "delivery_frequency", "equipment_type", "equipment_label",
                   "distance", "distance_unit", "trip_frequency",
                   "batch_size", "handling_time", "handling_time_unit",
                   "transport_severity", "transport_cost_level",
                   "is_internal_transport", "is_transportation_waste", "notes"]:
            v = getattr(input_data, f, None)
            if v is not None:
                setattr(flow, f, v)
        flow.save()
        return flow

    def delete_material_flow(self, flow_id: str) -> bool:
        from execution.models import VsmChartMaterialFlow
        try:
            flow = VsmChartMaterialFlow.objects.get(id=flow_id)
            flow.delete()
            return True
        except VsmChartMaterialFlow.DoesNotExist:
            return False

    # ── Timeline CRUD ──

    def add_timeline_segment(self, chart_id: str, input_data):
        from execution.models import VsmChart, VsmChartTimelineSegment
        try:
            chart = VsmChart.objects.get(id=chart_id)
        except VsmChart.DoesNotExist:
            return None
        seg = VsmChartTimelineSegment.objects.create(
            chart=chart, sequence=input_data.sequence,
            wait_time_value=input_data.wait_time_value,
            wait_time_unit=getattr(input_data, "wait_time_unit", "days") or "days",
            process_time_value=input_data.process_time_value,
            process_time_unit=getattr(input_data, "process_time_unit", "sec") or "sec",
            label=getattr(input_data, "label", "") or "",
        )
        return seg

    def delete_timeline_segment(self, seg_id: str) -> bool:
        from execution.models import VsmChartTimelineSegment
        try:
            seg = VsmChartTimelineSegment.objects.get(id=seg_id)
            seg.delete()
            return True
        except VsmChartTimelineSegment.DoesNotExist:
            return False

    # ── Linked mode helpers ──

    def sync_from_production_line(self, chart_id: str) -> bool:
        """Preload process steps from a linked production line's routing."""
        from execution.models import VsmChart, VsmChartProcess
        try:
            chart = VsmChart.objects.select_related("production_line").get(id=chart_id)
        except VsmChart.DoesNotExist:
            return False

        if not chart.production_line or chart.source_mode != "LINKED":
            return False

        from manufacturing.models.routing import Routing, RoutingStatus
        routing = Routing.objects.filter(
            production_line=chart.production_line,
            status=RoutingStatus.ACTIVE,
        ).select_related("product_model").order_by("-created_at").first()

        if not routing:
            return False

        steps = list(routing.steps.select_related("department", "resource_group").order_by("sequence"))
        if not steps:
            return False

        # Get existing processes to avoid overwriting manual values
        existing = {p.name: p for p in VsmChartProcess.objects.filter(chart=chart)}

        for i, step in enumerate(steps):
            name = step.department.name if step.department else step.resource_group.name if step.resource_group else f"Step {step.sequence}"
            rg_name = step.resource_group.name if step.resource_group else ""
            dept_name = step.department.name if step.department else ""

            if name in existing:
                proc = existing[name]
                # Only update fields, don't overwrite manual values
                proc.department_name = dept_name or proc.department_name
                proc.resource_group_name = rg_name or proc.resource_group_name
                proc.save()
            else:
                VsmChartProcess.objects.create(
                    chart=chart, sequence=i + 1, name=name,
                    department_name=dept_name, resource_group_name=rg_name,
                    operator_count=step.required_operators or 1,
                    cycle_time_value=float(step.cycle_time_sec) if step.cycle_time_sec else None,
                    cycle_time_unit="sec",
                    changeover_time_value=float(step.changeover_time_sec) if step.changeover_time_sec else None,
                    changeover_time_unit="sec",
                    shifts_per_day=1,
                )

        return True
