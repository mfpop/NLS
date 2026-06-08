from django.core.management.base import BaseCommand
from manufacturing.domain.audit_service import AuditTemplateService


class Command(BaseCommand):
    help = "Seed audit templates (5S Manufacturing Basic)"

    def handle(self, *args, **options):
        template = AuditTemplateService.seed_5s_template()
        cat_count = template.categories.count()
        q_count = sum(c.questions.count() for c in template.categories.all())
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded template '{template.code}' "
                f"({cat_count} categories, {q_count} questions)"
            )
        )
