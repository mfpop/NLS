from django.core.management.base import BaseCommand
from manufacturing.models.company import Company


DATA = {
    "code": "MLC",
    "name": "Maxon Lift Corp.",
    "legal_name": "Maxon Lift Corporation",
    "address": "11921 Slauson Avenue",
    "city": "Santa Fe Springs",
    "state": "CA",
    "country": "USA",
    "zipcode": "90670",
    "phone": "800.227.4116",
    "email": "info@maxonlift.com",
    "website": "https://www.maxonlift.com",
    "description": "Since 1957, Maxon has been the leader in liftgates. Beginning with the first Tuk-A-Way, we have constantly worked to make your life easier with innovative products that offer workhorse performance, coupled with seamless support through a network of industry professionals. We are a family-owned company, the largest single-brand manufacturer of liftgates in the world.",
    "industry_type": "Liftgate Manufacturing",
    "operating_since": "1957-01-01",
    "manufacturing_focus": "Lean, TPS, Kaizen, VSM",
    "product_lines": "Light Duty, Railift, Tuk-A-Way, Slidelift, Columnlift, Gas Bottle",
    "lean_methodology": "Lean, Six Sigma, TPS, Kaizen",
    "default_timezone": "America/Los_Angeles",
    "default_language": "English",
    "default_calendar": "Standard (Mon-Fri)",
    "default_shift_model": "Single Day Shift",
    "week_start_day": "Monday",
    "admin_name": "Max Lugash",
    "admin_role": "Founder & Inventor",
}


class Command(BaseCommand):
    help = "Seed single manufacturing organization"

    def handle(self, *args, **options):
        company = Company.objects.first()
        if company:
            for k, v in DATA.items():
                setattr(company, k, v)
            company.save()
            self.stdout.write(f"Updated company: {company.name}")
        else:
            Company.objects.create(**DATA)
            self.stdout.write(self.style.SUCCESS(f"Created company: {DATA['name']}"))
