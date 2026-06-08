"""Fix imports in mutations file - remove references to types that don't exist in types file."""
with open('api/mutations/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the import line to remove AuditAnswerPayload, AuditInstallTemplatesPayload, AuditTemplatePayload
old_import = """    AuditAnswerNode, AuditAnswerPayload,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,"""
new_import = """    AuditAnswerNode,
    CreateAuditFromTemplateInput, SaveAuditAnswerInput, CreateAuditFindingFromAnswerInput,"""
content = content.replace(old_import, new_import)

# Also fix: Find import of AuditTemplatePayload and AuditInstallTemplatesPayload if present
content = content.replace(
    """    AuditAnswerNode, AuditAnswerPayload, AuditTemplatePayload, AuditInstallTemplatesPayload, AuditTemplatePayload, AuditInstallTemplatesPayload,""",
    """    AuditAnswerNode,"""
)

# Check if there's a reference to AuditTemplatePayload in a second import line
# The existing types import may reference AuditTemplatePayload
# Let me check:
if 'AuditTemplatePayload' in content:
    # Remove it from imports
    content = content.replace(', AuditTemplatePayload', '')

if 'AuditInstallTemplatesPayload' in content:
    content = content.replace(', AuditInstallTemplatesPayload', '')

with open('api/mutations/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: Fixed mutation imports")
