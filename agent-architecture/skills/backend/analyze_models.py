from shared.types import SkillInput, SkillOutput, SkillStatus
from shared.interfaces import Skill
from skills.utils import find_files, read_file, find_class_definitions, count_lines_of_code


class AnalyzeModelsSkill(Skill):
    id = "analyze_models"
    name = "analyze_models"
    domain = "backend"
    description = "Analyze Django models for correctness, relationships, and Clean Architecture compliance"
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
        model_path = inp.params.get("model_path", "backend")
        search_dir = f"{model_path}" if not model_path.startswith(ws) else model_path
        try:
            model_files = find_files(ws, "models.py", subdirs=["backend"])
            model_files += find_files(ws, "models/*.py", subdirs=["backend"])

            models = []
            relationships = []
            issues = []
            total_loc = 0

            for fpath in model_files[:30]:
                content = read_file(fpath)
                if not content:
                    continue
                rel = fpath.replace(ws, "").lstrip("/\\")
                classes = find_class_definitions(content)
                loc = count_lines_of_code(content)
                total_loc += loc
                has_models_dot = "from django.db import models" in content or "models.Model" in content

                for cls in classes:
                    entry = {
                        "name": cls["name"],
                        "file": rel,
                        "lines": loc,
                        "is_django_model": "Model" in cls["bases"],
                    }
                    models.append(entry)

                    if entry["is_django_model"]:
                        for kw in ["ForeignKey", "ManyToManyField", "OneToOneField"]:
                            if kw in content:
                                relationships.append({
                                    "from": cls["name"],
                                    "type": kw,
                                    "file": rel,
                                })

                if not has_models_dot and classes:
                    issues.append({
                        "file": rel,
                        "severity": "warning",
                        "message": "File has class definitions but may not be a Django models file",
                    })

            return SkillOutput(
                status=SkillStatus.SUCCESS,
                result={
                    "models_found": models,
                    "relationships": relationships,
                    "issues": issues,
                    "stats": {
                        "files_scanned": len(model_files),
                        "total_loc": total_loc,
                        "model_count": len([m for m in models if m["is_django_model"]]),
                    },
                    "summary": f"Scanned {len(model_files)} model files, found {len([m for m in models if m['is_django_model']])} Django models, {len(relationships)} relationships",
                },
            )
        except Exception as e:
            return SkillOutput(status=SkillStatus.FAILED, error=str(e))
