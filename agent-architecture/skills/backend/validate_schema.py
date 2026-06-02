from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, count_lines_of_code


class ValidateSchemaSkill(Skill):
    id = "validate_schema"
    name = "validate_schema"
    domain = "backend"
    description = "Validate GraphQL schema and backend API contracts against standards"
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
        schema_text = inp.params.get("schema_text", "")
        try:
            if not schema_text:
                schema_files = find_files(ws, "*.graphql", subdirs=["backend"])
                schema_files += find_files(ws, "schema.py", subdirs=["backend"])

                schemas = []
                for fpath in list(dict.fromkeys(schema_files))[:20]:
                    content = read_file(fpath)
                    if not content:
                        continue
                    rel = fpath.replace(ws, "").lstrip("/\\")
                    loc = count_lines_of_code(content)
                    schemas.append({"file": rel, "lines": loc})

                return SkillOutput(
                    status=SkillStatus.SUCCESS,
                    result={
                        "valid": True,
                        "errors": [],
                        "warnings": [],
                        "schemas_found": schemas,
                        "summary": f"Found {len(schemas)} schema files in the project",
                    },
                )

            errors = []
            warnings = []
            lines = schema_text.splitlines()

            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("type") and "{" not in stripped and not any(
                    stripped.endswith(suf) for suf in ["Query", "Mutation", "Subscription"]
                ):
                    warnings.append(f"Line {i}: Type definition may be missing opening brace")
                if stripped.startswith("extend") and not stripped.startswith("extend type"):
                    warnings.append(f"Line {i}: 'extend' keyword usage may be incorrect")
                if "(" in stripped and ")" not in stripped:
                    errors.append(f"Line {i}: Unclosed parenthesis in definition")

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "valid": len(errors) == 0,
                    "errors": errors,
                    "warnings": warnings,
                    "summary": f"Validated {len(lines)} lines: {len(errors)} errors, {len(warnings)} warnings",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
