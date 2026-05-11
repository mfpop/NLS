from django.db import models
from shared.models.base import TimeStampedModel
from .entity_status import EntityStatus


class Company(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
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
    default_timezone = models.CharField(max_length=100, blank=True, default="UTC")
    default_timezone_id = models.ForeignKey(
        "manufacturing.ReferenceValue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    manufacturing_focus = models.ManyToManyField(
        "manufacturing.ReferenceValue", blank=True,
        related_name="companies_focus",
    )

    class Meta:
        db_table = "manufacturing_company"
        ordering = ["name"]
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return f"{self.name} ({self.code})"
