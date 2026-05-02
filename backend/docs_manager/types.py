from dataclasses import dataclass


@dataclass(frozen=True)
class DocumentationMeta:
    category: str
    status: str
    purpose: str
    related_docs: tuple[str, ...]
    governance_role: str


@dataclass(frozen=True)
class DocumentationFileInfo:
    name: str
    path: str
    category: str
    status: str
    size_kb: float
    last_modified: str | None
    purpose: str
    related_docs: list[str]


@dataclass(frozen=True)
class DocumentationContentInfo(DocumentationFileInfo):
    content: str
    headings: list[str]
