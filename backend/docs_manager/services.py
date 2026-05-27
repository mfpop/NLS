from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Final

from decouple import config

from docs_manager.types import DocumentationContentInfo, DocumentationFileInfo, DocumentationMeta

REPO_ROOT: Final[Path] = Path(__file__).resolve().parents[2]
ROOT_LEVEL_DOCS: Final[set[str]] = {
    "README.md",
    "CONTRIBUTING.md",
    "DEVELOPER_ONBOARDING.md",
}

DOC_META: Final[dict[str, DocumentationMeta]] = {
    "README.md": DocumentationMeta(
        category="Entry Point",
        status="Canonical",
        purpose="Project entry point for developers and architects.",
        related_docs=("DOMAIN_HANDBOOK.md", "DOMAIN_SPEC.md"),
        governance_role="Entry point",
    ),
    "DOMAIN_CONSTITUTION.md": DocumentationMeta(
        category="Domain Authority",
        status="Canonical",
        purpose="Human-facing non-negotiable domain laws.",
        related_docs=("Modelfile-architect.md", "DOMAIN_SPEC.md"),
        governance_role="Human law",
    ),
    "Modelfile-architect.md": DocumentationMeta(
        category="Domain Authority",
        status="Canonical",
        purpose="AI architect enforcement prompt for domain invariants.",
        related_docs=("DOMAIN_CONSTITUTION.md", "DOMAIN_SPEC.md"),
        governance_role="AI enforcement",
    ),
    "DOMAIN_HANDBOOK.md": DocumentationMeta(
        category="Domain Understanding",
        status="Reference",
        purpose="Human explanation of factory flow and domain concepts.",
        related_docs=("DOMAIN_SPEC.md", "DOMAIN_GLOSSARY.md"),
        governance_role="Conceptual guide",
    ),
    "DOMAIN_GLOSSARY.md": DocumentationMeta(
        category="Domain Understanding",
        status="Draft",
        purpose="Shared vocabulary for domain terms.",
        related_docs=("DOMAIN_HANDBOOK.md", "DOMAIN_SPEC.md"),
        governance_role="Conceptual guide",
    ),
    "DOMAIN_SPEC.md": DocumentationMeta(
        category="Implementation Spec",
        status="Reference",
        purpose="Code-level domain implementation reference.",
        related_docs=("DOMAIN_CONSTITUTION.md", "DOMAIN_HANDBOOK.md"),
        governance_role="Code-level spec",
    ),
    "Backend_Refactor_Spec.md": DocumentationMeta(
        category="Implementation Spec",
        status="Needs Review",
        purpose="Back-end implementation constraints and migration target state.",
        related_docs=("DOMAIN_SPEC.md", "ARCHITECTURE.md"),
        governance_role="Code-level spec",
    ),
    "API_GUIDE.md": DocumentationMeta(
        category="Implementation Spec",
        status="Reference",
        purpose="GraphQL and API behavior reference.",
        related_docs=("DOMAIN_SPEC.md", "ARCHITECTURE.md"),
        governance_role="API guide",
    ),
    "DOMAIN_SERVICES_GUIDE.md": DocumentationMeta(
        category="Implementation Spec",
        status="Draft",
        purpose="Guidance for service boundaries and contracts.",
        related_docs=("DOMAIN_SPEC.md", "EVENT_SOURCING_GUIDE.md"),
        governance_role="Code-level spec",
    ),
    "EVENT_SOURCING_GUIDE.md": DocumentationMeta(
        category="Implementation Spec",
        status="Reference",
        purpose="Event sourcing constraints and usage guidance.",
        related_docs=("DOMAIN_EVENTS_REFERENCE.md", "DOMAIN_SPEC.md"),
        governance_role="Code-level spec",
    ),
    "KPI_ENGINE_GUIDE.md": DocumentationMeta(
        category="Implementation Spec",
        status="Reference",
        purpose="KPI engine design and traceability rules.",
        related_docs=("DOMAIN_CONSTITUTION.md", "EVENT_SOURCING_GUIDE.md"),
        governance_role="Code-level spec",
    ),
    "ARCHITECTURE.md": DocumentationMeta(
        category="Architecture",
        status="Reference",
        purpose="System architecture boundaries and layering.",
        related_docs=("DIAGRAMS.md", "DOMAIN_SPEC.md"),
        governance_role="Architecture guide",
    ),
    "DIAGRAMS.md": DocumentationMeta(
        category="Architecture",
        status="Draft",
        purpose="Architecture diagrams and visual references.",
        related_docs=("ARCHITECTURE.md", "VSM_DIAGRAMS_ADVANCED.md"),
        governance_role="Architecture guide",
    ),
    "VSM_DIAGRAMS_ADVANCED.md": DocumentationMeta(
        category="Architecture",
        status="Draft",
        purpose="Advanced VSM diagram references.",
        related_docs=("DIAGRAMS.md", "VSM_GLOSSARY.md"),
        governance_role="Architecture guide",
    ),
    "VSM_GLOSSARY.md": DocumentationMeta(
        category="Lean / VSM",
        status="Draft",
        purpose="Lean and VSM terminology reference.",
        related_docs=("DOMAIN_GLOSSARY.md", "VSM_DIAGRAMS_ADVANCED.md"),
        governance_role="Conceptual guide",
    ),
    "DOMAIN_EVENTS_REFERENCE.md": DocumentationMeta(
        category="Lean / VSM",
        status="Draft",
        purpose="Domain event catalog and references.",
        related_docs=("EVENT_SOURCING_GUIDE.md", "DOMAIN_SPEC.md"),
        governance_role="Code-level spec",
    ),
    "CONTRIBUTING.md": DocumentationMeta(
        category="Contribution / Onboarding",
        status="Draft",
        purpose="Contribution workflow and quality expectations.",
        related_docs=("DEVELOPER_ONBOARDING.md", "README.md"),
        governance_role="Contribution guide",
    ),
    "DEVELOPER_ONBOARDING.md": DocumentationMeta(
        category="Contribution / Onboarding",
        status="Draft",
        purpose="Developer onboarding process and setup guide.",
        related_docs=("README.md", "CONTRIBUTING.md"),
        governance_role="Onboarding guide",
    ),
    "Modelfile-coder.md": DocumentationMeta(
        category="Local AI / Modelfiles",
        status="Needs Review",
        purpose="Coder model behavior profile for local AI workflows.",
        related_docs=("Modelfile-architect.md", "ollama-coder.md"),
        governance_role="AI profile",
    ),

    "ollama-architect.md": DocumentationMeta(
        category="Local AI / Modelfiles",
        status="Needs Review",
        purpose="Ollama architect profile instructions.",
        related_docs=("Modelfile-architect.md", "ollama-coder.md"),
        governance_role="AI profile",
    ),
    "ollama-coder.md": DocumentationMeta(
        category="Local AI / Modelfiles",
        status="Needs Review",
        purpose="Ollama coder profile instructions.",
        related_docs=("Modelfile-coder.md", "ollama-architect.md"),
        governance_role="AI profile",
    ),
    "USER_MANUAL.md": DocumentationMeta(
        category="User Guide",
        status="Canonical",
        purpose="Comprehensive user manual for plant operators, supervisors, and administrators.",
        related_docs=("DOMAIN_HANDBOOK.md", "ERP_IMPORT_USER_HELP.md"),
        governance_role="User manual",
    ),
    "ERP_IMPORT_USER_HELP.md": DocumentationMeta(
        category="User Guide",
        status="Canonical",
        purpose="Step-by-step instructions for importing ERP data using saved ERP Patterns.",
        related_docs=("USER_MANUAL.md",),
        governance_role="User manual",
    ),
}


