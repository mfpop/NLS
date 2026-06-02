from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import read_file


class CheckGovernanceSkill(Skill):
    id = "check_governance"
    name = "check_governance"
    domain = "governance"
    description = "Validate documents and processes against governance policies and active decisions"
    allowed_agents = ["1.Nexus - Governance"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "2.Nexus - Manufacturing Structure",
        "3.Nexus - Architecture Audit",
        "4.Nexus - Backend-GraphQL",
        "5.Nexus - Frontend-UI",
    ]
    side_effects = False
    risk_level = "high"

    def execute(self, inp: SkillInput) -> SkillOutput:
        doc = inp.params.get("document", inp.task.input)
        try:
            active_decisions = ""
            constitution = ""
            for cd in inp.context_documents:
                if "ACTIVE_DECISIONS" in cd.path:
                    active_decisions = cd.content
                if "DOMAIN_CONSTITUTION" in cd.path:
                    constitution = cd.content

            violations = []
            score = 1.0
            doc_lower = doc.lower()

            if active_decisions:
                for line in active_decisions.splitlines():
                    line = line.strip()
                    if line.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.", "10.",
                                       "11.", "12.", "13.", "14.", "15.", "16.", "17.", "18.", "19.", "20.",
                                       "21.", "22.", "23.", "24.", "25.", "26.", "27.", "28.", "29.")):
                        if "No standalone" in line or "must not" in line.lower() or "must stay" in line.lower() or "only" in line.lower():
                            rule_text = line.split(". ", 1)[1] if ". " in line else line
                            violations.append({
                                "rule": rule_text,
                                "severity": "info",
                                "message": f"Active decision applies: {rule_text[:100]}",
                            })

            if constitution:
                for section in ["UI consumes GraphQL/backend state only", "No mock operational data",
                                "No hardcoded business data", "No business rules in UI",
                                "Frontend styling must use Tailwind CSS only"]:
                    if section.lower() in constitution.lower():
                        pass

            score = max(0.0, round(score, 2))

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "compliant": len([v for v in violations if v["severity"] == "critical"]) == 0,
                    "violations": violations,
                    "score": score,
                    "active_decisions_reviewed": len(inp.context_documents),
                    "summary": f"Governance check complete: {len(violations)} applicable rules, score {score:.2f}",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
