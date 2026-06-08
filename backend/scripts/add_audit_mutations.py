"""Add new audit mutations to api/mutations/manufacturing.py"""
import re

with open('api/mutations/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for new types if not present
if 'AuditAnswerNode' not in content:
    # Update the import line
    old_imports = """    AuditNode, AuditPayload, AuditInput, AuditUpdateInput,
    AuditChecklistItemNode, AuditChecklistItemPayload, AuditChecklistItemInput, AuditChecklistItemUpdateInput,
    AuditFindingNode, AuditFindingPayload, AuditFindingInput, AuditFindingUpdateInput,
    CreateAuditFromTemplateInput,"""
    new_imports = """    AuditNode, AuditPayload, AuditInput, AuditUpdateInput,
    AuditChecklistItemNode, AuditChecklistItemPayload, AuditChecklistItemInput, AuditChecklistItemUpdateInput,
    AuditFindingNode, AuditFindingPayload, AuditFindingInput, AuditFindingUpdateInput,
    AuditAnswerNode, AuditAnswerPayload,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,"""
    content = content.replace(old_imports, new_imports)

# Find the completeAudit mutation and add new mutations after it
# The pattern to find is the complete audit mutation
pattern = r'(@strawberry\.mutation\(name="completeAudit"\)\n\s+def complete_audit.*?return AuditPayload\(ok=False, errors=\[MutationError\(field=e\.field, code=e\.code, message=e\.message\)\]\)\n)'
match = re.search(pattern, content, re.DOTALL)
if match:
    complete_audit_end = match.end()
    new_mutations = '''
    # ── Audit Answer / Finding Mutations ──

    @strawberry.mutation(name="saveAuditAnswer")
    def save_audit_answer(self, info: Info, input: SaveAuditAnswerInput) -> "AuditAnswerPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            answer = AuditService.save_answer(
                audit_id=input.audit_id,
                question_id=input.question_id,
                value=input.answer_value,
                comment=input.comment,
                evidence=input.evidence_url or "",
            )
            return AuditAnswerPayload(ok=True, answer=AuditAnswerNode.from_db(answer))
        except AuditServiceError as e:
            return AuditAnswerPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="createAuditFindingFromAnswer")
    def create_audit_finding_from_answer(self, info: Info, input: CreateAuditFindingFromAnswerInput) -> "AuditFindingPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditService, AuditServiceError
        try:
            finding = AuditService.create_finding_from_answer(
                audit_id=input.audit_id,
                answer_id=input.answer_id,
                description=input.description,
                severity=input.severity,
                owner=input.owner,
                due_date=input.due_date,
            )
            return AuditFindingPayload(ok=True, finding=AuditFindingNode.from_db(finding))
        except AuditServiceError as e:
            return AuditFindingPayload(ok=False, errors=[MutationError(field=e.field, code=e.code, message=e.message)])

    @strawberry.mutation(name="installDefaultProductionControlAuditTemplates")
    def install_default_production_control_audit_templates(self, info: Info) -> "AuditInstallTemplatesPayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            count = AuditTemplateService.install_default_production_control_templates()
            return AuditInstallTemplatesPayload(ok=True, message=f"Installed {count} default production control audit templates")
        except Exception as e:
            return AuditInstallTemplatesPayload(ok=False, message=str(e))

    @strawberry.mutation(name="activateAuditTemplate")
    def activate_audit_template(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            template = AuditTemplateService.activate_template(int(id))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="ERROR", message=str(e))])

    @strawberry.mutation(name="archiveAuditTemplate")
    def archive_audit_template(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            template = AuditTemplateService.archive_template(int(id))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="ERROR", message=str(e))])

    @strawberry.mutation(name="cloneAuditTemplateVersion")
    def clone_audit_template_version(self, info: Info, id: str) -> "AuditTemplatePayload":
        ensure_access(user=_user(info), action="manage_audits")
        from manufacturing.domain.audit_service import AuditTemplateService
        try:
            template = AuditTemplateService.clone_template_version(int(id))
            return AuditTemplatePayload(ok=True, template=AuditTemplateNode.from_db(template))
        except Exception as e:
            return AuditTemplatePayload(ok=False, errors=[MutationError(field="id", code="ERROR", message=str(e))])
'''
    content = content[:complete_audit_end] + new_mutations + content[complete_audit_end:]

# Add new payload types if not present
if 'class AuditAnswerPayload' not in content:
    # Add AuditAnswerPayload before the next class after AuditPayload
    insert_after = 'class AuditFindingPayload:'
    insert_pos = content.find(insert_after)
    if insert_pos > 0:
        payload_types = '''

@strawberry.type
class AuditAnswerPayload:
    ok: bool
    answer: typing.Optional[AuditAnswerNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AuditInstallTemplatesPayload:
    ok: bool
    message: str = ""
    errors: list[MutationError] = strawberry.field(default_factory=list)

@strawberry.type
class AuditTemplatePayload:
    ok: bool
    template: typing.Optional[AuditTemplateNode] = None
    errors: list[MutationError] = strawberry.field(default_factory=list)
'''
        # Find the class definition line
        class_start = content.index('class AuditFindingPayload:\n', insert_pos)
        prev_newline = content.rfind('\n', 0, class_start - 2)
        content = content[:prev_newline+1] + payload_types + content[prev_newline+1:]

with open('api/mutations/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: Updated api/mutations/manufacturing.py with new audit mutations")
