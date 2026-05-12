import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import Company
c = Company.objects.first()
print("=== CHAR FIELD VALUES ===")
for f in ["default_language", "default_calendar", "default_shift_model", "week_start_day", "industry_type", "phone", "email", "description", "default_timezone", "country"]:
    print(f"  {f}: {getattr(c, f, 'MISSING')!r}")
print()
print("=== FK FIELD IDS ===")
for f in ["default_language_id_id", "default_calendar_id_id", "default_shift_model_id_id", "week_start_day_id_id", "industry_type_id_id", "default_timezone_id_id", "status_id_id", "country_id_id"]:
    print(f"  {f}: {getattr(c, f, 'MISSING')!r}")
print()
print("=== M2M COUNTS ===")
print(f"  product_line_refs: {c.product_line_refs.count()}")
print(f"  lean_methodology_refs: {c.lean_methodology_refs.count()}")
