import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import ReferenceCategory, ReferenceValue

for cat_code in ["country", "timezone", "shift_model", "language_locale", "calendar", "industry_type", "week_start_day"]:
    try:
        cat = ReferenceCategory.objects.get(code=cat_code)
        vals = ReferenceValue.objects.filter(category=cat).order_by("sort_order")
        print(f"\n=== {cat_code} ({vals.count()} values) ===")
        for v in vals:
            print(f"  id={v.id} name={v.name!r} code={v.code!r}")
    except ReferenceCategory.DoesNotExist:
        print(f"\n=== {cat_code}: CATEGORY NOT FOUND ===")
