"""GraphQL inputs for document and document control entities.

StructureDocument, DocumentControl lifecycle inputs.
"""

import typing
import strawberry


@strawberry.input
class StructureDocumentInput:
    document_type: str = strawberry.field(name="documentType")
    target_type: str = strawberry.field(name="targetType")
    target_id: int = strawberry.field(name="targetId")
    title: str
    code: str
    content: typing.Optional[str] = ""
    revision: typing.Optional[str] = "1.0"
    owner: typing.Optional[str] = ""
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class StructureDocumentUpdateInput:
    title: typing.Optional[str] = None
    content: typing.Optional[str] = None
    revision: typing.Optional[str] = None
    owner: typing.Optional[str] = None
    effective_from: typing.Optional[str] = strawberry.field(name="effectiveFrom", default=None)
    effective_to: typing.Optional[str] = strawberry.field(name="effectiveTo", default=None)


@strawberry.input
class CreateRevisionInput:
    document_id: str = strawberry.field(name="documentId")
    change_reason: str = strawberry.field(name="changeReason")


@strawberry.input
class ArchiveDocumentInput:
    document_id: str = strawberry.field(name="documentId")
    reason: str = ""


@strawberry.input
class ControlledCopyInput:
    document_id: str = strawberry.field(name="documentId")
    recipient: str
    notes: str = ""
