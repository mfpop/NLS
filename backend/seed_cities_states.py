"""Add city and state reference categories with sample data."""
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import ReferenceCategory, ReferenceValue
from manufacturing.models import Company

# ── State category ──
state_cat, _ = ReferenceCategory.objects.get_or_create(
    code="state",
    defaults={"name": "State / Province", "description": "US states and territories", "status": "ACTIVE"},
)
states = [
    ("AL", "Alabama"), ("AK", "Alaska"), ("AZ", "Arizona"), ("AR", "Arkansas"),
    ("CA", "California"), ("CO", "Colorado"), ("CT", "Connecticut"), ("DE", "Delaware"),
    ("FL", "Florida"), ("GA", "Georgia"), ("HI", "Hawaii"), ("ID", "Idaho"),
    ("IL", "Illinois"), ("IN", "Indiana"), ("IA", "Iowa"), ("KS", "Kansas"),
    ("KY", "Kentucky"), ("LA", "Louisiana"), ("ME", "Maine"), ("MD", "Maryland"),
    ("MA", "Massachusetts"), ("MI", "Michigan"), ("MN", "Minnesota"), ("MS", "Mississippi"),
    ("MO", "Missouri"), ("MT", "Montana"), ("NE", "Nebraska"), ("NV", "Nevada"),
    ("NH", "New Hampshire"), ("NJ", "New Jersey"), ("NM", "New Mexico"), ("NY", "New York"),
    ("NC", "North Carolina"), ("ND", "North Dakota"), ("OH", "Ohio"), ("OK", "Oklahoma"),
    ("OR", "Oregon"), ("PA", "Pennsylvania"), ("RI", "Rhode Island"), ("SC", "South Carolina"),
    ("SD", "South Dakota"), ("TN", "Tennessee"), ("TX", "Texas"), ("UT", "Utah"),
    ("VT", "Vermont"), ("VA", "Virginia"), ("WA", "Washington"), ("WV", "West Virginia"),
    ("WI", "Wisconsin"), ("WY", "Wyoming"),
]
for i, (code, name) in enumerate(states):
    ReferenceValue.objects.get_or_create(
        category=state_cat, code=code,
        defaults={"name": name, "sort_order": i, "is_active": True, "status": "ACTIVE"},
    )
print(f"State: {len(states)} values created")

# ── City category ──
city_cat, _ = ReferenceCategory.objects.get_or_create(
    code="city",
    defaults={"name": "City", "description": "Common US cities", "status": "ACTIVE"},
)
cities = [
    ("santa_fe_springs", "Santa Fe Springs"),
    ("los_angeles", "Los Angeles"),
    ("chicago", "Chicago"),
    ("houston", "Houston"),
    ("phoenix", "Phoenix"),
    ("philadelphia", "Philadelphia"),
    ("san_antonio", "San Antonio"),
    ("san_diego", "San Diego"),
    ("dallas", "Dallas"),
    ("san_jose", "San Jose"),
    ("austin", "Austin"),
    ("jacksonville", "Jacksonville"),
    ("fort_worth", "Fort Worth"),
    ("columbus", "Columbus"),
    ("charlotte", "Charlotte"),
    ("indianapolis", "Indianapolis"),
    ("denver", "Denver"),
    ("seattle", "Seattle"),
    ("nashville", "Nashville"),
    ("oklahoma_city", "Oklahoma City"),
    ("el_paso", "El Paso"),
    ("washington", "Washington"),
    ("boston", "Boston"),
    ("las_vegas", "Las Vegas"),
    ("portland", "Portland"),
    ("memphis", "Memphis"),
    ("louisville", "Louisville"),
    ("baltimore", "Baltimore"),
    ("milwaukee", "Milwaukee"),
    ("albuquerque", "Albuquerque"),
    ("tucson", "Tucson"),
    ("fresno", "Fresno"),
    ("sacramento", "Sacramento"),
    ("kansas_city", "Kansas City"),
    ("mesa", "Mesa"),
    ("atlanta", "Atlanta"),
    ("omaha", "Omaha"),
    ("colorado_springs", "Colorado Springs"),
    ("raleigh", "Raleigh"),
    ("long_beach", "Long Beach"),
    ("virginia_beach", "Virginia Beach"),
    ("miami", "Miami"),
    ("oakland", "Oakland"),
    ("minneapolis", "Minneapolis"),
    ("tampa", "Tampa"),
    ("tulsa", "Tulsa"),
    ("arlington", "Arlington"),
    ("new_orleans", "New Orleans"),
    ("cleveland", "Cleveland"),
    ("bakersfield", "Bakersfield"),
]
for i, (code, name) in enumerate(cities):
    ReferenceValue.objects.get_or_create(
        category=city_cat, code=code,
        defaults={"name": name, "sort_order": i, "is_active": True, "status": "ACTIVE"},
    )
print(f"City: {len(cities)} values created")

# ── Update company with real Maxon data ──
c = Company.objects.first()
if c:
    c.name = "Maxon Lift Corp."
    c.code = "MAXON"
    c.legal_name = "Maxon Lift Corporation"
    c.description = "Maxon Lift Corp. is the leading manufacturer of liftgates for the trucking industry. Since 1957, when Max Lugash invented the first Tuk-A-Way lift, we have been driven by innovation. Our product line includes Light Duty liftgates, Railift, Conventional, Tuk-A-Way, Slidelift, Columnlift, Gas Bottle, Max Link OBD, and Charging Solutions."
    c.industry_type = "Liftgate Manufacturing"
    c.address = "11921 Slauson Avenue"
    c.city = "Santa Fe Springs"
    c.state = "CA"
    c.country = "USA"
    c.zipcode = "90670-2221"
    c.phone = "800.227.4116"
    c.email = "info@maxonlift.com"
    c.website = "https://www.maxonlift.com"
    c.admin_name = "Max Lugash"
    c.admin_role = "Founder"
    c.operating_since = "1957"
    c.save()
    print(f"Company updated: {c.name}")
else:
    print("No company found to update")

print("Done.")
