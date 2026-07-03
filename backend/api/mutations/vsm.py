"""GraphQL mutations for VSM chart CRUD."""

from typing import Optional
import strawberry
from strawberry.types import Info as GraphQLInfo

from api.types.vsm import (
    VsmChartPayload, VsmChartListPayload,
    CreateVsmChartInput, UpdateVsmChartInput,
    VsmChartProcessInput, VsmChartInventoryInput,
    VsmChartInfoFlowInput, VsmChartMaterialFlowInput,
    VsmChartTimelineInput,
    DemandAndTaktInput, DemandAndTaktPayload,
)
from api.types.vsm_helpers import chart_to_node
from execution.services.vsm import VsmChartService

_service = VsmChartService()


@strawberry.type
class VsmMutation:
    """VSM chart CRUD mutations."""

    @strawberry.mutation(name="createVsmChart")
    def create_vsm_chart(
        self, info: GraphQLInfo, input: CreateVsmChartInput,
    ) -> VsmChartPayload:
        user = info.context.user
        user_id = str(user.id) if user and user.is_authenticated else None
        try:
            chart = _service.create_chart(input, user_id=user_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="updateVsmChart")
    def update_vsm_chart(
        self, info: GraphQLInfo, id: str, input: UpdateVsmChartInput,
    ) -> VsmChartPayload:
        user = info.context.user
        user_id = str(user.id) if user and user.is_authenticated else None
        try:
            chart = _service.update_chart(id, input, user_id=user_id)
            if not chart:
                return VsmChartPayload(errors=["Chart not found"])
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="deleteVsmChart")
    def delete_vsm_chart(self, id: str) -> VsmChartPayload:
        ok = _service.delete_chart(id)
        if not ok:
            return VsmChartPayload(errors=["Chart not found or could not be deleted"])
        return VsmChartPayload()

    @strawberry.mutation(name="addVsmChartProcess")
    def add_vsm_chart_process(
        self, chart_id: str, input: VsmChartProcessInput,
    ) -> VsmChartPayload:
        try:
            proc = _service.add_process(chart_id, input)
            if not proc:
                return VsmChartPayload(errors=["Chart not found"])
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="updateVsmChartProcess")
    def update_vsm_chart_process(
        self, id: str, input: VsmChartProcessInput,
    ) -> VsmChartPayload:
        try:
            proc = _service.update_process(id, input)
            if not proc:
                return VsmChartPayload(errors=["Process not found"])
            chart = _service.get_chart(str(proc.chart_id))
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="deleteVsmChartProcess")
    def delete_vsm_chart_process(self, id: str) -> VsmChartPayload:
        try:
            from execution.models import VsmChartProcess
            proc = VsmChartProcess.objects.get(id=id)
            chart_id = str(proc.chart_id)
            _service.delete_process(id)
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except VsmChartProcess.DoesNotExist:
            return VsmChartPayload(errors=["Process not found"])

    @strawberry.mutation(name="reorderVsmChartProcesses")
    def reorder_vsm_chart_processes(
        self, chart_id: str, process_ids: list[str],
    ) -> VsmChartPayload:
        ok = _service.reorder_processes(chart_id, process_ids)
        if not ok:
            return VsmChartPayload(errors=["Reordering failed"])
        chart = _service.get_chart(chart_id)
        return VsmChartPayload(chart=chart_to_node(chart))

    @strawberry.mutation(name="addVsmChartInventory")
    def add_vsm_chart_inventory(
        self, chart_id: str, input: VsmChartInventoryInput,
    ) -> VsmChartPayload:
        try:
            inv = _service.add_inventory(chart_id, input)
            if not inv:
                return VsmChartPayload(errors=["Chart not found"])
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="updateVsmChartInventory")
    def update_vsm_chart_inventory(
        self, id: str, input: VsmChartInventoryInput,
    ) -> VsmChartPayload:
        try:
            inv = _service.update_inventory(id, input)
            if not inv:
                return VsmChartPayload(errors=["Inventory not found"])
            chart = _service.get_chart(str(inv.chart_id))
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="deleteVsmChartInventory")
    def delete_vsm_chart_inventory(self, id: str) -> VsmChartPayload:
        try:
            from execution.models import VsmChartInventory
            inv = VsmChartInventory.objects.get(id=id)
            chart_id = str(inv.chart_id)
            _service.delete_inventory(id)
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except VsmChartInventory.DoesNotExist:
            return VsmChartPayload(errors=["Inventory not found"])

    @strawberry.mutation(name="addVsmChartInfoFlow")
    def add_vsm_chart_info_flow(
        self, chart_id: str, input: VsmChartInfoFlowInput,
    ) -> VsmChartPayload:
        try:
            flow = _service.add_info_flow(chart_id, input)
            if not flow:
                return VsmChartPayload(errors=["Chart not found"])
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="updateVsmChartInfoFlow")
    def update_vsm_chart_info_flow(
        self, id: str, input: VsmChartInfoFlowInput,
    ) -> VsmChartPayload:
        try:
            flow = _service.update_info_flow(id, input)
            if not flow:
                return VsmChartPayload(errors=["Info flow not found"])
            chart = _service.get_chart(str(flow.chart_id))
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="deleteVsmChartInfoFlow")
    def delete_vsm_chart_info_flow(self, id: str) -> VsmChartPayload:
        try:
            from execution.models import VsmChartInformationFlow
            flow = VsmChartInformationFlow.objects.get(id=id)
            chart_id = str(flow.chart_id)
            _service.delete_info_flow(id)
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except VsmChartInformationFlow.DoesNotExist:
            return VsmChartPayload(errors=["Info flow not found"])

    @strawberry.mutation(name="addVsmChartMaterialFlow")
    def add_vsm_chart_material_flow(
        self, chart_id: str, input: VsmChartMaterialFlowInput,
    ) -> VsmChartPayload:
        try:
            flow = _service.add_material_flow(chart_id, input)
            if not flow:
                return VsmChartPayload(errors=["Chart not found"])
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="updateVsmChartMaterialFlow")
    def update_vsm_chart_material_flow(
        self, id: str, input: VsmChartMaterialFlowInput,
    ) -> VsmChartPayload:
        try:
            flow = _service.update_material_flow(id, input)
            if not flow:
                return VsmChartPayload(errors=["Material flow not found"])
            chart = _service.get_chart(str(flow.chart_id))
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="deleteVsmChartMaterialFlow")
    def delete_vsm_chart_material_flow(self, id: str) -> VsmChartPayload:
        try:
            from execution.models import VsmChartMaterialFlow
            flow = VsmChartMaterialFlow.objects.get(id=id)
            chart_id = str(flow.chart_id)
            _service.delete_material_flow(id)
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except VsmChartMaterialFlow.DoesNotExist:
            return VsmChartPayload(errors=["Material flow not found"])

    @strawberry.mutation(name="addVsmChartTimelineSegment")
    def add_vsm_chart_timeline_segment(
        self, chart_id: str, input: VsmChartTimelineInput,
    ) -> VsmChartPayload:
        try:
            seg = _service.add_timeline_segment(chart_id, input)
            if not seg:
                return VsmChartPayload(errors=["Chart not found"])
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except Exception as e:
            return VsmChartPayload(errors=[str(e)])

    @strawberry.mutation(name="deleteVsmChartTimelineSegment")
    def delete_vsm_chart_timeline_segment(self, id: str) -> VsmChartPayload:
        try:
            from execution.models import VsmChartTimelineSegment
            seg = VsmChartTimelineSegment.objects.get(id=id)
            chart_id = str(seg.chart_id)
            _service.delete_timeline_segment(id)
            chart = _service.get_chart(chart_id)
            return VsmChartPayload(chart=chart_to_node(chart))
        except VsmChartTimelineSegment.DoesNotExist:
            return VsmChartPayload(errors=["Timeline segment not found"])

    @strawberry.mutation(name="syncVsmChartFromLine")
    def sync_vsm_chart_from_line(self, chart_id: str) -> VsmChartPayload:
        ok = _service.sync_from_production_line(chart_id)
        if not ok:
            return VsmChartPayload(errors=["Sync failed — chart not linked to production line or no routing found"])
        chart = _service.get_chart(chart_id)
        return VsmChartPayload(chart=chart_to_node(chart))

    @strawberry.mutation(name="updateVsmDemandAndTakt")
    def update_vsm_demand_and_takt(self, chart_id: str, input: DemandAndTaktInput) -> DemandAndTaktPayload:
        result = _service.update_demand_and_takt(chart_id, input)
        if result.get("errors"):
            return DemandAndTaktPayload(errors=result["errors"])
        return DemandAndTaktPayload(
            chart_id=result["chart_id"],
            takt_time_seconds=result["takt_time_seconds"],
            takt_time_display=result["takt_time_display"],
            takt_status=result["takt_status"],
            takt_missing_reason=result["takt_missing_reason"],
            demand_summary=result["demand_summary"],
            demand_per_day=result["demand_per_day"],
            available_production_time_per_shift=result["available_production_time_per_shift"],
            available_production_time_per_day=result["available_production_time_per_day"],
            available_production_time_seconds=result["available_production_time_seconds"],
            break_time_per_shift=result["break_time_per_shift"],
            planned_downtime_per_shift=result["planned_downtime_per_shift"],
            shifts_per_day=result["shifts_per_day"],
            working_days_per_week=result["working_days_per_week"],
        )
