"""Add Mexican states and cities to reference tables, linked to country MX."""
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from manufacturing.models import ReferenceCategory, ReferenceValue
from django.db import models

# ── Get or create Mexico country reference ──
country_cat = ReferenceCategory.objects.get(code="country")
mx, _ = ReferenceValue.objects.get_or_create(
    category=country_cat, code="MX",
    defaults={"name": "Mexico", "sort_order": 2, "is_active": True, "status": "ACTIVE"},
)
print(f"Mexico country: id={mx.id}")

# ── Get or create state category ──
state_cat, _ = ReferenceCategory.objects.get_or_create(
    code="state",
    defaults={"name": "State / Province", "description": "States and provinces", "status": "ACTIVE"},
)

# ── Mexican states ──
mx_states = [
    ("AGU", "Aguascalientes"), ("BCN", "Baja California"), ("BCS", "Baja California Sur"),
    ("CAM", "Campeche"), ("CHP", "Chiapas"), ("CHH", "Chihuahua"),
    ("CMX", "Ciudad de México"), ("COA", "Coahuila"), ("COL", "Colima"),
    ("DUR", "Durango"), ("GUA", "Guanajuato"), ("GRO", "Guerrero"),
    ("HID", "Hidalgo"), ("JAL", "Jalisco"), ("MEX", "Estado de México"),
    ("MIC", "Michoacán"), ("MOR", "Morelos"), ("NAY", "Nayarit"),
    ("NLE", "Nuevo León"), ("OAX", "Oaxaca"), ("PUE", "Puebla"),
    ("QUE", "Querétaro"), ("ROO", "Quintana Roo"), ("SLP", "San Luis Potosí"),
    ("SIN", "Sinaloa"), ("SON", "Sonora"), ("TAB", "Tabasco"),
    ("TAM", "Tamaulipas"), ("TLA", "Tlaxcala"), ("VER", "Veracruz"),
    ("YUC", "Yucatán"), ("ZAC", "Zacatecas"),
]
for i, (code, name) in enumerate(mx_states):
    rv, created = ReferenceValue.objects.get_or_create(
        category=state_cat, code=code,
        defaults={"name": name, "sort_order": 100 + i, "is_active": True, "status": "ACTIVE"},
    )
    rv.metadata = {"country_code": "MX"}
    rv.save(update_fields=["metadata"])
print(f"Mexican states: {len(mx_states)} created/updated")

# ── Mexican cities with state linkage ──
city_cat, _ = ReferenceCategory.objects.get_or_create(
    code="city",
    defaults={"name": "City", "description": "Cities and towns", "status": "ACTIVE"},
)

mx_cities = [
    ("monterrey", "Monterrey", "NLE"),
    ("guadalupe_nl", "Guadalupe", "NLE"),
    ("san_nicolas", "San Nicolás de los Garza", "NLE"),
    ("san_pedro", "San Pedro Garza García", "NLE"),
    ("apodaca", "Apodaca", "NLE"),
    ("escobedo", "General Escobedo", "NLE"),
    ("santa_catarina", "Santa Catarina", "NLE"),
    ("juarez_nl", "Monterrey (Área Metropolitana)", "NLE"),

    ("tijuana", "Tijuana", "BCN"),
    ("mexicali", "Mexicali", "BCN"),
    ("ensenada", "Ensenada", "BCN"),
    ("tecate", "Tecate", "BCN"),
    ("rosarito", "Playas de Rosarito", "BCN"),

    ("cdmx", "Ciudad de México", "CMX"),
    ("guadalajara", "Guadalajara", "JAL"),
    ("zapopan", "Zapopan", "JAL"),
    ("zapopan", "Zapopan", "JAL"),
    ("puerto_vallarta", "Puerto Vallarta", "JAL"),

    ("chihuahua_city", "Chihuahua", "CHH"),
    ("ciudad_juarez", "Ciudad Juárez", "CHH"),

    ("puebla_city", "Puebla", "PUE"),
    ("queretaro", "Santiago de Querétaro", "QUE"),
    ("leon", "León", "GUA"),
    ("celaya", "Celaya", "GUA"),
    ("salamanca_gua", "Salamanca", "GUA"),

    ("toluca", "Toluca", "MEX"),
    ("cuernavaca", "Cuernavaca", "MOR"),
    ("aguascalientes_city", "Aguascalientes", "AGU"),
    ("saltillo", "Saltillo", "COA"),
    ("torreon", "Torreón", "COA"),
    ("durango_city", "Victoria de Durango", "DUR"),
    ("morelia", "Morelia", "MIC"),
    ("oaxaca_city", "Oaxaca de Juárez", "OAX"),
    ("hermosillo", "Hermosillo", "SON"),
    ("cancun", "Cancún", "ROO"),
    ("merida", "Mérida", "YUC"),
    ("veracruz_city", "Veracruz", "VER"),
    ("xalapa", "Xalapa", "VER"),
    ("san_luis_potosi", "San Luis Potosí", "SLP"),
    ("culiacan", "Culiacán", "SIN"),
    ("mazatlan", "Mazatlán", "SIN"),
    ("tampico", "Tampico", "TAM"),
    ("villahermosa", "Villahermosa", "TAB"),
    ("campeche_city", "San Francisco de Campeche", "CAM"),
    ("colima_city", "Colima", "COL"),
    ("tepic", "Tepic", "NAY"),
    ("la_paz_bcs", "La Paz", "BCS"),
    ("zacatecas_city", "Zacatecas", "ZAC"),
    ("pachuca", "Pachuca", "HID"),
    ("tlaxcala_city", "Tlaxcala", "TLA"),
]

# Get max existing sort_order for cities
max_sort = ReferenceValue.objects.filter(category=city_cat).aggregate(m=models.Max("sort_order"))["m"] or 0

for i, (code, name, state_code) in enumerate(mx_cities):
    rv, created = ReferenceValue.objects.get_or_create(
        category=city_cat, code=code,
        defaults={"name": name, "sort_order": max_sort + 1 + i, "is_active": True, "status": "ACTIVE"},
    )
    rv.metadata = {"state_code": state_code, "country_code": "MX"}
    rv.save(update_fields=["metadata"])
print(f"Mexican cities: {len(mx_cities)} created/updated")
print("Done.")
