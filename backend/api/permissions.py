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
    # Improvement
    "create_suggestion": SUPERVISOR_PLUS,
    "update_suggestion": SUPERVISOR_PLUS,
    "review_suggestion": SUPERVISOR_PLUS,
    "accept_suggestion": SUPERVISOR_PLUS,
    "reject_suggestion": SUPERVISOR_PLUS,
    "convert_suggestion_to_kaizen": SUPERVISOR_PLUS,
    "delete_suggestion": MANAGER_PLUS,
    "create_kaizen": SUPERVISOR_PLUS,
    "update_kaizen": SUPERVISOR_PLUS,
    "start_kaizen": SUPERVISOR_PLUS,
    "complete_kaizen": SUPERVISOR_PLUS,
    "cancel_kaizen": SUPERVISOR_PLUS,
    "add_kaizen_action": SUPERVISOR_PLUS,
    "update_kaizen_action": SUPERVISOR_PLUS,
    "complete_kaizen_action": SUPERVISOR_PLUS,
    "cancel_kaizen_action": SUPERVISOR_PLUS,
    "create_a3_from_kaizen": SUPERVISOR_PLUS,
    "create_a3_pdca": SUPERVISOR_PLUS,
    "update_a3_pdca": SUPERVISOR_PLUS,
    "move_a3_pdca_to_plan": SUPERVISOR_PLUS,
    "move_a3_pdca_to_do": SUPERVISOR_PLUS,
    "move_a3_pdca_to_check": SUPERVISOR_PLUS,
    "move_a3_pdca_to_act": SUPERVISOR_PLUS,
    "complete_a3_pdca": SUPERVISOR_PLUS,
    "cancel_a3_pdca": SUPERVISOR_PLUS,
    "add_a3_pdca_action": SUPERVISOR_PLUS,
    "update_a3_pdca_action": SUPERVISOR_PLUS,
    "complete_a3_pdca_action": SUPERVISOR_PLUS,
    "cancel_a3_pdca_action": SUPERVISOR_PLUS,
    "start_work_order": SUPERVISOR_PLUS,
    "activate_process_flow": SUPERVISOR_PLUS,
    # Integration / ERP
    "trigger_import_job": SUPERVISOR_PLUS,
    "create_import_job": SUPERVISOR_PLUS,
    "attach_import_file": SUPERVISOR_PLUS,
    "transition_import_job": SUPERVISOR_PLUS,
    "delete_import_job": SUPERVISOR_PLUS,
    "manage_mapping_rules": ADMIN_ROLES,
    # Material / Warehouse
    "manage_warehouses": MANAGER_PLUS,
    "manage_material_bins": MANAGER_PLUS,
    # Scheduling
    "manage_schedules": MANAGER_PLUS,
    "manage_schedule_assignments": MANAGER_PLUS,
    # References
    "manage_reference_values": MANAGER_PLUS,
    # Product / Family / Model assignments
    "manage_line_product_scopes": MANAGER_PLUS,
    # Document / Standard Framework
    "manage_structure_documents": MANAGER_PLUS,
    "view_structure_documents": SUPERVISOR_PLUS,
    "approve_structure_documents": MANAGER_PLUS,
    "archive_structure_documents": MANAGER_PLUS,
    # MER
    "create_mer": SUPERVISOR_PLUS,
    "update_mer": SUPERVISOR_PLUS,
    "approve_mer": MANAGER_PLUS,
    "reject_mer": MANAGER_PLUS,
    "start_mer": SUPERVISOR_PLUS,
    "complete_mer": SUPERVISOR_PLUS,
    "cancel_mer": SUPERVISOR_PLUS,
    "convert_mer_to_kaizen": SUPERVISOR_PLUS,
    "delete_mer": MANAGER_PLUS,
    # Audits
    "view_audits": SUPERVISOR_PLUS,
    "manage_audits": MANAGER_PLUS,
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
