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
    display_name: str = strawberry.field(name="displayName")

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
        display_name = user.get_full_name() or user.username
        return cls(
            id=strawberry.ID(str(user.id)),
            name=display_name,
            username=user.username,
            email=user.email,
            display_name=display_name,
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


@strawberry.type
class ForgotPasswordPayload:
    message: str


@strawberry.input
class ResetPasswordInput:
    token: str
    new_password: str


@strawberry.type
class ResetPasswordPayload:
    ok: bool
    message: str


@strawberry.input
class RegisterInput:
    username: str
    email: str
    password: str
    first_name: str = ""
    last_name: str = ""


@strawberry.type
class RegisterPayload:
    ok: bool
    message: str
    user: UserNode | None = None