def _docs_root() -> Path:
    configured_root = config("DOCS_ROOT", default="docs").strip() or "docs"
    candidate = Path(configured_root)
    if not candidate.is_absolute():
        candidate = REPO_ROOT / candidate
    resolved = candidate.resolve()
    return resolved if resolved.exists() else REPO_ROOT


def _doc_path_for_name(name: str) -> Path:
    if name in ROOT_LEVEL_DOCS:
        return (REPO_ROOT / name).resolve()

    return (_docs_root() / name).resolve()


def _safe_doc_path(name: str) -> Path:
    if name not in DOC_META:
        raise FileNotFoundError(f"Unsupported documentation file: {name}")

    doc_path = _doc_path_for_name(name)

    expected_root = REPO_ROOT if name in ROOT_LEVEL_DOCS else _docs_root()

    try:
        doc_path.relative_to(expected_root)
    except ValueError as exc:
        raise ValueError("Path traversal detected") from exc

    if not doc_path.exists() or not doc_path.is_file():
        raise FileNotFoundError(f"Documentation file not found: {name}")

    return doc_path


def _extract_headings(content: str) -> list[str]:
    headings: list[str] = []
    for line in content.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip()
            if title:
                headings.append(title)
    return headings


def _iso_modified(path: Path) -> str | None:
    try:
        stamp = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        return stamp.isoformat()
    except OSError:
        return None


def list_documentation_files() -> list[DocumentationFileInfo]:
    items: list[DocumentationFileInfo] = []

    for name, meta in DOC_META.items():
        path = _doc_path_for_name(name)
        if not path.exists() or not path.is_file():
            continue

        size_kb = round(path.stat().st_size / 1024.0, 2)
        items.append(
            DocumentationFileInfo(
                name=name,
                path=str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
                category=meta.category,
                status=meta.status,
                size_kb=size_kb,
                last_modified=_iso_modified(path),
                purpose=meta.purpose,
                related_docs=list(meta.related_docs),
            )
        )

    return sorted(items, key=lambda item: (item.category, item.name))


def get_documentation_file(name: str) -> DocumentationContentInfo:
    path = _safe_doc_path(name)
    meta = DOC_META[name]
    content = path.read_text(encoding="utf-8")

    return DocumentationContentInfo(
        name=name,
        path=str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
        category=meta.category,
        status=meta.status,
        size_kb=round(path.stat().st_size / 1024.0, 2),
        last_modified=_iso_modified(path),
        purpose=meta.purpose,
        related_docs=list(meta.related_docs),
        content=content,
        headings=_extract_headings(content),
    )
