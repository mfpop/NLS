from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, find_function_definitions, count_lines_of_code


class AnalyzeServicesSkill(Skill):
    id = "analyze_services"
    name = "analyze_services"
    domain = "backend"
    description = "Analyze domain services for proper validation, transaction ownership, and invariant enforcement"
    allowed_agents = ["4.Nexus - Backend-GraphQL"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "1.Nexus - Governance",
        "2.Nexus - Manufacturing Structure",
        "3.Nexus - Architecture Audit",
        "5.Nexus - Frontend-UI",
    ]
    side_effects = False
    risk_level = "medium"

    def execute(self, inp: SkillInput) -> SkillOutput:
        ws = inp.workspace_root
        try:
            service_files = find_files(ws, "*.py", subdirs=["backend/application", "backend/domain", "backend/services"])

            services = []
            validation_patterns = []
            ownership = []
            issues = []
            total_loc = 0

            for fpath in service_files[:50]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                funcs = find_function_definitions(content)
                loc = count_lines_of_code(content)
                total_loc += loc

                svc = {
                    "file": rel,
                    "functions": len(funcs),
                    "lines": loc,
                }
                services.append(svc)

                has_validate = any("validate" in f["name"].lower() for f in funcs)
                if has_validate:
                    validation_patterns.append({"file": rel, "type": "validation_method"})

                has_transaction = any(
                    "transaction" in content.lower() or "atomic" in content.lower()
                    for _ in [1]
                )
                if has_transaction:
                    ownership.append({"file": rel, "pattern": "transaction_atomic"})

                if not funcs:
                    issues.append({
                        "file": rel,
                        "severity": "info",
                        "message": "Service file has no function definitions",
                    })

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "services_found": services,
                    "validation_patterns": validation_patterns,
                    "transaction_ownership": ownership,
                    "issues": issues,
                    "stats": {
                        "files_scanned": len(service_files),
                        "total_loc": total_loc,
                    },
                    "summary": f"Scanned {len(service_files)} service files, found {len(validation_patterns)} validation patterns, {len(ownership)} transaction ownerships",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
