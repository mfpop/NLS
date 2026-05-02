import strawberry

from docs_manager.services import get_documentation_file, list_documentation_files


@strawberry.type
class DocumentationFile:
    name: str
    path: str
    category: str
    status: str
    size_kb: float
    last_modified: str | None
    purpose: str
    related_docs: list[str]


@strawberry.type
class DocumentationContent:
    name: str
    path: str
    category: str
    status: str
    content: str
    headings: list[str]
    related_docs: list[str]
    size_kb: float
    last_modified: str | None
    purpose: str


@strawberry.type
class DocumentationQuery:
    @strawberry.field
    def documentation_files(self) -> list[DocumentationFile]:
        files = list_documentation_files()
        return [
            DocumentationFile(
                name=item.name,
                path=item.path,
                category=item.category,
                status=item.status,
                size_kb=item.size_kb,
                last_modified=item.last_modified,
                purpose=item.purpose,
                related_docs=item.related_docs,
            )
            for item in files
        ]

    @strawberry.field
    def documentation_file(self, name: str) -> DocumentationContent:
        item = get_documentation_file(name)
        return DocumentationContent(
            name=item.name,
            path=item.path,
            category=item.category,
            status=item.status,
            content=item.content,
            headings=item.headings,
            related_docs=item.related_docs,
            size_kb=item.size_kb,
            last_modified=item.last_modified,
            purpose=item.purpose,
        )
