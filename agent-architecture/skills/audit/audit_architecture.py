from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, count_lines_of_code


class AuditArchitectureSkill(Skill):
    id = "audit_architecture"
    name = "audit_architecture"
    domain = "audit"
    description = "Audit completed implementation against governance, architecture, frontend/backend boundary rules, and tests"
    allowed_agents = ["3.Nexus - Architecture Audit"]
    forbidden_agents = [
        "0.Nexus - General Chat",
        "1.Nexus - Governance",
        "2.Nexus - Manufacturing Structure",
        "4.Nexus - Backend-GraphQL",
        "5.Nexus - Frontend-UI",
    ]
    side_effects = False
    risk_level = "high"

    def execute(self, inp: SkillInput) -> SkillOutput:
        ws = inp.workspace_root
        target = inp.params.get("target_path", ws)
        try:
            findings = []
            recommendations = []
            score = 1.0

            backend_files = find_files(target, "*.py", subdirs=["backend/graphql", "backend/api"])
            frontend_pages = find_files(target, "*.tsx", subdirs=["frontend/src/pages"])
            test_files = find_files(target, "*test*.py", subdirs=["backend"]) + find_files(target, "*test*.ts", subdirs=["frontend"])
            css_files = find_files(target, "*.css", subdirs=["frontend/src"])

            for fpath in backend_files[:30]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                loc = count_lines_of_code(content)
                if loc > 50:
                    findings.append({
                        "severity": "minor",
                        "category": "thin_resolvers",
                        "file": rel,
                        "message": f"Resolver file has {loc} lines — should delegate to services",
                    })
                    score -= 0.05

            for fpath in frontend_pages[:30]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                if "useQuery" not in content and "useMutation" not in content:
                    findings.append({
                        "severity": "info",
                        "category": "graphql_consumption",
                        "file": rel,
                        "message": "Page may not be consuming GraphQL/backend state",
                    })

            for fpath in test_files[:20]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                loc = count_lines_of_code(content)
                if loc < 10:
                    findings.append({
                        "severity": "minor",
                        "category": "test_coverage",
                        "file": rel,
                        "message": f"Test file has only {loc} lines — may be insufficient",
                    })
                    score -= 0.02

            for fpath in css_files[:10]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                if "@import" in content:
                    findings.append({
                        "severity": "major",
                        "category": "tailwind_violation",
                        "file": rel,
                        "message": "Custom CSS file found — should use Tailwind only",
                    })
                    score -= 0.1

            if findings:
                recommendations.append("Decompose thick resolver files into service + repository layers")
                recommendations.append("Add GraphQL queries/mutations to pages missing backend state consumption")
                recommendations.append("Expand test coverage for thin test files")
                recommendations.append("Migrate custom CSS to Tailwind utility classes")

            score = max(0.0, round(score, 2))

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "score": score,
                    "findings": findings,
                    "recommendations": recommendations,
                    "stats": {
                        "backend_files_checked": len(backend_files),
                        "frontend_pages_checked": len(frontend_pages),
                        "test_files_checked": len(test_files),
                        "css_files_checked": len(css_files),
                    },
                    "summary": f"Audit score: {score:.2f} — {len(findings)} findings, {len(recommendations)} recommendations",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
