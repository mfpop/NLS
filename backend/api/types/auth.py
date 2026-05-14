import strawberry
import typing
from django.contrib.auth.models import User
from manufacturing.models import UserRole


@strawberry.type
class UserNode:
    id: strawberry.ID
    name: str
    username: str
    email: str
    role: str
    plant: str
    department: str

    @classmethod
    def from_user(cls, user: User) -> "UserNode":
        try:
            rp = user.role_profile
            role = rp.role
            plant = rp.plant
            department = rp.department
        except UserRole.DoesNotExist:
            role = "guest"
            plant = ""
            department = ""
        return cls(
            id=strawberry.ID(str(user.id)),
            name=user.get_full_name() or user.username,
            username=user.username,
            email=user.email,
            role=role,
            plant=plant,
            department=department,
        )


@strawberry.input
class LoginInput:
    username: str
    password: str


@strawberry.type
class AuthPayload:
    token: str
    user: UserNode
