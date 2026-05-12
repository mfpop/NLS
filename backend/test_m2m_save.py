import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from api.schema import schema

mutation = """
mutation {
  updateCompany(input: {
    productLineIds: ["75", "76"],
    leanMethodologyIds: ["80", "81"]
  }) {
    ok
    company {
      id
      name
      productLineRefs { id name }
      leanMethodologyRefs { id name }
    }
    errors { field message }
  }
}
"""

result = schema.execute_sync(mutation)
d = result.data["updateCompany"]
print(f"ok: {d['ok']}")
c = d["company"]
pl = c.get("productLineRefs") or []
print(f"product lines ({len(pl)}): {[p['name'] for p in pl]}")
lm = c.get("leanMethodologyRefs") or []
print(f"lean methods ({len(lm)}): {[p['name'] for p in lm]}")
if d.get("errors"):
    for e in d["errors"]:
        print(f"  error: {e['message']}")

# Verify in database
from manufacturing.models import Company
company = Company.objects.first()
db_pl = list(company.product_line_refs.all())
print(f"\nDB check - product_line_refs count: {len(db_pl)}")
db_lm = list(company.lean_methodology_refs.all())
print(f"DB check - lean_methodology_refs count: {len(db_lm)}")
