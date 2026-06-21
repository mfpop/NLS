from django.db import models
from django.contrib.auth.models import User
from shared.models.base import TimeStampedModel


class AdministrativeDepartment(TimeStampedModel):
    company = models.ForeignKey(
        "manufacturing.Company", on_delete=models.PROTECT,
        related_name="administrative_departments",
    )
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.PROTECT,
        null=True, blank=True, related_name="administrative_departments",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    manager = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="managed_departments",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "administration_department"
        ordering = ["name"]
        verbose_name = "Administrative Department"
        verbose_name_plural = "Administrative Departments"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "plant", "code"],
                name="uq_admin_dept_company_plant_code",
            ),
        ]
        indexes = [
            models.Index(fields=["company"], name="admin_dept_company_idx"),
            models.Index(fields=["plant"], name="admin_dept_plant_idx"),
            models.Index(fields=["is_active"], name="admin_dept_active_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class UserProfile(TimeStampedModel):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name="administration_profile",
    )
    company = models.ForeignKey(
        "manufacturing.Company", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="user_profiles",
    )
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="user_profiles",
    )
    administrative_department = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="user_profiles",
    )
    job_title = models.CharField(max_length=200, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "administration_user_profile"
        ordering = ["user__username"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        indexes = [
            models.Index(fields=["company"], name="admin_up_company_idx"),
            models.Index(fields=["plant"], name="admin_up_plant_idx"),
            models.Index(fields=["administrative_department"], name="admin_up_dept_idx"),
            models.Index(fields=["is_active"], name="admin_up_active_idx"),
        ]

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Role(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_system_role = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "administration_role"
        ordering = ["name"]
        verbose_name = "Role"
        verbose_name_plural = "Roles"
        indexes = [
            models.Index(fields=["code"], name="admin_role_code_idx"),
            models.Index(fields=["is_active"], name="admin_role_active_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Permission(models.Model):
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    module = models.CharField(max_length=100)
    action = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "administration_permission"
        ordering = ["module", "action"]
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"
        indexes = [
            models.Index(fields=["module"], name="admin_perm_module_idx"),
            models.Index(fields=["action"], name="admin_perm_action_idx"),
        ]

    def __str__(self):
        return f"{self.module}.{self.action}"


class RolePermission(models.Model):
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE,
        related_name="role_permissions",
    )
    permission = models.ForeignKey(
        Permission, on_delete=models.CASCADE,
        related_name="role_permissions",
    )

    class Meta:
        db_table = "administration_role_permission"
        verbose_name = "Role Permission"
        verbose_name_plural = "Role Permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["role", "permission"],
                name="uq_role_permission",
            ),
        ]

    def __str__(self):
        return f"{self.role.code} -> {self.permission.code}"


class UserRoleAssignment(TimeStampedModel):
    user_profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE,
        related_name="role_assignments",
    )
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE,
        related_name="user_assignments",
    )
    company = models.ForeignKey(
        "manufacturing.Company", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="role_assignments",
    )
    plant = models.ForeignKey(
        "manufacturing.Plant", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="role_assignments",
    )
    administrative_department = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="role_assignments",
    )
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_roles",
    )

    class Meta:
        db_table = "administration_user_role_assignment"
        ordering = ["-assigned_at"]
        verbose_name = "User Role Assignment"
        verbose_name_plural = "User Role Assignments"
        indexes = [
            models.Index(fields=["user_profile"], name="admin_ura_user_idx"),
            models.Index(fields=["role"], name="admin_ura_role_idx"),
            models.Index(fields=["is_active"], name="admin_ura_active_idx"),
        ]

    def __str__(self):
        return f"{self.user_profile} -> {self.role.code}"


class ProfileSkill(TimeStampedModel):
    CATEGORY_CHOICES = [
        ("SKILL", "Skill"),
        ("CERTIFICATION", "Certification"),
        ("LICENSE", "License"),
        ("TRAINING", "Training"),
    ]

    user_profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE,
        related_name="skills",
    )
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="SKILL")
    level = models.CharField(max_length=100, blank=True, default="")
    issuer = models.CharField(max_length=200, blank=True, default="")
    issued_date = models.DateField(null=True, blank=True)
    expires_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "administration_profile_skill"
        ordering = ["-created_at"]
        verbose_name = "Profile Skill"
        verbose_name_plural = "Profile Skills"
        indexes = [
            models.Index(fields=["user_profile"], name="admin_skill_user_idx"),
            models.Index(fields=["category"], name="admin_skill_cat_idx"),
            models.Index(fields=["is_active"], name="admin_skill_active_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
