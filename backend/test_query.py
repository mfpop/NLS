import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from api.schema import schema

q = "query { company { name productLineRefs { id name } leanMethodologyRefs { id name } } }"
r = schema.execute_sync(q)
c = r.data["company"]
print("name:", c["name"])
pl = c.get("productLineRefs") or []
print("product lines:", len(pl), [p["name"] for p in pl])
lm = c.get("leanMethodologyRefs") or []
print("lean methods:", len(lm), [p["name"] for p in lm])
