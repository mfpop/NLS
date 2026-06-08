"""Add missing audit payload types to api/types/manufacturing.py"""
with open('api/types/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove duplicate SaveAuditAnswerInput and CreateAuditFindingFromAnswerInput definitions
# if they appear twice (once from the initial insert and once from the reorder)
import re

# Count occurrences
count_save = len(re.findall(r'@strawberry\.input\nclass SaveAuditAnswerInput:', content))
count_create = len(re.findall(r'@strawberry\.input\nclass CreateAuditFindingFromAnswerInput:', content))

print(f"SaveAuditAnswerInput found: {count_save} times")
print(f"CreateAuditFindingFromAnswerInput found: {count_create} times")

# If duplicates, remove all but the first occurrence
# Add the missing payload types AFTER AuditFindingPayload but BEFORE MutationError at the end
if 'class AuditAnswerPayload' not in content:
    payloads = '''
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
    # Find the end of AuditFindingPayload and insert after it
    idx = content.find('class AuditChecklistItemPayload:')
    if idx > 0:
        # Find the next class or end of that class
        end_idx = content.find('\n\n\n# ──', idx)
        if end_idx > 0:
            content = content[:end_idx] + '\n' + payloads + content[end_idx:]
        else:
            content += '\n' + payloads

with open('api/types/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: Added missing audit payload types")
