from django.core.management.base import BaseCommand
from manufacturing.models.company import Company


class Command(BaseCommand):
    help = "Seed the manufacturing organization with demo data"

    def handle(self, *args, **options):
        company, created = Company.objects.get_or_create(
            code="LMD",
            defaults={
                "name": "Lean Manufacturing Demo",
                "address": "1250 Innovation Drive, Suite 200, Detroit, MI 48207",
                "phone": "+1 (313) 555-0142",
                "email": "info@leanmfgdemo.com",
                "website": "https://www.leanmfgdemo.com",
                "description": "Lean Manufacturing Demo is a world-class manufacturer of precision automotive components and industrial assemblies. Operating since 2018, the facility produces cylinder heads, transmission housings, and brake systems for Tier-1 automotive suppliers using Lean, TPS, and Six Sigma methodologies across 4 production lines and 12 work cells.",
                "industry_type": "automotive",
                "manufacturing_type": "discrete",
                "default_timezone": "America/Detroit",
                "default_units": "metric",
                "default_shift_model": "2_shift",
                "production_calendar": "standard_5day",
                "default_language": "en",
                "lean_methodology": "lean_six_sigma",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created company: {company.name}"))
        else:
            self.stdout.write(f"Company already exists: {company.name}")
