from django.contrib import admin
from execution.models import WorkOrder, GembaWalkSession, GembaObservation, GembaObservationActivity


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ["reference", "production_line", "status", "planned_quantity", "good_quantity", "scrap_quantity", "scheduled_start", "scheduled_end"]
    list_filter = ["status", "production_line"]
    search_fields = ["reference", "production_line__code"]
    ordering = ["-created_at"]


@admin.register(GembaWalkSession)
class GembaWalkSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "walk_date", "shift_name", "line", "status", "started_at", "completed_at"]
    list_filter = ["status", "shift_name"]
    search_fields = ["line__code", "observer"]
    ordering = ["-walk_date", "-created_at"]
    raw_id_fields = ["line", "plant", "created_by", "updated_by"]


@admin.register(GembaObservation)
class GembaObservationAdmin(admin.ModelAdmin):
    list_display = ["id", "session", "title", "area", "category", "severity", "status", "owner", "due_date"]
    list_filter = ["status", "category", "severity"]
    search_fields = ["title", "area", "description"]
    ordering = ["-created_at"]
    raw_id_fields = ["session", "owner", "created_by", "updated_by", "created_issue", "created_action"]


@admin.register(GembaObservationActivity)
class GembaObservationActivityAdmin(admin.ModelAdmin):
    list_display = ["id", "observation", "event_type", "message", "actor", "created_at"]
    list_filter = ["event_type"]
    ordering = ["-created_at"]
    raw_id_fields = ["observation", "actor"]
