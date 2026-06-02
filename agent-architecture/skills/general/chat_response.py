from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill


class ChatResponseSkill(Skill):
    id = "chat_response"
    name = "chat_response"
    domain = "general"
    description = "Respond to general conversation and casual queries, triage unclear requests"
    allowed_agents = ["0.Nexus - General Chat"]
    forbidden_agents = [
        "1.Nexus - Governance",
        "2.Nexus - Manufacturing Structure",
        "3.Nexus - Architecture Audit",
        "4.Nexus - Backend-GraphQL",
        "5.Nexus - Frontend-UI",
    ]
    side_effects = False
    risk_level = "low"

    def execute(self, inp: SkillInput) -> SkillOutput:
        try:
            ctx_count = len(inp.context_documents)
            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "reply": f"Acknowledged: {inp.task.input[:200]}",
                    "type": "general_chat",
                    "context_loaded": ctx_count,
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
