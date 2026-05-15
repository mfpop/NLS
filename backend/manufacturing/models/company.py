from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class Company(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=EntityStatus.choices, default=EntityStatus.ACTIVE,
    )
    status_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    address = models.CharField(max_length=500, blank=True, default="")
    city = models.CharField(max_length=200, blank=True, default="")
    state = models.CharField(max_length=200, blank=True, default="")
    country = models.CharField(max_length=200, blank=True, default="")
    country_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(max_length=200, blank=True, default="")
    website = models.URLField(max_length=500, blank=True, default="")
    legal_name = models.CharField(max_length=200, blank=True, default="")
    industry_type = models.CharField(max_length=200, blank=True, default="")
    industry_type_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    operating_since = models.CharField(max_length=50, blank=True, default="")
    manufacturing_focus = models.CharField(max_length=500, blank=True, default="")
    product_lines = models.CharField(max_length=500, blank=True, default="")
    lean_methodology = models.CharField(max_length=500, blank=True, default="")
    default_timezone = models.CharField(max_length=100, blank=True, default="UTC")
    default_timezone_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    default_language = models.CharField(max_length=100, blank=True, default="")
    default_language_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    default_calendar = models.CharField(max_length=100, blank=True, default="")
    default_calendar_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )

    default_shift_model = models.CharField(max_length=100, blank=True, default="")
    default_shift_model_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    week_start_day = models.CharField(max_length=50, blank=True, default="")
    week_start_day_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    product_line_refs = models.ManyToManyField(
        "manufacturing.ReferenceValue", blank=True, related_name="company_product_lines",
    )
    lean_methodology_refs = models.ManyToManyField(
        "manufacturing.ReferenceValue", blank=True, related_name="company_lean_methodologies",
    )
    admin_name = models.CharField(max_length=200, blank=True, default="")
    admin_role = models.CharField(max_length=200, blank=True, default="")
    zipcode = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "manufacturing_company"
        ordering = ["name"]
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        indexes = [
            models.Index(fields=["name"], name="mfg_company_name_idx"),
            models.Index(fields=["code"], name="mfg_company_code_idx"),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"
