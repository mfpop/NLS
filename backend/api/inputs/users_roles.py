"""GraphQL inputs for user profile and role entities.

Profile, WorkHistory, Education, and related inputs.
"""

import typing
import strawberry


@strawberry.input
class WorkHistoryInput:
    id: str
    role: str
    company: str
    period: str
    description: typing.Optional[str] = ""


@strawberry.input
class EducationInput:
    id: str
    degree: str
    school: str
    period: str


@strawberry.input
class ProfileInput:
    name: typing.Optional[str] = None
    role: typing.Optional[str] = None
    email: typing.Optional[str] = None
    phone: typing.Optional[str] = None
    location: typing.Optional[str] = None
    plant: typing.Optional[str] = None
    department: typing.Optional[str] = None
    reports_to: typing.Optional[str] = strawberry.field(name="reportsTo", default=None)
    language: typing.Optional[str] = None
    about: typing.Optional[str] = None
    work_history: typing.Optional[list[WorkHistoryInput]] = strawberry.field(name="workHistory", default=None)
    education: typing.Optional[list[EducationInput]] = strawberry.field(name="education", default=None)
