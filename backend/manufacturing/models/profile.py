from django.db import models
from shared.models.base import TimeStampedModel


class Profile(TimeStampedModel):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    email = models.EmailField(max_length=200)
    phone = models.CharField(max_length=50, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    plant = models.CharField(max_length=200, blank=True, default="")
    department = models.CharField(max_length=200, blank=True, default="")
    reports_to = models.CharField(max_length=200, blank=True, default="")
    language = models.CharField(max_length=100, blank=True, default="")
    about = models.TextField(blank=True, default="")

    work_history = models.JSONField(default=list, blank=True)
    education = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.name
