from django.core.management.base import BaseCommand
from manufacturing.domain.audit_service import AuditTemplateService


class Command(BaseCommand):
    help = "Install default Quality Control audit templates"

    def handle(self, *args, **options):
        created = AuditTemplateService.install_default_quality_control_templates()
        for t in created:
            sections = t.categories.count()
            questions = sum(c.questions.count() for c in t.categories.all())
            self.stdout.write(f"  [{t.code}] {t.name} v{t.version} ({sections} sections, {questions} questions)")
        self.stdout.write(self.style.SUCCESS(f"\nInstalled {len(created)} Quality Control audit templates"))
