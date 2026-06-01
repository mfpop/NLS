import uuid

from django.core.exceptions import ValidationError
from django.db import models


class WorkOrderStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    DONE = "DONE", "Done"
    CANCELLED = "CANCELLED", "Cancelled"


class WorkOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=50, unique=True)
    production_line = models.ForeignKey(
        "manufacturing.ProductionLine", on_delete=models.PROTECT,
        related_name="work_orders",
    )
    product_model = models.ForeignKey(
        "manufacturing.ProductModel", on_delete=models.PROTECT,
        related_name="work_orders", null=True, blank=True,
    )
    planned_quantity = models.IntegerField(default=1)
    good_quantity = models.IntegerField(default=0)
    scrap_quantity = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=WorkOrderStatus.choices, default=WorkOrderStatus.OPEN,
        db_index=True,
    )
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "execution_work_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["production_line", "status"], name="exec_wo_line_status_idx"),
            models.Index(fields=["status", "scheduled_start"], name="exec_wo_status_start_idx"),
        ]

    def clean(self):
        if self.good_quantity + self.scrap_quantity > self.planned_quantity:
            raise ValidationError("Good + scrap quantity cannot exceed planned quantity.")

    def __str__(self):
        return f"{self.reference} — {self.production_line.code} ({self.status})"
