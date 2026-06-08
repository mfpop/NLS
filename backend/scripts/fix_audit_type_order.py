"""Fix ordering: Move AuditAnswerNode before AuditNode because AuditNode references it."""
import re

with open('api/types/manufacturing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the AuditAnswerNode class definition (including from_db method)
# Find it - it was inserted after AuditPayload
audit_answer_match = re.search(
    r'(@strawberry\.type\nclass AuditAnswerNode:.*?(?=\n@strawberry\.(?:type|input)\nclass ))',
    content, re.DOTALL
)

if audit_answer_match:
    answer_node_code = audit_answer_match.group(1)
    # Also grab SaveAuditAnswerInput and CreateAuditFindingFromAnswerInput if they follow
    after_answer = audit_answer_match.end()
    input_classes = ''
    save_input_match = re.search(
        r'@strawberry\.input\nclass SaveAuditAnswerInput:.*?(?=\n@strawberry\.(?:type|input)\nclass )',
        content[after_answer:], re.DOTALL
    )
    if save_input_match:
        input_classes += save_input_match.group(0) + '\n\n'
        after_input = after_answer + save_input_match.end()
        finding_input_match = re.search(
            r'@strawberry\.input\nclass CreateAuditFindingFromAnswerInput:.*?(?=\n@strawberry\.(?:type|input)\nclass )',
            content[after_input:], re.DOTALL
        )
        if finding_input_match:
            input_classes += finding_input_match.group(0) + '\n\n'
            after_finding = after_input + finding_input_match.end()
            # Also grab AuditAnswerPayload if it exists
            answer_payload_match = re.search(
                r'@strawberry\.type\nclass AuditAnswerPayload:.*?(?=\n@strawberry\.(?:type|input)\nclass )',
                content[after_finding:], re.DOTALL
            )
            if answer_payload_match:
                input_classes += answer_payload_match.group(0) + '\n\n'

    # Remove all these from current position
    end_remove = after_answer
    if save_input_match:
        end_remove = after_answer + save_input_match.end()
        if finding_input_match:
            end_remove = after_input + finding_input_match.end()
            if answer_payload_match:
                end_remove = after_finding + answer_payload_match.end()

    content = content[:audit_answer_match.start()] + content[end_remove:]

    # Insert before AuditNode class
    audit_node_pos = content.find('class AuditNode:')
    # Find the @strawberry.type decorator before AuditNode
    decorator_pos = content.rfind('@strawberry.type\n', 0, audit_node_pos)
    
    if decorator_pos > 0:
        insert_block = answer_node_code + '\n\n' + input_classes
        content = content[:decorator_pos] + insert_block + content[decorator_pos:]

with open('api/types/manufacturing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: Fixed AuditAnswerNode ordering")
