"""API permission helpers for GraphQL resolvers and mutations."""

from django.contrib.auth.models import User

READ_ONLY_ROLES = {"guest"}
MANAGER_PLUS = {"dept_manager", "app_owner", "db_admin"}
SUPERVISOR_PLUS = {"supervisor", "dept_manager", "app_owner", "db_admin"}
ADMIN_ROLES = {"app_owner", "db_admin"}

_action_roles = {
    # Plants
    "create_plant": ADMIN_ROLES,
    "update_plant": ADMIN_ROLES,
    "toggle_plant_status": ADMIN_ROLES,
    "delete_plant": ADMIN_ROLES,
    "rename_plant": ADMIN_ROLES,
    # Departments
    "create_department": ADMIN_ROLES,
    "update_department": MANAGER_PLUS,
    "delete_department": ADMIN_ROLES,
    # Production lines
    "create_production_line": MANAGER_PLUS,
    "update_production_line": MANAGER_PLUS,
    "delete_production_line": ADMIN_ROLES,
    "toggle_production_line_status": MANAGER_PLUS,
    # Profile
    "update_profile": SUPERVISOR_PLUS,
    # Other domains
    "create_kaizen": SUPERVISOR_PLUS,
    "start_work_order": SUPERVISOR_PLUS,
    "activate_process_flow": SUPERVISOR_PLUS,
    # Integration / ERP
    "trigger_import_job": SUPERVISOR_PLUS,
    "create_import_job": SUPERVISOR_PLUS,
    "attach_import_file": SUPERVISOR_PLUS,
    "transition_import_job": SUPERVISOR_PLUS,
    "manage_mapping_rules": ADMIN_ROLES,
}


def get_role(user: User | None) -> str:
    if user is None or not user.is_authenticated:
        return "guest"
    try:
        return user.role_profile.role
    except Exception:
        return "guest"


def has_access(*, user: User | None = None, action: str = "", **_kwargs) -> bool:
    role = get_role(user)
    allowed = _action_roles.get(action, MANAGER_PLUS)
    return role in allowed


def ensure_access(*, user: User | None = None, action: str = "", **_kwargs) -> None:
    from api.errors import PermissionDeniedError

    if not has_access(user=user, action=action):
        raise PermissionDeniedError(
            f"You do not have permission to perform '{action}'. Required role: one of {_action_roles.get(action, MANAGER_PLUS)}"
        )
