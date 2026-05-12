import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import ReferenceCategory, ReferenceValue

cat = ReferenceCategory.objects.get(code="city")
for c in ["monterrey", "tijuana", "mexicali", "guadalupe_nl"]:
    try:
        rv = ReferenceValue.objects.get(category=cat, code=c)
        meta = rv.metadata or {}
        print(f"  city {c}: {rv.name} state={meta.get('state_code','?')} country={meta.get('country_code','?')}")
    except ReferenceValue.DoesNotExist:
        print(f"  city {c}: NOT FOUND")

cat2 = ReferenceCategory.objects.get(code="state")
for s in ["NLE", "BCN", "CMX"]:
    try:
        rv = ReferenceValue.objects.get(category=cat2, code=s)
        meta = rv.metadata or {}
        print(f"  state {s}: {rv.name} country={meta.get('country_code','?')}")
    except ReferenceValue.DoesNotExist:
        print(f"  state {s}: NOT FOUND")
