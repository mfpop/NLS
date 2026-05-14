from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class ProductModel(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_product_model"
        ordering = ["name"]
        verbose_name = "Product Model"
        verbose_name_plural = "Product Models"

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProcessFlow(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    product_model = models.ForeignKey(
        ProductModel, on_delete=models.CASCADE, related_name="process_flows",
        null=True, blank=True,
    )
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.CASCADE,
        related_name="process_flows", null=True, blank=True,
    )
    version = models.CharField(max_length=20, blank=True, default="1.0")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_process_flow"
        ordering = ["name"]
        verbose_name = "Process Flow"
        verbose_name_plural = "Process Flows"

    def __str__(self):
        return f"{self.name} v{self.version}"


class ProcessStep(models.Model):
    ENTITY_TYPE_CHOICES = [
        ("DEPARTMENT", "Department"),
        ("RESOURCE_GROUP", "Resource Group"),
        ("RESOURCE", "Resource"),
    ]

    process_flow = models.ForeignKey(
        ProcessFlow, on_delete=models.CASCADE, related_name="steps",
    )
    sequence = models.IntegerField(default=0)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.CharField(max_length=50)
    lead_time_minutes = models.FloatField(default=0, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturing_process_step"
        ordering = ["process_flow", "sequence"]
        verbose_name = "Process Step"
        verbose_name_plural = "Process Steps"

    def __str__(self):
        return f"{self.process_flow.name} / {self.name}"


class RoutingStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    ARCHIVED = "ARCHIVED", "Archived"


class ScheduleSource(models.TextChoices):
    PLANT = "PLANT", "Plant"
    LINE = "LINE", "Line"
    DEPARTMENT = "DEPARTMENT", "Department"
    RESOURCE_GROUP = "RESOURCE_GROUP", "Resource Group"
    RESOURCE = "RESOURCE", "Resource"
    CUSTOM = "CUSTOM", "Custom"


class Routing(TimeStampedModel):
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.CASCADE,
        related_name="routings",
        db_index=True,
    )
    product_family = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    product_model = models.ForeignKey(
        ProductModel, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routings",
        db_index=True,
    )
    version = models.CharField(max_length=20, default="1.0")
    status = models.CharField(
        max_length=20, choices=RoutingStatus.choices, default=RoutingStatus.DRAFT,
        db_index=True,
    )
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_routing"
        ordering = ["-created_at"]
        verbose_name = "Routing"
        verbose_name_plural = "Routings"
        indexes = [
            models.Index(fields=["production_line", "status"]),
            models.Index(fields=["production_line", "product_model"]),
            models.Index(fields=["production_line", "product_family"]),
        ]

    def __str__(self):
        return f"Routing v{self.version} for {self.production_line.name}"


class RoutingStep(TimeStampedModel):
    routing = models.ForeignKey(
        Routing, on_delete=models.CASCADE, related_name="steps",
        db_index=True,
    )
    sequence = models.IntegerField(db_index=True)
    department = models.ForeignKey(
        "manufacturing.Department", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    resource_group = models.ForeignKey(
        "manufacturing.ResourceGroup", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    resource = models.ForeignKey(
        "manufacturing.Resource", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    standard_work = models.ForeignKey(
        ProcessFlow, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="routing_steps",
    )
    cycle_time_sec = models.FloatField(default=0)
    setup_time_sec = models.FloatField(null=True, blank=True, default=0)
    changeover_time_sec = models.FloatField(null=True, blank=True, default=0)
    required_operators = models.IntegerField(null=True, blank=True, default=1)
    schedule_source = models.CharField(
        max_length=20, choices=ScheduleSource.choices,
        default=ScheduleSource.LINE,
    )
    buffer_type = models.CharField(max_length=50, null=True, blank=True)
    wip_min = models.IntegerField(null=True, blank=True)
    wip_max = models.IntegerField(null=True, blank=True)
    quality_checkpoint = models.BooleanField(default=False)
    rework_allowed = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_routing_step"
        ordering = ["routing", "sequence"]
        verbose_name = "Routing Step"
        verbose_name_plural = "Routing Steps"
        constraints = [
            models.UniqueConstraint(
                fields=["routing", "sequence"],
                name="uq_routing_step_sequence",
            ),
        ]
        indexes = [
            models.Index(fields=["routing", "sequence"]),
        ]

    def __str__(self):
        return f"Step {self.sequence}: {self.department.name if self.department else 'Unassigned'}"
