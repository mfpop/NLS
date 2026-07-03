"""Shared helper for converting VsmChart model instances to GraphQL nodes."""

from api.types.vsm import (
    VsmChartNode, VsmChartProcessNode, VsmChartInventoryNode,
    VsmChartInfoFlowNode, VsmChartMaterialFlowNode, VsmChartTimelineNode,
    VsmImprovementOpportunityNode,
)


def _demand_takt(chart):
    """Read demand/takt from VsmDemandTakt table, fall back to chart fields."""
    try:
        dt = chart.demand_takt
        if dt is not None:
            return dt
    except Exception:
        pass
    return chart  # fallback to chart's own fields


def chart_to_node(chart) -> VsmChartNode:
    """Convert a VsmChart model instance to a VsmChartNode for GraphQL."""

    dt = _demand_takt(chart)

    # Compute takt time
    demand_rate = getattr(dt, "customer_demand_rate", None)
    avail_min = getattr(dt, "available_minutes_per_shift", None) or 450.0
    shifts = getattr(dt, "chart_shifts_per_day", None) or 1
    takt_sec = None
    if demand_rate and demand_rate > 0 and avail_min and avail_min > 0:
        takt_sec = round((avail_min * 60 * shifts) / demand_rate, 1)

    def get_ct_vs_takt(cycle_time: float | None) -> str | None:
        if takt_sec is None or cycle_time is None:
            return None
        ratio = cycle_time / takt_sec
        if ratio < 0.9:
            return "below"
        elif ratio > 1.1:
            return "above"
        else:
            return "at"

    processes = [
        VsmChartProcessNode(
            id=str(p.id), sequence=p.sequence, name=p.name,
            department_name=p.department_name or "",
            resource_group_name=p.resource_group_name or "",
            linked_department_id=str(p.linked_department_id) if p.linked_department_id else None,
            linked_resource_group_id=str(p.linked_resource_group_id) if p.linked_resource_group_id else None,
            linked_resource_id=str(p.linked_resource_id) if p.linked_resource_id else None,
            operator_count=p.operator_count or 1,
            cycle_time_value=p.cycle_time_value,
            cycle_time_unit=p.cycle_time_unit or "sec",
            changeover_time_value=p.changeover_time_value,
            changeover_time_unit=p.changeover_time_unit or "sec",
            uptime_percent=p.uptime_percent,
            yield_percent=p.yield_percent,
            wip=p.wip,
            shifts_per_day=p.shifts_per_day or 1,
            is_bottleneck=p.is_bottleneck or False,
            is_pacemaker=p.is_pacemaker or False,
            process_type=p.process_type or "MANUFACTURING",
            value_add_type=p.value_add_type or "VALUE_ADD",
            cycle_time_vs_takt=get_ct_vs_takt(p.cycle_time_value),
            target_wip=p.target_wip,
            target_cycle_time_value=p.target_cycle_time_value,
            notes=p.notes or "",
        )
        for p in chart.processes.all()
    ]

    inventories = [
        VsmChartInventoryNode(
            id=str(i.id), sequence=i.sequence,
            label=i.label or "", quantity=i.quantity or 0,
            wait_time_value=i.wait_time_value,
            wait_time_unit=i.wait_time_unit or "days",
            severity=i.severity or "NORMAL",
        )
        for i in chart.inventories.all()
    ]

    info_flows = [
        VsmChartInfoFlowNode(
            id=str(f.id),
            from_type=f.from_type, from_id=f.from_id or "",
            to_type=f.to_type, to_id=f.to_id or "",
            label=f.label or "", frequency=f.frequency or "",
            flow_style=f.flow_style or "MANUAL",
            method=f.method or "",
            transmission_type=f.transmission_type or "MANUAL",
            trigger_type=f.trigger_type or "",
            controlled_process_id=f.controlled_process_id or "",
            notes=f.notes or "",
        )
        for f in chart.information_flows.all()
    ]

    material_flows = [
        VsmChartMaterialFlowNode(
            id=str(m.id),
            from_type=m.from_type, from_id=m.from_id or "",
            to_type=m.to_type, to_id=m.to_id or "",
            label=m.label or "", flow_type=m.flow_type or "PUSH",
            delivery_frequency=m.delivery_frequency or "",
            equipment_type=m.equipment_type or "UNKNOWN",
            equipment_label=m.equipment_label or "",
            distance=m.distance,
            distance_unit=m.distance_unit or "m",
            trip_frequency=m.trip_frequency or "",
            batch_size=m.batch_size,
            handling_time=m.handling_time,
            handling_time_unit=m.handling_time_unit or "min",
            transport_severity=m.transport_severity or "UNKNOWN",
            transport_cost_level=m.transport_cost_level or "UNKNOWN",
            is_internal_transport=m.is_internal_transport or False,
            is_transportation_waste=m.is_transportation_waste or False,
            notes=m.notes or "",
        )
        for m in chart.material_flows.all()
    ]

    timeline_segments = [
        VsmChartTimelineNode(
            id=str(t.id), sequence=t.sequence,
            process_id=str(t.process_id) if t.process_id else None,
            wait_time_value=t.wait_time_value,
            wait_time_unit=t.wait_time_unit or "days",
            process_time_value=t.process_time_value,
            process_time_unit=t.process_time_unit or "sec",
            label=t.label or "",
        )
        for t in chart.timeline_segments.all()
    ]

    improvement_opportunities = [
        VsmImprovementOpportunityNode(
            id=str(o.id),
            process_id=str(o.process_id) if o.process_id else None,
            inventory_id=str(o.inventory_id) if o.inventory_id else None,
            opportunity_type=o.opportunity_type,
            severity=o.severity,
            label=o.label,
            message=o.message or "",
            acknowledged=o.acknowledged,
        )
        for o in chart.improvement_opportunities.all()
    ]

    return VsmChartNode(
        id=str(chart.id),
        name=chart.name,
        chart_type=chart.chart_type,
        source_mode=chart.source_mode,
        plant_id=str(chart.plant_id) if chart.plant_id else None,
        production_line_id=str(chart.production_line_id) if chart.production_line_id else None,
        department_id=str(chart.department_id) if chart.department_id else None,
        supplier_name=chart.supplier_name or "",
        customer_name=chart.customer_name or "",
        production_control_title=chart.production_control_title or "Production Control",
        control_method=chart.control_method or "",
        schedule_frequency=chart.schedule_frequency or "",
        customer_demand_rate=getattr(dt, "customer_demand_rate", chart.customer_demand_rate),
        customer_demand_period=getattr(dt, "customer_demand_period", None) or chart.customer_demand_period or "day",
        customer_demand_unit=getattr(dt, "customer_demand_unit", None) or chart.customer_demand_unit or "units",
        available_minutes_per_shift=getattr(dt, "available_minutes_per_shift", None) or chart.available_minutes_per_shift or 450.0,
        chart_shifts_per_day=getattr(dt, "chart_shifts_per_day", None) or chart.chart_shifts_per_day or 1,
        break_time_per_shift=getattr(dt, "break_time_per_shift", None) or chart.break_time_per_shift or 0.0,
        planned_downtime_per_shift=getattr(dt, "planned_downtime_per_shift", None) or chart.planned_downtime_per_shift or 0.0,
        working_days_per_week=getattr(dt, "working_days_per_week", None) or chart.working_days_per_week or 5,
        takt_time_seconds=takt_sec,
        status=chart.status,
        processes=processes,
        inventories=inventories,
        information_flows=info_flows,
        material_flows=material_flows,
        timeline_segments=timeline_segments,
        improvement_opportunities=improvement_opportunities,
        created_at=chart.created_at.isoformat() if chart.created_at else "",
        updated_at=chart.updated_at.isoformat() if chart.updated_at else "",
    )
