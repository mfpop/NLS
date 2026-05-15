from django.db import models
from django.db.models import Count
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class Plant(TimeStampedModel):
    company = models.ForeignKey(
        "manufacturing.Company", on_delete=models.PROTECT,
        related_name="plants",
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    status_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    building = models.CharField(max_length=200, blank=True, default="")
    address = models.CharField(max_length=500, blank=True, default="")
    city = models.CharField(max_length=200, blank=True, default="")
    state = models.CharField(max_length=200, blank=True, default="")
    country = models.CharField(max_length=200, blank=True, default="")
    country_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    zipcode = models.CharField(max_length=20, blank=True, default="")
    timezone = models.CharField(max_length=100, blank=True, default="")
    timezone_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    latitude = models.CharField(max_length=50, blank=True, default="")
    longitude = models.CharField(max_length=50, blank=True, default="")
    plant_type = models.CharField(max_length=100, blank=True, default="")
    plant_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    operating_since = models.CharField(max_length=50, blank=True, default="")
    manager_name = models.CharField(max_length=200, blank=True, default="")
    manager_email = models.EmailField(max_length=200, blank=True, default="")
    manager_phone = models.CharField(max_length=50, blank=True, default="")
    default_calendar = models.CharField(max_length=200, blank=True, default="")
    default_calendar_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    default_shift_model = models.CharField(max_length=200, blank=True, default="")
    default_shift_model_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    week_start_day = models.CharField(max_length=50, blank=True, default="")
    week_start_day_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    default_schedule = models.CharField(max_length=200, blank=True, default="")
    default_schedule_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    manufacturing_focus = models.TextField(blank=True, default="")
    manufacturing_focus_refs = models.ManyToManyField(
        "manufacturing.ReferenceValue", blank=True,
        related_name="plants_focus",
    )

    class Meta:
        db_table = "manufacturing_plant"
        ordering = ["name"]
        verbose_name = "Plant"
        verbose_name_plural = "Plants"
        constraints = [
            models.UniqueConstraint(fields=["company", "code"], name="uq_plant_company_code"),
            models.UniqueConstraint(fields=["company", "name"], name="uq_plant_company_name"),
        ]
        indexes = [
            models.Index(fields=["company"], name="mfg_plant_company_idx"),
            models.Index(fields=["company", "code"], name="mfg_plant_company_code_idx"),
            models.Index(fields=["status"], name="mfg_plant_status_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
