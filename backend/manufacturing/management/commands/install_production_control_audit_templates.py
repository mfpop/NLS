from django.core.management.base import BaseCommand
from manufacturing.domain.audit_service import AuditTemplateService


class Command(BaseCommand):
    help = "Install default Production Control audit templates (idempotent)"

    def handle(self, *args, **options):
        templates = AuditTemplateService.install_default_production_control_templates()
        total_cats = 0
        total_questions = 0
        for t in templates:
            cats = t.categories.count()
            questions = sum(c.questions.count() for c in t.categories.all())
            total_cats += cats
            total_questions += questions
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [{t.code}] {t.name} v{t.version} ({cats} sections, {questions} questions)"
                )
            )
        self.stdout.write(
            self.style.SUCCESS(
                f"\nInstalled {len(templates)} Production Control audit templates "
                f"({total_cats} sections, {total_questions} questions)"
            )
        )
