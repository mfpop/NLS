from django.contrib import admin
from execution.models import WorkOrder


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ["reference", "production_line", "status", "planned_quantity", "good_quantity", "scrap_quantity", "scheduled_start", "scheduled_end"]
    list_filter = ["status", "production_line"]
    search_fields = ["reference", "production_line__code"]
    ordering = ["-created_at"]
