"""Seed VSM demo data: active routing with 6 process steps on C2-Cylinder Assembly line."""

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password


class Command(BaseCommand):
    help = "Seed routing data for VSM demo on C2-Cylinder Assembly line"

    def handle(self, *args, **options):
        from manufacturing.models import ProductionLine, Department, ResourceGroup
        from manufacturing.models.routing import (
            Routing, RoutingStep, RoutingStatus,
            ProductModel, ProductFamily, PartNumber,
        )

        # ── Product Family & Model ──
        family, _ = ProductFamily.objects.get_or_create(
            code="CYL-A", defaults=dict(name="Cylinder Assembly Type-A", is_active=True),
        )
        model, _ = ProductModel.objects.get_or_create(
            code="CYL-TYPE-B", defaults=dict(name="Cylinder Assembly Type-B", family=family),
        )

        # ── Production Line ──
        line = ProductionLine.objects.get(code="C2-CA")

        # ── Active Routing ──
        if Routing.objects.filter(production_line=line, status=RoutingStatus.ACTIVE).exists():
            self.stdout.write("  Active routing already exists for C2-LN, skipping.")
            return

        routing = Routing.objects.create(
            production_line=line,
            product_model=model,
            version="1.0",
            status=RoutingStatus.ACTIVE,
            notes="Standard VSM demo routing",
        )

        # ── Map department codes to departments under the same plant ──
        dept_map = {d.code: d for d in Department.objects.filter(plant=line.plant)}

        # ── Map resource group codes ──
        rg_map = {rg.code: rg for rg in ResourceGroup.objects.filter(department__plant=line.plant)}

        steps_data = [
            dict(
                sequence=1,
                department=dept_map.get("MCH"),
                resource_group=rg_map.get("RG-SETUP"),
                cycle_time_sec=28.0,
                changeover_time_sec=600.0,
                required_operators=1,
                wip_min=0,
                wip_max=80,
                notes="Cutting operation",
            ),
            dict(
                sequence=2,
                department=dept_map.get("MCH"),
                resource_group=rg_map.get("RG-SET"),
                cycle_time_sec=45.0,
                changeover_time_sec=1800.0,
                required_operators=2,
                wip_min=80,
                wip_max=120,
                notes="Precision machining — bottleneck",
            ),
            dict(
                sequence=3,
                department=dept_map.get("LOG"),
                resource_group=rg_map.get("RG-MAT"),
                cycle_time_sec=15.0,
                changeover_time_sec=120.0,
                required_operators=1,
                wip_min=60,
                wip_max=40,
                notes="Material handling",
            ),
            dict(
                sequence=4,
                department=dept_map.get("QC"),
                resource_group=rg_map.get("RG-QC"),
                cycle_time_sec=35.0,
                changeover_time_sec=0.0,
                required_operators=1,
                wip_min=40,
                wip_max=30,
                notes="Quality inspection",
            ),
            dict(
                sequence=5,
                department=dept_map.get("ASM"),
                resource_group=rg_map.get("RG312"),
                cycle_time_sec=42.0,
                changeover_time_sec=900.0,
                required_operators=2,
                wip_min=30,
                wip_max=50,
                notes="Final assembly",
            ),
            dict(
                sequence=6,
                department=dept_map.get("PKG"),
                resource_group=rg_map.get("RG219"),
                cycle_time_sec=38.0,
                changeover_time_sec=300.0,
                required_operators=1,
                wip_min=50,
                wip_max=0,
                notes="Testing and packaging",
            ),
        ]

        for sd in steps_data:
            RoutingStep.objects.create(routing=routing, **sd)

        self.stdout.write(self.style.SUCCESS(
            f"  Created routing v1.0 with {len(steps_data)} steps on {line.name}"
        ))
