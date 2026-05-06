from django.db import models


class ConfigOption(models.Model):
    CATEGORY_CHOICES = [
        ("industry_type", "Industry Type"),
        ("manufacturing_type", "Manufacturing Type"),
        ("shift_model", "Shift Model"),
        ("units", "Units"),
        ("lean_methodology", "Lean Methodology"),
        ("language", "Language"),
        ("calendar", "Calendar"),
        ("timezone", "Timezone"),
    ]

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    value = models.CharField(max_length=100)
    label = models.CharField(max_length=200)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "manufacturing_config_option"
        ordering = ["category", "sort_order", "label"]
        verbose_name = "Configuration Option"
        verbose_name_plural = "Configuration Options"
        unique_together = [("category", "value")]

    def __str__(self):
        return f"{self.category}: {self.label}"
