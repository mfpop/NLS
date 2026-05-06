from django.db import models
from shared.models.base import TimeStampedModel


class Company(TimeStampedModel):
    code = models.CharField(max_length=20, unique=True, verbose_name="Company Code")
    name = models.CharField(max_length=200, verbose_name="Company Name")
    address = models.CharField(max_length=500, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(max_length=200, blank=True, default="")
    website = models.URLField(max_length=500, blank=True, default="")
    tax_id = models.CharField(max_length=50, blank=True, default="", verbose_name="Tax ID")
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "manufacturing_company"
        ordering = ["name"]
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return f"{self.name} ({self.code})"
