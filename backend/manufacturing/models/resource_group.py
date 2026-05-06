from django.db import models
from shared.models.base import TimeStampedModel


class ResourceGroup(TimeStampedModel):
    TYPE_CHOICES = [
        ("Production", "Production"),
        ("Support", "Support"),
        ("Quality", "Quality"),
        ("Logistics", "Logistics"),
        ("Management", "Management"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    code = models.CharField(max_length=50, blank=True, default="", verbose_name="Group Code")
    name = models.CharField(max_length=200, verbose_name="Group Name")
    group_type = models.CharField(
        max_length=50, choices=TYPE_CHOICES, default="Production", verbose_name="Type"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    members = models.IntegerField(default=0)
    leader = models.CharField(max_length=200, blank=True, default="")
    department = models.ForeignKey(
        "manufacturing.Department",
        on_delete=models.CASCADE,
        related_name="resource_groups",
        null=True,
        blank=True,
    )
    plant = models.ForeignKey(
        "manufacturing.Plant",
        on_delete=models.CASCADE,
        related_name="resource_groups",
        null=True,
        blank=True,
    )

    resource_count = models.IntegerField(default=0)

    class Meta:
        db_table = "manufacturing_resource_group"
        ordering = ["name"]
        verbose_name = "Resource Group"
        verbose_name_plural = "Resource Groups"

    def __str__(self):
        return f"{self.name} ({self.group_type})"
