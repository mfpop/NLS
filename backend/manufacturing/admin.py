from django.contrib import admin
from manufacturing.models import UserRole

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "plant", "department"]
    list_filter = ["role", "plant"]
