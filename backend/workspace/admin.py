from django.contrib import admin
from workspace.models import WorkspaceTask


@admin.register(WorkspaceTask)
class WorkspaceTaskAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "assigned_to", "due_date", "source_module"]
    list_filter = ["status", "priority", "source_module"]
    search_fields = ["title", "assigned_to"]
