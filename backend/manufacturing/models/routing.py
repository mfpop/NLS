from django.db import models
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
