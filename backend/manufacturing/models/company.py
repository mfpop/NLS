from django.db import models
from shared.models.base import TimeStampedModel


class Company(TimeStampedModel):
    code = models.CharField(max_length=20, unique=True, verbose_name="Company Code")
    name = models.CharField(max_length=200, verbose_name="Company Name")
    address = models.CharField(max_length=500, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(max_length=200, blank=True, default="")
    website = models.URLField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True, default="")

    industry_type = models.CharField(max_length=100, blank=True, default="")
    manufacturing_type = models.CharField(max_length=100, blank=True, default="")
    default_timezone = models.CharField(max_length=100, blank=True, default="UTC")
    default_units = models.CharField(max_length=50, blank=True, default="Metric")
    default_shift_model = models.CharField(max_length=50, blank=True, default="")
    production_calendar = models.CharField(max_length=100, blank=True, default="")
    default_language = models.CharField(max_length=50, blank=True, default="en")
    lean_methodology = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "manufacturing_company"
        ordering = ["name"]
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return f"{self.name} ({self.code})"
