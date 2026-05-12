"""Add missing reference values that existing company data depends on."""
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import ReferenceCategory, ReferenceValue

# Add "Single Day Shift" to shift_model category
cat = ReferenceCategory.objects.get(code="shift_model")
rv, created = ReferenceValue.objects.get_or_create(
    category=cat,
    code="single_day_shift",
    defaults={
        "name": "Single Day Shift",
        "description": "Single daytime shift",
        "sort_order": 1,
        "is_active": True,
        "status": "ACTIVE",
    },
)
if created:
    print(f"Created shift_model: 'Single Day Shift' (id={rv.id})")
else:
    print(f"shift_model 'Single Day Shift' already exists (id={rv.id})")
