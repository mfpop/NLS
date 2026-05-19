from __future__ import annotations

from typing import Any

import strawberry


@strawberry.type
class PageInfo:
    total_count: int = strawberry.field(name="totalCount")
    has_next_page: bool = strawberry.field(name="hasNextPage")
    offset: int = 0
    limit: int = 100


def paginate_queryset(qs: Any, offset: int = 0, limit: int = 100) -> tuple[list, int, bool]:
    """Apply offset/limit to a QuerySet and return (items, total_count, has_next_page)."""
    total = qs.count()
    items = list(qs[offset:offset + limit])
    has_more = (offset + limit) < total
    return items, total, has_more
