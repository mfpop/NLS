import strawberry
from typing import Optional
from django.contrib.auth.models import User
from django.utils.functional import SimpleLazyObject
from graphql import parse

from api.queries import Query
from api.mutations import Mutation
from api.auth_utils import decode_jwt


# GraphQL Complexity & Depth Guard Configuration
MAX_QUERY_DEPTH = 12  # Max nesting depth for tree queries
MAX_QUERY_COMPLEXITY = 150  # Max complexity score


def calculate_query_depth(node, depth=0):
    """Calculate the maximum nesting depth of a GraphQL query."""
    max_depth = depth
    
    if hasattr(node, "selection_set") and node.selection_set:
        for selection in node.selection_set.selections:
            current_depth = calculate_query_depth(selection, depth + 1)
            max_depth = max(max_depth, current_depth)
    
    return max_depth


def calculate_query_complexity(node, complexity=0):
    """
    Calculate query complexity score.
    Base complexity is 1 per field. List fields without limits get +10 penalty.
    """
    field_complexity = 1
    
    # Check if this is a list field (simplified heuristic)
    if hasattr(node, "name") and node.name and "list" in node.name.value.lower():
        field_complexity += 5  # List field complexity multiplier
    
    if hasattr(node, "selection_set") and node.selection_set:
        for selection in node.selection_set.selections:
            field_complexity += calculate_query_complexity(selection, complexity)
    
    return field_complexity


def validate_query_complexity(query_string):
    """Validate that query doesn't exceed depth/complexity limits."""
    try:
        document = parse(query_string)
    except Exception as e:
        return None, str(e)
    
    max_depth = 0
    total_complexity = 0
    
    for definition in document.definitions:
        if hasattr(definition, "selection_set"):
            max_depth = max(max_depth, calculate_query_depth(definition))
            total_complexity += calculate_query_complexity(definition)
    
    if max_depth > MAX_QUERY_DEPTH:
        return None, f"Query depth {max_depth} exceeds maximum of {MAX_QUERY_DEPTH}"
    
    if total_complexity > MAX_QUERY_COMPLEXITY:
        return None, f"Query complexity {total_complexity} exceeds maximum of {MAX_QUERY_COMPLEXITY}"
    
    return True, None


def get_user_from_request(request) -> Optional[User]:
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]
    payload = decode_jwt(token)
    if payload is None:
        return None
    try:
        return User.objects.get(id=payload["user_id"])
    except User.DoesNotExist:
        return None


class GraphQLContext:
    def __init__(self, request):
        self.request = request
        self._user = None

    @property
    def user(self) -> Optional[User]:
        if self._user is None:
            self._user = get_user_from_request(self.request)
        return self._user


def get_context(request) -> GraphQLContext:
    return GraphQLContext(request)


schema = strawberry.Schema(query=Query, mutation=Mutation)
