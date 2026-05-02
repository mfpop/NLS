from django.db import models
ECHO is off.
class TimeStampedModel(models.Model
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
ECHO is off.
    class Meta
        abstract = True
