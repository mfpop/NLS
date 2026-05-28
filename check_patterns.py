import os, sys, django
sys.path.insert(0, "backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from manufacturing.models.erp_import_pattern import ErpImportPattern, ErpImportPatternFieldMapping

patterns = ErpImportPattern.objects.all().order_by("-created_at")
print(f"Total patterns: {patterns.count()}")
print("---")
for p in patterns:
    print(f"  ID={p.id}, Name={p.name}, Scope={p.scope}, Dest={p.destination_entity}, File={p.source_file_pattern}")
    print(f"  PlantSelection={p.plant_selection}, DeptSelection={p.department_selection}, RGSelection={p.resource_group_selection}")
    mappings = ErpImportPatternFieldMapping.objects.filter(pattern=p)
    print(f"  Mappings: {mappings.count()}")
    for m in mappings.order_by("sort_order")[:8]:
        print(f"    {m.source_name} ({m.source_data_type}) -> {m.destination_name} ({m.destination_data_type}) req={m.is_required}")
    print()
