"""Link cities to states and states to countries via metadata."""
import django, os, json
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import ReferenceCategory, ReferenceValue

# ── Link states to country ──
state_cat = ReferenceCategory.objects.get(code="state")
for rv in ReferenceValue.objects.filter(category=state_cat):
    meta = {"country_code": "US"}
    rv.metadata = meta
    rv.save(update_fields=["metadata"])
print(f"Linked {ReferenceValue.objects.filter(category=state_cat).count()} states to US")

# ── Link cities to state ──
city_state_map = {
    "santa_fe_springs": "CA", "los_angeles": "CA", "long_beach": "CA",
    "san_diego": "CA", "san_jose": "CA", "fresno": "CA", "sacramento": "CA",
    "oakland": "CA", "bakersfield": "CA",
    "chicago": "IL",
    "houston": "TX", "dallas": "TX", "san_antonio": "TX", "austin": "TX",
    "fort_worth": "TX", "arlington": "TX", "el_paso": "TX",
    "phoenix": "AZ", "mesa": "AZ", "tucson": "AZ",
    "philadelphia": "PA",
    "jacksonville": "FL", "miami": "FL", "tampa": "FL",
    "columbus": "OH", "cleveland": "OH",
    "charlotte": "NC", "raleigh": "NC",
    "indianapolis": "IN",
    "denver": "CO", "colorado_springs": "CO",
    "seattle": "WA",
    "nashville": "TN", "memphis": "TN",
    "oklahoma_city": "OK", "tulsa": "OK",
    "washington": "DC",
    "boston": "MA",
    "las_vegas": "NV",
    "portland": "OR",
    "louisville": "KY",
    "baltimore": "MD",
    "milwaukee": "WI",
    "albuquerque": "NM",
    "kansas_city": "MO",
    "atlanta": "GA",
    "omaha": "NE",
    "virginia_beach": "VA",
    "minneapolis": "MN",
    "new_orleans": "LA",
}

cat = ReferenceCategory.objects.get(code="city")
updated = 0
for code, state_code in city_state_map.items():
    try:
        rv = ReferenceValue.objects.get(category=cat, code=code)
        meta = {"state_code": state_code, "country_code": "US"}
        rv.metadata = meta
        rv.save(update_fields=["metadata"])
        updated += 1
    except ReferenceValue.DoesNotExist:
        print(f"  WARNING: city '{code}' not found")
print(f"Linked {updated} cities to states")
print("Done.")
