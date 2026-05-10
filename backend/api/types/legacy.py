import strawberry
from manufacturing.models.reference import ReferenceCategory


@strawberry.type
class ReferenceTableNode:
    id: strawberry.ID
    name: str
    status: str
    group: str
    entry_count: int = strawberry.field(name="entryCount")
    description: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")

    @classmethod
    def from_db(cls, category: ReferenceCategory) -> "ReferenceTableNode":
        return cls(
            id=strawberry.ID(str(category.id)),
            name=category.name,
            status=category.status,
            group="",
            entry_count=category.values.count(),
            description=category.description,
            created_at=category.created_at.isoformat() if category.created_at else "",
            updated_at=category.updated_at.isoformat() if category.updated_at else "",
        )
