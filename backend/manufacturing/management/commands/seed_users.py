from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from manufacturing.models import UserRole, Profile


class Command(BaseCommand):
    help = "Seed development users with roles and sample profile data"

    def handle(self, *args, **options):
        users_data = [
            {
                "username": "admin",
                "password": "admin123",
                "role": UserRole.RoleType.DB_ADMIN,
                "plant": "",
                "department": "",
                "profile": {
                    "name": "Alex Chen",
                    "role": "Database Administrator",
                    "email": "admin@leansync.com",
                    "phone": "+1 (313) 555-0100",
                    "location": "Detroit, Michigan, USA",
                    "about": "Database infrastructure and system architecture lead responsible for manufacturing data platforms, integration pipelines, and system reliability across all plants.",
                    "work_history": [
                        {"id": "a1", "role": "Database Administrator", "company": "LeanSync Manufacturing", "period": "2022 - Present", "description": "Manage SQL and time-series databases across 3 plants. Reduced query latency by 40% through index optimization and introduced automated backup recovery procedures."},
                        {"id": "a2", "role": "Senior Data Engineer", "company": "DataFlow Systems", "period": "2019 - 2022", "description": "Built ETL pipelines processing 2M+ records daily. Designed star-schema data warehouse for manufacturing KPIs and OEE reporting."},
                        {"id": "a3", "role": "IT Analyst", "company": "AutoMotion Components", "period": "2016 - 2019", "description": "Supported MES and ERP integration. Automated data collection from 200+ PLCs across assembly lines reducing manual entry by 90%."},
                    ],
                    "education": [
                        {"id": "ae1", "degree": "M.Sc. Computer Science", "school": "University of Michigan", "period": "2014 - 2016"},
                        {"id": "ae2", "degree": "B.Sc. Information Systems", "school": "Michigan State University", "period": "2010 - 2014"},
                    ],
                },
            },
            {
                "username": "owner",
                "password": "owner123",
                "role": UserRole.RoleType.APP_OWNER,
                "plant": "",
                "department": "",
                "profile": {
                    "name": "Sarah Mitchell",
                    "role": "Application Owner",
                    "email": "owner@leansync.com",
                    "phone": "+1 (313) 555-0200",
                    "location": "Toledo, Ohio, USA",
                    "about": "Application portfolio owner driving digital transformation across the manufacturing network. Responsible for system architecture, vendor management, and continuous improvement of the LeanSync platform.",
                    "work_history": [
                        {"id": "o1", "role": "Application Owner", "company": "LeanSync Manufacturing", "period": "2023 - Present", "description": "Own the LeanSync platform roadmap. Delivered 12 major releases in first year. Improved user adoption from 45% to 82% through targeted training and UX enhancements."},
                        {"id": "o2", "role": "IT Program Manager", "company": "Northline Industrial", "period": "2020 - 2023", "description": "Managed $4M digital transformation portfolio spanning MES upgrade, WMS implementation, and shopfloor connectivity. All projects delivered on time and within budget."},
                        {"id": "o3", "role": "Business Analyst Lead", "company": "PwC Consulting", "period": "2016 - 2020", "description": "Led manufacturing technology assessments for 15+ clients across automotive, aerospace, and consumer goods. Identified $20M+ in operational savings through digital recommendations."},
                    ],
                    "education": [
                        {"id": "oe1", "degree": "MBA Operations Management", "school": "Ross School of Business", "period": "2014 - 2016"},
                        {"id": "oe2", "degree": "B.Eng. Industrial Engineering", "school": "Purdue University", "period": "2010 - 2014"},
                    ],
                },
            },
            {
                "username": "manager",
                "password": "manager123",
                "role": UserRole.RoleType.DEPT_MANAGER,
                "plant": "Detroit Plant",
                "department": "Assembly",
                "profile": {
                    "name": "James Wilson",
                    "role": "Assembly Department Manager",
                    "email": "manager@leansync.com",
                    "phone": "+1 (313) 555-0300",
                    "location": "Detroit, Michigan, USA",
                    "about": "Assembly department manager with 12 years of experience in high-volume automotive manufacturing. Focused on lean methodologies, OEE improvement, and building high-performing shift teams.",
                    "work_history": [
                        {"id": "m1", "role": "Assembly Department Manager", "company": "LeanSync Manufacturing", "period": "2021 - Present", "description": "Manage 85 team members across 3 shifts. Improved OEE from 62% to 79% through standardized work, quick changeover programs, and layered process audits. Reduced defect rate by 34%."},
                        {"id": "m2", "role": "Production Shift Supervisor", "company": "AutoMotion Components", "period": "2017 - 2021", "description": "Supervised 30 operators on engine assembly line. Achieved 98.5% schedule attainment for 18 consecutive months. Led kaizen events that reduced changeover time by 40%."},
                        {"id": "m3", "role": "Manufacturing Engineer", "company": "Midwest Automotive", "period": "2013 - 2017", "description": "Designed assembly workstation layouts reducing motion waste by 25%. Implemented poke-yoke devices that eliminated 3 recurring quality issues."},
                    ],
                    "education": [
                        {"id": "me1", "degree": "B.Sc. Manufacturing Engineering", "school": "Kettering University", "period": "2009 - 2013"},
                    ],
                },
            },
            {
                "username": "supervisor",
                "password": "super123",
                "role": UserRole.RoleType.SUPERVISOR,
                "plant": "Detroit Plant",
                "department": "Assembly",
                "profile": {
                    "name": "Maria Garcia",
                    "role": "Assembly Line Supervisor",
                    "email": "supervisor@leansync.com",
                    "phone": "+1 (313) 555-0400",
                    "location": "Dearborn, Michigan, USA",
                    "about": "Dedicated production supervisor committed to safety, quality, and continuous improvement. Skilled in leading shift teams, conducting gemba walks, and maintaining visual management boards.",
                    "work_history": [
                        {"id": "s1", "role": "Assembly Line Supervisor", "company": "LeanSync Manufacturing", "period": "2022 - Present", "description": "Lead 25 operators on final assembly line. Maintain 98%+ quality rating for 12 consecutive months. Implemented daily accountability board that improved shift handoff communication."},
                        {"id": "s2", "role": "Team Lead", "company": "AutoMotion Components", "period": "2019 - 2022", "description": "Coordinated 8-person assembly team. Trained 15 new hires on standardized work procedures. Recognized as top performer for safety incident reduction."},
                        {"id": "s3", "role": "Assembly Technician", "company": "Precision Parts Inc.", "period": "2016 - 2019", "description": "Performed complex assembly operations on transmission lines. Achieved zero-defect record for 6 months. Suggested process improvements adopted across 2 shifts."},
                    ],
                    "education": [
                        {"id": "se1", "degree": "A.A.S. Manufacturing Technology", "school": "Henry Ford College", "period": "2014 - 2016"},
                    ],
                },
            },
            {
                "username": "guest",
                "password": "guest123",
                "role": UserRole.RoleType.GUEST,
                "plant": "",
                "department": "",
                "profile": {
                    "name": "Taylor Reed",
                    "role": "External Auditor",
                    "email": "guest@leansync.com",
                    "phone": "+1 (248) 555-0500",
                    "location": "Ann Arbor, Michigan, USA",
                    "about": "External quality and compliance auditor reviewing manufacturing processes, documentation, and system controls for ISO 9001 certification maintenance.",
                    "work_history": [
                        {"id": "g1", "role": "Quality Auditor", "company": "Independent Contractor", "period": "2020 - Present", "description": "Conduct ISO 9001 surveillance audits for 8 manufacturing sites annually. Average audit score of 94%. Identified 50+ improvement opportunities yearly."},
                        {"id": "g2", "role": "Quality Engineer", "company": "Tier 1 Automotive Supplier", "period": "2016 - 2020", "description": "Managed PPAP and FMEA processes for 30+ part numbers. Reduced customer PPM from 850 to 120 over 3 years. Led root cause analysis for major quality incidents."},
                    ],
                    "education": [
                        {"id": "ge1", "degree": "B.Sc. Quality Management", "school": "Eastern Michigan University", "period": "2012 - 2016"},
                    ],
                },
            },
        ]

        for data in users_data:
            user, created = User.objects.get_or_create(username=data["username"])
            if created:
                user.set_password(data["password"])
                user.email = data["profile"]["email"]
                user.first_name = data["profile"]["name"].split(" ")[0]
                user.last_name = data["profile"]["name"].split(" ")[-1]
                user.save()
                UserRole.objects.get_or_create(
                    user=user,
                    defaults={
                        "role": data["role"],
                        "plant": data["plant"],
                        "department": data["department"],
                    },
                )
                self.stdout.write(self.style.SUCCESS(f"Created user: {data['username']}"))
            else:
                user.email = data["profile"]["email"]
                user.first_name = data["profile"]["name"].split(" ")[0]
                user.last_name = data["profile"]["name"].split(" ")[-1]
                user.set_password(data["password"])
                user.save()
                UserRole.objects.update_or_create(
                    user=user,
                    defaults={
                        "role": data["role"],
                        "plant": data["plant"],
                        "department": data["department"],
                    },
                )
                self.stdout.write(f"Updated user: {data['username']}")

            p = data["profile"]
            Profile.objects.update_or_create(
                user=user,
                defaults={
                    "name": p["name"],
                    "role": p["role"],
                    "email": p["email"],
                    "phone": p["phone"],
                    "location": p["location"],
                    "about": p["about"],
                    "work_history": p["work_history"],
                    "education": p["education"],
                },
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(users_data)} users with sample profiles"))
