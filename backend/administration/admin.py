from django.contrib import admin
from .models import (
    AdministrativeDepartment, UserProfile, Role,
    Permission, RolePermission, UserRoleAssignment,
)


@admin.register(AdministrativeDepartment)
class AdministrativeDepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "company", "plant", "manager", "is_active"]
    list_filter = ["is_active", "company"]
    search_fields = ["code", "name"]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "company", "plant", "administrative_department", "job_title", "is_active"]
    list_filter = ["is_active", "company"]
    search_fields = ["user__username", "user__email", "job_title"]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "is_system_role", "is_active"]
    list_filter = ["is_system_role", "is_active"]
    search_fields = ["code", "name"]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "module", "action", "is_active"]
    list_filter = ["module", "is_active"]
    search_fields = ["code", "name", "module", "action"]


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ["role", "permission"]


@admin.register(UserRoleAssignment)
class UserRoleAssignmentAdmin(admin.ModelAdmin):
    list_display = ["user_profile", "role", "company", "plant", "is_active", "assigned_at"]
    list_filter = ["is_active", "role"]
