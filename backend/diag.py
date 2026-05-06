import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()
from manufacturing.models import Plant, ProductionLine, Department, ResourceGroup, Resource

plant = Plant.objects.get(id=1)
lines_qs = ProductionLine.objects.filter(plant=plant)
rgs_qs = ResourceGroup.objects.filter(department__production_lines__plant=plant).distinct()

print("=== rgs_qs (global for plant 1) ===")
for rg in rgs_qs:
    print(f"  RG: {rg.name} dept_id={rg.department_id}")

print()
for line in lines_qs:
    print(f"Line: {line.name}")
    line_depts = Department.objects.filter(production_lines=line)
    for dept in line_depts:
        dept_rgs = rgs_qs.filter(department=dept)
        names = [r.name for r in dept_rgs]
        print(f"  Dept [{dept.id}] {dept.name} -> RGs: {names}")
