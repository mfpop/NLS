from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file


class ValidateTailwindSkill(Skill):
    id = "validate_tailwind"
    name = "validate_tailwind"
    domain = "frontend"
    description = "Validate that frontend styling uses Tailwind CSS only, no custom CSS violations"
    allowed_agents = ["5.Nexus - Frontend-UI"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "1.Nexus - Governance",
        "2.Nexus - Manufacturing Structure",
        "3.Nexus - Architecture Audit",
        "4.Nexus - Backend-GraphQL",
    ]
    side_effects = False
    risk_level = "low"

    CSS_VIOLATION_PATTERNS = [
        "style={{",
        "style={",
        "<style>",
        "className={css.",
        "from '",
        '.module.css"',
        ".module.css'",
    ]

    NON_TAILWIND_CSS_PROPS = [
        "margin-left:", "margin-right:", "padding-left:", "padding-right:",
        "font-size:", "color:", "background-color:", "border-radius:",
        "display:", "position:", "top:", "left:", "right:", "bottom:",
        "width:", "height:", "flex:", "grid:", "align-items:", "justify-content:",
    ]

    def execute(self, inp: SkillInput) -> SkillOutput:
        ws = inp.workspace_root
        target = inp.params.get("target_path", "frontend/src")
        try:
            tsx_files = find_files(ws, "*.tsx", subdirs=[target])
            css_files = find_files(ws, "*.css", subdirs=["frontend/src/styles"])

            violations = []
            tsx_violations = 0
            css_violations = 0

            for fpath in tsx_files[:80]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                for pattern in self.CSS_VIOLATION_PATTERNS:
                    if pattern in content:
                        violations.append({
                            "file": rel,
                            "pattern": pattern.replace("{", "\\{").replace("}", "\\}"),
                            "type": "inline_style_or_css_import",
                        })
                        tsx_violations += 1
                        break

            for fpath in css_files[:10]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                lines = content.splitlines()
                for i, line in enumerate(lines, 1):
                    stripped = line.strip()
                    for prop in self.NON_TAILWIND_CSS_PROPS:
                        if prop in stripped and not stripped.startswith("/*") and not stripped.startswith("//"):
                            violations.append({
                                "file": rel,
                                "line": i,
                                "content": stripped[:60],
                                "type": "non_tailwind_css_property",
                            })
                            css_violations += 1
                            break

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "tailwind_only": len(violations) == 0,
                    "violations": violations,
                    "stats": {
                        "tsx_files_scanned": len(tsx_files),
                        "css_files_scanned": len(css_files),
                        "tsx_violations": tsx_violations,
                        "css_violations": css_violations,
                    },
                    "summary": f"Scanned {len(tsx_files)} TSX files, {len(css_files)} CSS files: {len(violations)} Tailwind violations found",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
