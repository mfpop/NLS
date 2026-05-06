import strawberry
from typing import Optional
from django.contrib.auth.models import User
from django.utils.functional import SimpleLazyObject

from api.queries import Query
from api.mutations import Mutation
from api.auth_utils import decode_jwt


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
