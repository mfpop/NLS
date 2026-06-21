import strawberry
from typing import Optional

from check.models import (
    Problem, Action,
    ProductionCheck, ProductionChecklistItem,
    QualityCheck, QualityChecklistItem,
    DMR, RMA,
    SafetyCheck, SafetyChecklistItem, SafetyIncident, SafetyEvent,
    MaterialCheck, MaterialChecklistItem, MaterialIssue,
    SafetyInjuryClaim, SafetyMedicalCase, SafetyEnvironmentalReport, SafetyCAPA,
)
from check.services import (
    ProblemService,
    ActionService,
    ProductionControlService,
    QualityControlService,
    SafetyControlService,
    SafetyEventService,
    MaterialControlService,
    SafetyInjuryClaimService,
    SafetyMedicalCaseService,
    SafetyEnvironmentalReportService,
    SafetyCAPAService,
)


# ──────────────────────────────────────────────
#  Node types
# ──────────────────────────────────────────────

@strawberry.type
class ProblemNode:
    id: int
    control_area: str
    title: str
    description: str
    problem_type: str
    target_type: str
    target_id: Optional[int]
    severity: str
    status: str
    reported_by: str
    reported_at: str
    source_type: str
    source_id: Optional[int]
    owner: str
    due_date: Optional[str]
    notes: str
    closed_at: Optional[str]
    plant: str
    production_line: str
    department: str
    resource_group: str
    resource: str
    containment_notes: str
    root_cause: str
    resolution_notes: str
    created_at: str
    updated_at: str


@strawberry.type
class ActionNode:
    id: int
    control_area: str
    title: str
    description: str
    action_type: str
    source_type: str
    source_id: Optional[int]
    linked_issue_id: Optional[int]
    owner: str
    assigned_to: str
    due_date: Optional[str]
    status: str
    priority: str
    completed_at: Optional[str]
    completed_by: str
    completion_notes: str
    notes: str
    target_type: str
    target_id: Optional[int]
    plant: str
    production_line: str
    department: str
    resource_group: str
    resource: str
    created_at: str
    updated_at: str


@strawberry.type
class ProductionChecklistItemNode:
    id: int
    production_check_id: int
    question: str
    result: Optional[str]
    comment: str
    created_at: str
    updated_at: str


@strawberry.type
class ProductionCheckNode:
    id: int
    check_type: str
    target_type: str
    target_id: Optional[int]
    title: str
    checked_by: str
    check_date: Optional[str]
    status: str
    score: Optional[float]
    notes: str
    checklist_items: list[ProductionChecklistItemNode]
    created_at: str
    updated_at: str


@strawberry.type
class QualityChecklistItemNode:
    id: int
    quality_check_id: int
    question: str
    result: Optional[str]
    comment: str
    created_at: str
    updated_at: str


@strawberry.type
class QualityCheckNode:
    id: int
    check_type: str
    target_type: str
    target_id: Optional[int]
    title: str
    checked_by: str
    check_date: Optional[str]
    status: str
    score: Optional[float]
    notes: str
    checklist_items: list[QualityChecklistItemNode]
    created_at: str
    updated_at: str


@strawberry.type
class DMRNode:
    id: int
    dmr_number: str
    title: str
    description: str
    material_item_id: Optional[int]
    product_variant_id: Optional[int]
    target_type: str
    target_id: Optional[int]
    quantity: Optional[float]
    uom: str
    defect_description: str
    containment: str
    severity: str
    disposition: Optional[str]
    status: str
    owner: str
    due_date: Optional[str]
    closed_at: Optional[str]
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class RMANode:
    id: int
    rma_number: str
    customer_name: str
    part_number: str
    serial_lot: str
    product_variant_id: Optional[int]
    material_item_id: Optional[int]
    quantity: Optional[float]
    reason: str
    status: str
    received_date: Optional[str]
    due_date: Optional[str]
    disposition: Optional[str]
    customer_response_status: str
    receiving_inspection_result: str
    confirmed_defect: str
    suspected_cause: str
    confirmed_cause: str
    disposition_owner: str
    disposition_date: Optional[str]
    customer_response: str
    owner: str
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class SafetyChecklistItemNode:
    id: int
    safety_check_id: int
    question: str
    result: Optional[str]
    comment: str
    created_at: str
    updated_at: str


@strawberry.type
class SafetyCheckNode:
    id: int
    check_type: str
    target_type: str
    target_id: Optional[int]
    title: str
    checked_by: str
    check_date: Optional[str]
    status: str
    score: Optional[float]
    notes: str
    checklist_items: list[SafetyChecklistItemNode]
    created_at: str
    updated_at: str


@strawberry.type
class SafetyEventNode:
    id: int
    event_type: str = strawberry.field(name="eventType")
    severity: str
    status: str
    target_type: str = strawberry.field(name="targetType")
    target_id: Optional[int] = strawberry.field(name="targetId")
    title: str
    description: str
    reported_by: str = strawberry.field(name="reportedBy")
    reported_at: str = strawberry.field(name="reportedAt")
    occurred_at: Optional[str] = strawberry.field(name="occurredAt", default=None)
    location_text: str = strawberry.field(name="locationText")
    immediate_action: str = strawberry.field(name="immediateAction")
    injury_involved: bool = strawberry.field(name="injuryInvolved")
    property_damage: bool = strawberry.field(name="propertyDamage")
    environmental_impact: bool = strawberry.field(name="environmentalImpact")
    owner: str
    closed_at: Optional[str] = strawberry.field(name="closedAt", default=None)
    notes: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class SafetyIncidentNode:
    id: int
    title: str
    description: str
    target_type: str
    target_id: Optional[int]
    incident_type: str
    severity: str
    status: str
    reported_by: str
    owner: str
    containment_action: str
    closed_at: Optional[str]
    notes: str
    created_at: str
    updated_at: str


@strawberry.type
class MaterialChecklistItemNode:
    id: int
    material_check_id: int
    question: str
    result: Optional[str]
    comment: str
    created_at: str
    updated_at: str


@strawberry.type
class MaterialCheckNode:
    id: int
    check_type: str
    target_type: str
    target_id: Optional[int]
    title: str
    checked_by: str
    check_date: Optional[str]
    status: str
    score: Optional[float]
    notes: str
    checklist_items: list[MaterialChecklistItemNode]
    created_at: str
    updated_at: str


@strawberry.type
class MaterialIssueNode:
    id: int
    title: str
    description: str
    issue_type: str
    target_type: str
    target_id: Optional[int]
    material_item_id: Optional[int]
    material_bin_id: Optional[int]
    quantity: Optional[float]
    uom: str
    severity: str
    status: str
    reported_by: str
    owner: str
    notes: str
    created_at: str
    updated_at: str


# ──────────────────────────────────────────────
#  Converter helpers
# ──────────────────────────────────────────────

def _to_problem_node(p: Problem) -> ProblemNode:
    return ProblemNode(
        id=p.id, control_area=p.control_area,
        title=p.title, description=p.description,
        problem_type=p.problem_type, target_type=p.target_type,
        target_id=p.target_id, severity=p.severity, status=p.status,
        reported_by=p.reported_by,
        reported_at=p.reported_at.isoformat() if p.reported_at else "",
        source_type=p.source_type, source_id=p.source_id,
        owner=p.owner,
        due_date=p.due_date.isoformat() if p.due_date else None,
        notes=p.notes,
        closed_at=p.closed_at.isoformat() if p.closed_at else None,
        plant=p.plant, production_line=p.production_line,
        department=p.department, resource_group=p.resource_group,
        resource=p.resource,
        containment_notes=p.containment_notes,
        root_cause=p.root_cause,
        resolution_notes=p.resolution_notes,
        created_at=p.created_at.isoformat() if p.created_at else "",
        updated_at=p.updated_at.isoformat() if p.updated_at else "",
    )


def _to_action_node(a: Action) -> ActionNode:
    return ActionNode(
        id=a.id, control_area=a.control_area,
        title=a.title, description=a.description,
        action_type=a.action_type,
        source_type=a.source_type, source_id=a.source_id,
        linked_issue_id=a.linked_issue_id,
        owner=a.owner, assigned_to=a.assigned_to,
        due_date=a.due_date.isoformat() if a.due_date else None,
        status=a.status, priority=a.priority,
        completed_at=a.completed_at.isoformat() if a.completed_at else None,
        completed_by=a.completed_by,
        completion_notes=a.completion_notes,
        notes=a.notes,
        target_type=a.target_type, target_id=a.target_id,
        plant=a.plant, production_line=a.production_line,
        department=a.department, resource_group=a.resource_group,
        resource=a.resource,
        created_at=a.created_at.isoformat() if a.created_at else "",
        updated_at=a.updated_at.isoformat() if a.updated_at else "",
    )


def _to_production_checklist_item_node(i: ProductionChecklistItem) -> ProductionChecklistItemNode:
    return ProductionChecklistItemNode(
        id=i.id, production_check_id=i.production_check_id,
        question=i.question, result=i.result, comment=i.comment,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )


def _to_production_check_node(c: ProductionCheck) -> ProductionCheckNode:
    return ProductionCheckNode(
        id=c.id, check_type=c.check_type,
        target_type=c.target_type, target_id=c.target_id,
        title=c.title, checked_by=c.checked_by,
        check_date=c.check_date.isoformat() if c.check_date else None,
        status=c.status,
        score=float(c.score) if c.score is not None else None,
        notes=c.notes,
        checklist_items=[_to_production_checklist_item_node(i) for i in c.checklist_items.all()],
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


def _to_quality_checklist_item_node(i: QualityChecklistItem) -> QualityChecklistItemNode:
    return QualityChecklistItemNode(
        id=i.id, quality_check_id=i.quality_check_id,
        question=i.question, result=i.result, comment=i.comment,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )


def _to_quality_check_node(c: QualityCheck) -> QualityCheckNode:
    return QualityCheckNode(
        id=c.id, check_type=c.check_type,
        target_type=c.target_type, target_id=c.target_id,
        title=c.title, checked_by=c.checked_by,
        check_date=c.check_date.isoformat() if c.check_date else None,
        status=c.status,
        score=float(c.score) if c.score is not None else None,
        notes=c.notes,
        checklist_items=[_to_quality_checklist_item_node(i) for i in c.checklist_items.all()],
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


def _to_dmr_node(d: DMR) -> DMRNode:
    return DMRNode(
        id=d.id, dmr_number=d.dmr_number, title=d.title,
        description=d.description, material_item_id=d.material_item_id,
        product_variant_id=d.product_variant_id, target_type=d.target_type,
        target_id=d.target_id,
        quantity=float(d.quantity) if d.quantity is not None else None,
        uom=d.uom, defect_description=d.defect_description,
        containment=d.containment, severity=d.severity,
        disposition=d.disposition, status=d.status, owner=d.owner,
        due_date=d.due_date.isoformat() if d.due_date else None,
        closed_at=d.closed_at.isoformat() if d.closed_at else None,
        notes=d.notes,
        created_at=d.created_at.isoformat() if d.created_at else "",
        updated_at=d.updated_at.isoformat() if d.updated_at else "",
    )


def _to_rma_node(r: RMA) -> RMANode:
    return RMANode(
        id=r.id, rma_number=r.rma_number, customer_name=r.customer_name,
        part_number=r.part_number, serial_lot=r.serial_lot,
        product_variant_id=r.product_variant_id, material_item_id=r.material_item_id,
        quantity=float(r.quantity) if r.quantity is not None else None,
        reason=r.reason, status=r.status,
        received_date=r.received_date.isoformat() if r.received_date else None,
        due_date=r.due_date.isoformat() if r.due_date else None,
        disposition=r.disposition,
        customer_response_status=r.customer_response_status,
        receiving_inspection_result=r.receiving_inspection_result,
        confirmed_defect=r.confirmed_defect,
        suspected_cause=r.suspected_cause,
        confirmed_cause=r.confirmed_cause,
        disposition_owner=r.disposition_owner,
        disposition_date=r.disposition_date.isoformat() if r.disposition_date else None,
        customer_response=r.customer_response,
        owner=r.owner, notes=r.notes,
        created_at=r.created_at.isoformat() if r.created_at else "",
        updated_at=r.updated_at.isoformat() if r.updated_at else "",
    )


def _to_safety_checklist_item_node(i: SafetyChecklistItem) -> SafetyChecklistItemNode:
    return SafetyChecklistItemNode(
        id=i.id, safety_check_id=i.safety_check_id,
        question=i.question, result=i.result, comment=i.comment,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )


def _to_safety_check_node(c: SafetyCheck) -> SafetyCheckNode:
    return SafetyCheckNode(
        id=c.id, check_type=c.check_type,
        target_type=c.target_type, target_id=c.target_id,
        title=c.title, checked_by=c.checked_by,
        check_date=c.check_date.isoformat() if c.check_date else None,
        status=c.status,
        score=float(c.score) if c.score is not None else None,
        notes=c.notes,
        checklist_items=[_to_safety_checklist_item_node(i) for i in c.checklist_items.all()],
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


def _to_safety_event_node(e: SafetyEvent) -> SafetyEventNode:
    return SafetyEventNode(
        id=e.id, event_type=e.event_type, severity=e.severity,
        status=e.status, target_type=e.target_type,
        target_id=e.target_id, title=e.title, description=e.description,
        reported_by=e.reported_by,
        reported_at=e.reported_at.isoformat() if e.reported_at else "",
        occurred_at=e.occurred_at.isoformat() if e.occurred_at else None,
        location_text=e.location_text or "",
        immediate_action=e.immediate_action or "",
        injury_involved=e.injury_involved,
        property_damage=e.property_damage,
        environmental_impact=e.environmental_impact,
        owner=e.owner or "",
        closed_at=e.closed_at.isoformat() if e.closed_at else None,
        notes=e.notes or "",
        created_at=e.created_at.isoformat() if e.created_at else "",
        updated_at=e.updated_at.isoformat() if e.updated_at else "",
    )


def _to_safety_incident_node(i: SafetyIncident) -> SafetyIncidentNode:
    return SafetyIncidentNode(
        id=i.id, title=i.title, description=i.description,
        target_type=i.target_type, target_id=i.target_id,
        incident_type=i.incident_type, severity=i.severity,
        status=i.status, reported_by=i.reported_by, owner=i.owner,
        containment_action=i.containment_action,
        closed_at=i.closed_at.isoformat() if i.closed_at else None,
        notes=i.notes,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )


def _to_material_checklist_item_node(i: MaterialChecklistItem) -> MaterialChecklistItemNode:
    return MaterialChecklistItemNode(
        id=i.id, material_check_id=i.material_check_id,
        question=i.question, result=i.result, comment=i.comment,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )


def _to_material_check_node(c: MaterialCheck) -> MaterialCheckNode:
    return MaterialCheckNode(
        id=c.id, check_type=c.check_type,
        target_type=c.target_type, target_id=c.target_id,
        title=c.title, checked_by=c.checked_by,
        check_date=c.check_date.isoformat() if c.check_date else None,
        status=c.status,
        score=float(c.score) if c.score is not None else None,
        notes=c.notes,
        checklist_items=[_to_material_checklist_item_node(i) for i in c.checklist_items.all()],
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


def _to_material_issue_node(m: MaterialIssue) -> MaterialIssueNode:
    return MaterialIssueNode(
        id=m.id, title=m.title, description=m.description,
        issue_type=m.issue_type, target_type=m.target_type,
        target_id=m.target_id, material_item_id=m.material_item_id,
        material_bin_id=m.material_bin_id,
        quantity=float(m.quantity) if m.quantity is not None else None,
        uom=m.uom, severity=m.severity, status=m.status,
        reported_by=m.reported_by, owner=m.owner, notes=m.notes,
        created_at=m.created_at.isoformat() if m.created_at else "",
        updated_at=m.updated_at.isoformat() if m.updated_at else "",
    )


# ──────────────────────────────────────────────
#  Safety Compliance Nodes
# ──────────────────────────────────────────────

@strawberry.type
class SafetyInjuryClaimNode:
    id: int
    safety_event_id: Optional[int] = strawberry.field(name="safetyEventId")
    claim_number: str = strawberry.field(name="claimNumber")
    claimant_name: str = strawberry.field(name="claimantName")
    claimant_employee_id: str = strawberry.field(name="claimantEmployeeId")
    claim_type: str = strawberry.field(name="claimType")
    status: str
    injury_summary: str = strawberry.field(name="injurySummary")
    body_area: str = strawberry.field(name="bodyArea")
    lost_time: bool = strawberry.field(name="lostTime")
    restricted_work: bool = strawberry.field(name="restrictedWork")
    reported_to_insurer: bool = strawberry.field(name="reportedToInsurer")
    insurer_reference: str = strawberry.field(name="insurerReference")
    opened_at: Optional[str] = strawberry.field(name="openedAt", default=None)
    closed_at: Optional[str] = strawberry.field(name="closedAt", default=None)
    owner: str
    notes: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class SafetyMedicalCaseNode:
    id: int
    safety_event_id: Optional[int] = strawberry.field(name="safetyEventId")
    injury_claim_id: Optional[int] = strawberry.field(name="injuryClaimId")
    affected_person_id: Optional[int] = strawberry.field(name="affectedPersonId")
    case_number: str = strawberry.field(name="caseNumber")
    status: str
    care_type: str = strawberry.field(name="careType")
    visit_required: bool = strawberry.field(name="visitRequired")
    visit_date: Optional[str] = strawberry.field(name="visitDate", default=None)
    work_restriction: bool = strawberry.field(name="workRestriction", default=False)
    restriction_summary: str = strawberry.field(name="restrictionSummary")
    return_to_work_date: Optional[str] = strawberry.field(name="returnToWorkDate", default=None)
    confidential_notes: str = strawberry.field(name="confidentialNotes")
    owner: str
    notes: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


def _to_medical_case_node(m) -> SafetyMedicalCaseNode:
    return SafetyMedicalCaseNode(
        id=m.id, safety_event_id=m.safety_event_id,
        injury_claim_id=m.injury_claim_id,
        affected_person_id=m.affected_person_id,
        case_number=m.case_number, status=m.status,
        care_type=m.care_type,
        visit_required=m.visit_required,
        visit_date=m.visit_date.isoformat() if m.visit_date else None,
        work_restriction=m.work_restriction,
        restriction_summary=m.restriction_summary,
        return_to_work_date=m.return_to_work_date.isoformat() if m.return_to_work_date else None,
        confidential_notes=m.confidential_notes,
        owner=m.owner, notes=m.notes,
        created_at=m.created_at.isoformat() if m.created_at else "",
        updated_at=m.updated_at.isoformat() if m.updated_at else "",
    )


def _to_injury_claim_node(c) -> SafetyInjuryClaimNode:
    return SafetyInjuryClaimNode(
        id=c.id, safety_event_id=c.safety_event_id,
        claim_number=c.claim_number or "",
        claimant_name=c.claimant_name,
        claimant_employee_id=c.claimant_employee_id or "",
        claim_type=c.claim_type, status=c.status,
        injury_summary=c.injury_summary or "",
        body_area=c.body_area or "",
        lost_time=c.lost_time,
        restricted_work=c.restricted_work,
        reported_to_insurer=c.reported_to_insurer,
        insurer_reference=c.insurer_reference or "",
        opened_at=c.opened_at.isoformat() if c.opened_at else None,
        closed_at=c.closed_at.isoformat() if c.closed_at else None,
        owner=c.owner, notes=c.notes or "",
        created_at=c.created_at.isoformat() if c.created_at else "",
        updated_at=c.updated_at.isoformat() if c.updated_at else "",
    )


@strawberry.type
class SafetyEnvironmentalReportNode:
    id: int
    safety_event_id: Optional[int] = strawberry.field(name="safetyEventId")
    report_type: str = strawberry.field(name="reportType")
    status: str
    title: str
    description: str
    material_involved: str = strawberry.field(name="materialInvolved")
    estimated_quantity: Optional[float] = strawberry.field(name="estimatedQuantity", default=None)
    unit: str
    containment_action: str = strawberry.field(name="containmentAction")
    cleanup_required: bool = strawberry.field(name="cleanupRequired")
    reported_externally: bool = strawberry.field(name="reportedExternally")
    external_reference: str = strawberry.field(name="externalReference")
    occurred_at: Optional[str] = strawberry.field(name="occurredAt", default=None)
    reported_at: str = strawberry.field(name="reportedAt")
    target_type: str = strawberry.field(name="targetType")
    target_id: Optional[int] = strawberry.field(name="targetId", default=None)
    location_text: str = strawberry.field(name="locationText")
    owner: str
    notes: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class SafetyCAPANode:
    id: int
    source_type: str = strawberry.field(name="sourceType")
    source_id: Optional[int] = strawberry.field(name="sourceId")
    title: str
    problem_statement: str = strawberry.field(name="problemStatement")
    root_cause: str = strawberry.field(name="rootCause")
    containment_action: str = strawberry.field(name="containmentAction")
    corrective_action: str = strawberry.field(name="correctiveAction")
    preventive_action: str = strawberry.field(name="preventiveAction")
    owner: str
    due_date: Optional[str] = strawberry.field(name="dueDate", default=None)
    completed_at: Optional[str] = strawberry.field(name="completedAt", default=None)
    effectiveness_check_required: bool = strawberry.field(name="effectivenessCheckRequired")
    effectiveness_result: Optional[str] = strawberry.field(name="effectivenessResult", default=None)
    status: str
    notes: str
    created_at: str = strawberry.field(name="createdAt")
    updated_at: str = strawberry.field(name="updatedAt")


@strawberry.type
class SafetyComplianceSummaryNode:
    open_claims: int = strawberry.field(name="openClaims")
    open_medical_cases: int = strawberry.field(name="openMedicalCases")
    open_environmental_reports: int = strawberry.field(name="openEnvironmentalReports")
    open_capas: int = strawberry.field(name="openCAPAs")
    overdue_capas: int = strawberry.field(name="overdueCAPAs")


# ──────────────────────────────────────────────
#  Safety Dashboard Types
# ──────────────────────────────────────────────

@strawberry.type
class SafetyEventTypeCount:
    event_type: str = strawberry.field(name="eventType")
    count: int


@strawberry.type
class SafetySeverityCount:
    severity: str
    count: int


@strawberry.type
class SafetyStatusCount:
    status: str
    count: int


@strawberry.type
class SafetyDashboardSummaryNode:
    total_events: int = strawberry.field(name="totalEvents")
    by_event_type: list[SafetyEventTypeCount] = strawberry.field(name="byEventType")
    by_severity: list[SafetySeverityCount] = strawberry.field(name="bySeverity")
    by_status: list[SafetyStatusCount] = strawberry.field(name="byStatus")
    open_events: int = strawberry.field(name="openEvents")
    under_review_events: int = strawberry.field(name="underReviewEvents")
    action_required_events: int = strawberry.field(name="actionRequiredEvents")
    closed_events: int = strawberry.field(name="closedEvents")
    critical_events: int = strawberry.field(name="criticalEvents")
    high_severity_events: int = strawberry.field(name="highSeverityEvents")
    incidents: int
    accidents: int
    near_misses: int = strawberry.field(name="nearMisses")
    hazards: int
    observations: int
    overdue_follow_ups: int = strawberry.field(name="overdueFollowUps")
    recent_events: list[SafetyEventNode] = strawberry.field(name="recentEvents")
    overdue_events: list[SafetyEventNode] = strawberry.field(name="overdueEvents")


# ──────────────────────────────────────────────
#  CheckQuery
# ──────────────────────────────────────────────

@strawberry.type
class CheckQuery:
    # ── Problems ──
    @strawberry.field
    def problems(self, control_area: Optional[str] = None,
                 status: Optional[str] = None,
                 problem_type: Optional[str] = None,
                 target_type: Optional[str] = None,
                 search: Optional[str] = None) -> list[ProblemNode]:
        filters = {}
        if control_area: filters["control_area"] = control_area
        if status: filters["status"] = status
        if problem_type: filters["problem_type"] = problem_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_problem_node(p) for p in ProblemService().list_problems(filters)]

    @strawberry.field
    def problem(self, id: int) -> Optional[ProblemNode]:
        p = ProblemService().get_problem(id)
        return _to_problem_node(p) if p else None

    # ── Actions ──
    @strawberry.field
    def actions(self, control_area: Optional[str] = None,
                status: Optional[str] = None,
                priority: Optional[str] = None,
                search: Optional[str] = None) -> list[ActionNode]:
        filters = {}
        if control_area: filters["control_area"] = control_area
        if status: filters["status"] = status
        if priority: filters["priority"] = priority
        if search: filters["search"] = search
        return [_to_action_node(a) for a in ActionService().list_actions(filters)]

    @strawberry.field
    def action(self, id: int) -> Optional[ActionNode]:
        a = ActionService().get_action(id)
        return _to_action_node(a) if a else None

    # ── Production Checks ──
    @strawberry.field
    def production_checks(self, status: Optional[str] = None,
                          check_type: Optional[str] = None,
                          target_type: Optional[str] = None,
                          search: Optional[str] = None) -> list[ProductionCheckNode]:
        filters = {}
        if status: filters["status"] = status
        if check_type: filters["check_type"] = check_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_production_check_node(c) for c in ProductionControlService().list_production_checks(filters)]

    @strawberry.field
    def production_check(self, id: int) -> Optional[ProductionCheckNode]:
        c = ProductionControlService().get_production_check(id)
        return _to_production_check_node(c) if c else None

    # ── Quality Checks ──
    @strawberry.field
    def quality_checks(self, status: Optional[str] = None,
                       check_type: Optional[str] = None,
                       target_type: Optional[str] = None,
                       search: Optional[str] = None) -> list[QualityCheckNode]:
        filters = {}
        if status: filters["status"] = status
        if check_type: filters["check_type"] = check_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_quality_check_node(c) for c in QualityControlService().list_quality_checks(filters)]

    @strawberry.field
    def quality_check(self, id: int) -> Optional[QualityCheckNode]:
        c = QualityControlService().get_quality_check(id)
        return _to_quality_check_node(c) if c else None

    # ── DMRs ──
    @strawberry.field
    def dmrs(self, status: Optional[str] = None,
             target_type: Optional[str] = None,
             search: Optional[str] = None) -> list[DMRNode]:
        filters = {}
        if status: filters["status"] = status
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_dmr_node(d) for d in QualityControlService().list_dmrs(filters)]

    @strawberry.field
    def dmr(self, id: int) -> Optional[DMRNode]:
        d = QualityControlService().get_dmr(id)
        return _to_dmr_node(d) if d else None

    # ── RMAs ──
    @strawberry.field
    def rmas(self, status: Optional[str] = None,
             search: Optional[str] = None) -> list[RMANode]:
        filters = {}
        if status: filters["status"] = status
        if search: filters["search"] = search
        return [_to_rma_node(r) for r in QualityControlService().list_rmas(filters)]

    @strawberry.field
    def rma(self, id: int) -> Optional[RMANode]:
        r = QualityControlService().get_rma(id)
        return _to_rma_node(r) if r else None

    # ── Safety Checks ──
    @strawberry.field
    def safety_checks(self, status: Optional[str] = None,
                      check_type: Optional[str] = None,
                      target_type: Optional[str] = None,
                      search: Optional[str] = None) -> list[SafetyCheckNode]:
        filters = {}
        if status: filters["status"] = status
        if check_type: filters["check_type"] = check_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_safety_check_node(c) for c in SafetyControlService().list_safety_checks(filters)]

    @strawberry.field
    def safety_check(self, id: int) -> Optional[SafetyCheckNode]:
        c = SafetyControlService().get_safety_check(id)
        return _to_safety_check_node(c) if c else None

    # ── Safety Dashboard Summary ──
    @strawberry.field(name="safetyDashboardSummary")
    def safety_dashboard_summary(self) -> SafetyDashboardSummaryNode:
        from django.db.models import Count, Q
        from datetime import date
        qs = SafetyEvent.objects.all()
        total = qs.count()
        by_type = list(qs.values("event_type").annotate(count=Count("id")).order_by("event_type"))
        by_severity = list(qs.values("severity").annotate(count=Count("id")).order_by("severity"))
        by_status = list(qs.values("status").annotate(count=Count("id")).order_by("status"))
        open_events = qs.exclude(status__in=["CLOSED", "CANCELLED"]).count()
        under_review_events = qs.filter(status="UNDER_REVIEW").count()
        action_required_events = qs.filter(status="ACTION_REQUIRED").count()
        closed_events = qs.filter(status__in=["CLOSED", "CANCELLED"]).count()
        critical_events = qs.filter(severity="CRITICAL").exclude(status__in=["CLOSED", "CANCELLED"]).count()
        high_severity_events = qs.filter(severity__in=["HIGH", "CRITICAL"]).exclude(status__in=["CLOSED", "CANCELLED"]).count()

        def type_count(t: str) -> int:
            entry = next((e for e in by_type if e["event_type"] == t), None)
            return entry["count"] if entry else 0

        incidents = type_count("INCIDENT")
        accidents = type_count("ACCIDENT")
        near_misses = type_count("NEAR_MISS")
        hazards = type_count("HAZARD")
        observations = type_count("OBSERVATION")
        overdue_follow_ups = SafetyEvent.objects.filter(
            Q(status="ACTION_REQUIRED") | Q(status="UNDER_REVIEW"),
            occurred_at__lt=date.today(),
        ).count()

        recent = qs.order_by("-created_at")[:10]
        return SafetyDashboardSummaryNode(
            total_events=total,
            by_event_type=[SafetyEventTypeCount(event_type=e["event_type"], count=e["count"]) for e in by_type],
            by_severity=[SafetySeverityCount(severity=s["severity"], count=s["count"]) for s in by_severity],
            by_status=[SafetyStatusCount(status=s["status"], count=s["count"]) for s in by_status],
            open_events=open_events,
            under_review_events=under_review_events,
            action_required_events=action_required_events,
            closed_events=closed_events,
            critical_events=critical_events,
            high_severity_events=high_severity_events,
            incidents=incidents,
            accidents=accidents,
            near_misses=near_misses,
            hazards=hazards,
            observations=observations,
            overdue_follow_ups=overdue_follow_ups,
            recent_events=[_to_safety_event_node(e) for e in recent],
            overdue_events=[_to_safety_event_node(e) for e in
                           SafetyEvent.objects.filter(
                               Q(status__in=["ACTION_REQUIRED", "UNDER_REVIEW"]) &
                               Q(occurred_at__lt=date.today())
                           ).order_by("occurred_at")[:6]],
        )

    # ── Safety Events ──
    @strawberry.field(name="safetyEvents")
    def safety_events(self, event_type: Optional[str] = None,
                      status: Optional[str] = None,
                      target_type: Optional[str] = None,
                      severity: Optional[str] = None,
                      search: Optional[str] = None,
                      is_overdue: Optional[bool] = strawberry.field(name="isOverdue", default=None)) -> list[SafetyEventNode]:
        filters = {}
        if event_type: filters["event_type"] = event_type
        if status: filters["status"] = status
        if target_type: filters["target_type"] = target_type
        if severity: filters["severity"] = severity
        if search: filters["search"] = search
        if is_overdue is not None:
            filters["is_overdue"] = is_overdue
        return [_to_safety_event_node(e) for e in SafetyEventService().list_events(filters)]

    @strawberry.field(name="safetyEvent")
    def safety_event(self, id: int) -> Optional[SafetyEventNode]:
        e = SafetyEventService().get_event(id)
        return _to_safety_event_node(e) if e else None

    # ── Safety Incidents (legacy) ──
    @strawberry.field
    def safety_incidents(self, status: Optional[str] = None,
                         incident_type: Optional[str] = None,
                         target_type: Optional[str] = None,
                         search: Optional[str] = None) -> list[SafetyIncidentNode]:
        filters = {}
        if status: filters["status"] = status
        if incident_type: filters["incident_type"] = incident_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_safety_incident_node(i) for i in SafetyControlService().list_safety_incidents(filters)]

    @strawberry.field
    def safety_incident(self, id: int) -> Optional[SafetyIncidentNode]:
        i = SafetyControlService().get_safety_incident(id)
        return _to_safety_incident_node(i) if i else None

    # ── Material Checks ──
    @strawberry.field
    def material_checks(self, status: Optional[str] = None,
                        check_type: Optional[str] = None,
                        target_type: Optional[str] = None,
                        search: Optional[str] = None) -> list[MaterialCheckNode]:
        filters = {}
        if status: filters["status"] = status
        if check_type: filters["check_type"] = check_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_material_check_node(c) for c in MaterialControlService().list_material_checks(filters)]

    @strawberry.field
    def material_check(self, id: int) -> Optional[MaterialCheckNode]:
        c = MaterialControlService().get_material_check(id)
        return _to_material_check_node(c) if c else None

    # ── Material Issues ──
    @strawberry.field
    def material_issues(self, status: Optional[str] = None,
                        issue_type: Optional[str] = None,
                        target_type: Optional[str] = None,
                        search: Optional[str] = None) -> list[MaterialIssueNode]:
        filters = {}
        if status: filters["status"] = status
        if issue_type: filters["issue_type"] = issue_type
        if target_type: filters["target_type"] = target_type
        if search: filters["search"] = search
        return [_to_material_issue_node(m) for m in MaterialControlService().list_material_issues(filters)]

    @strawberry.field
    def material_issue(self, id: int) -> Optional[MaterialIssueNode]:
        m = MaterialControlService().get_material_issue(id)
        return _to_material_issue_node(m) if m else None

    # ── Safety Compliance Summary ──
    @strawberry.field(name="safetyComplianceSummary")
    def safety_compliance_summary(self) -> SafetyComplianceSummaryNode:
        from datetime import date
        from django.db.models import Q
        open_claims = SafetyInjuryClaim.objects.filter(status="OPEN").count()
        open_medical = SafetyMedicalCase.objects.filter(status="OPEN").count()
        open_env = SafetyEnvironmentalReport.objects.filter(status__in=["DRAFT", "REPORTED", "UNDER_REVIEW", "ACTION_REQUIRED"]).count()
        open_capas = SafetyCAPA.objects.exclude(status__in=["CLOSED", "CANCELLED", "EFFECTIVE", "INEFFECTIVE"]).count()
        overdue_capas = SafetyCAPA.objects.filter(
            due_date__lt=date.today(),
        ).exclude(status__in=["CLOSED", "CANCELLED"]).count()
        return SafetyComplianceSummaryNode(
            open_claims=open_claims,
            open_medical_cases=open_medical,
            open_environmental_reports=open_env,
            open_capas=open_capas,
            overdue_capas=overdue_capas,
        )

    # ── Safety Injury Claims ──
    @strawberry.field(name="safetyInjuryClaims")
    def safety_injury_claims(self, status: Optional[str] = None,
                             claim_type: Optional[str] = None,
                             search: Optional[str] = None) -> list[SafetyInjuryClaimNode]:
        filters = {}
        if status: filters["status"] = status
        if claim_type: filters["claim_type"] = claim_type
        if search: filters["search"] = search
        svc = SafetyInjuryClaimService()
        return [_to_injury_claim_node(c) for c in svc.list(filters)]

    @strawberry.field(name="safetyInjuryClaim")
    def safety_injury_claim(self, id: int) -> Optional[SafetyInjuryClaimNode]:
        c = SafetyInjuryClaimService().get(id)
        return _to_injury_claim_node(c) if c else None

    # ── Safety Medical Cases ──
    @strawberry.field(name="safetyMedicalCases")
    def safety_medical_cases(self, status: Optional[str] = None,
                             care_type: Optional[str] = None) -> list[SafetyMedicalCaseNode]:
        filters = {}
        if status: filters["status"] = status
        if care_type: filters["care_type"] = care_type
        svc = SafetyMedicalCaseService()
        return [_to_medical_case_node(m) for m in svc.list(filters)]

    @strawberry.field(name="safetyMedicalCase")
    def safety_medical_case(self, id: int) -> Optional[SafetyMedicalCaseNode]:
        m = SafetyMedicalCaseService().get(id)
        return _to_medical_case_node(m) if m else None

    # ── Safety Environmental Reports ──
    @strawberry.field(name="safetyEnvironmentalReports")
    def safety_environmental_reports(self, status: Optional[str] = None,
                                     report_type: Optional[str] = None,
                                     search: Optional[str] = None) -> list[SafetyEnvironmentalReportNode]:
        filters = {}
        if status: filters["status"] = status
        if report_type: filters["report_type"] = report_type
        if search: filters["search"] = search
        svc = SafetyEnvironmentalReportService()
        return [_to_env_report_node(r) for r in svc.list(filters)]

    @strawberry.field(name="safetyEnvironmentalReport")
    def safety_environmental_report(self, id: int) -> Optional[SafetyEnvironmentalReportNode]:
        r = SafetyEnvironmentalReportService().get(id)
        return _to_env_report_node(r) if r else None

    # ── Safety CAPAs ──
    @strawberry.field(name="safetyCAPAs")
    def safety_capas(self, status: Optional[str] = None,
                     source_type: Optional[str] = None,
                     search: Optional[str] = None) -> list[SafetyCAPANode]:
        filters = {}
        if status: filters["status"] = status
        if source_type: filters["source_type"] = source_type
        if search: filters["search"] = search
        svc = SafetyCAPAService()
        return [_to_capa_node(c) for c in svc.list(filters)]

    @strawberry.field(name="safetyCAPA")
    def safety_capa(self, id: int) -> Optional[SafetyCAPANode]:
        c = SafetyCAPAService().get(id)
        return _to_capa_node(c) if c else None


# ──────────────────────────────────────────────
#  CheckMutation
# ──────────────────────────────────────────────

@strawberry.type
class CheckMutation:
    # ── Problems ──
    @strawberry.mutation
    def create_problem(self, info: strawberry.types.Info, title: str,
                       problem_type: str, target_type: str,
                       target_id: Optional[int] = None,
                       description: Optional[str] = None,
                       severity: str = "MEDIUM",
                       reported_by: Optional[str] = None,
                       source_type: Optional[str] = None,
                       source_id: Optional[int] = None,
                       control_area: str = "PRODUCTION",
                       owner: Optional[str] = None,
                       due_date: Optional[str] = None,
                       notes: Optional[str] = None,
                       plant: Optional[str] = None,
                       production_line: Optional[str] = None,
                       department: Optional[str] = None,
                       resource_group: Optional[str] = None,
                       resource: Optional[str] = None,
                       containment_notes: Optional[str] = None,
                       root_cause: Optional[str] = None,
                       resolution_notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "problem_type": problem_type, "target_type": target_type,
            "target_id": target_id, "severity": severity,
            "reported_by": reported_by, "source_type": source_type,
            "source_id": source_id, "control_area": control_area,
            "owner": owner, "notes": notes,
            "plant": plant, "production_line": production_line,
            "department": department, "resource_group": resource_group,
            "resource": resource,
            "containment_notes": containment_notes,
            "root_cause": root_cause,
            "resolution_notes": resolution_notes,
        }.items() if v is not None}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        p = ProblemService().create_problem(**kwargs)
        return f"Problem created: {p.title}"

    @strawberry.mutation
    def update_problem(self, info: strawberry.types.Info, id: int,
                       title: Optional[str] = None,
                       description: Optional[str] = None,
                       severity: Optional[str] = None,
                       owner: Optional[str] = None,
                       due_date: Optional[str] = None,
                       notes: Optional[str] = None,
                       plant: Optional[str] = None,
                       production_line: Optional[str] = None,
                       department: Optional[str] = None,
                       resource_group: Optional[str] = None,
                       resource: Optional[str] = None,
                       containment_notes: Optional[str] = None,
                       root_cause: Optional[str] = None,
                       resolution_notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "severity": severity, "owner": owner, "notes": notes,
            "plant": plant, "production_line": production_line,
            "department": department, "resource_group": resource_group,
            "resource": resource,
            "containment_notes": containment_notes,
            "root_cause": root_cause,
            "resolution_notes": resolution_notes,
        }.items() if v is not None}
        if due_date is not None:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
        ProblemService().update_problem(id, **kwargs)
        return "Problem updated"

    @strawberry.mutation
    def review_problem(self, info: strawberry.types.Info, id: int) -> str:
        ProblemService().review_problem(id)
        return "Problem moved to IN_REVIEW"

    @strawberry.mutation
    def start_problem(self, info: strawberry.types.Info, id: int) -> str:
        ProblemService().start_problem(id)
        return "Problem moved to IN_PROGRESS"

    @strawberry.mutation
    def resolve_problem(self, info: strawberry.types.Info, id: int) -> str:
        ProblemService().resolve_problem(id)
        return "Problem resolved"

    @strawberry.mutation
    def contain_problem(self, info: strawberry.types.Info, id: int) -> str:
        ProblemService().contain_problem(id)
        return "Problem contained"

    @strawberry.mutation
    def close_problem(self, info: strawberry.types.Info, id: int) -> str:
        ProblemService().close_problem(id)
        return "Problem closed"

    @strawberry.mutation
    def cancel_problem(self, info: strawberry.types.Info, id: int) -> str:
        ProblemService().cancel_problem(id)
        return "Problem cancelled"

    # ── Actions ──
    @strawberry.mutation
    def create_action(self, info: strawberry.types.Info, title: str,
                      description: Optional[str] = None,
                      action_type: str = "CORRECTIVE",
                      owner: Optional[str] = None,
                      assigned_to: Optional[str] = None,
                      due_date: Optional[str] = None,
                      priority: str = "MEDIUM",
                      source_type: Optional[str] = None,
                      source_id: Optional[int] = None,
                      linked_issue_id: Optional[int] = None,
                      control_area: str = "PRODUCTION",
                      notes: Optional[str] = None,
                      target_type: Optional[str] = None,
                      target_id: Optional[int] = None,
                      plant: Optional[str] = None,
                      production_line: Optional[str] = None,
                      department: Optional[str] = None,
                      resource_group: Optional[str] = None,
                      resource: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "action_type": action_type,
            "owner": owner, "assigned_to": assigned_to,
            "priority": priority,
            "source_type": source_type, "source_id": source_id,
            "linked_issue_id": linked_issue_id,
            "control_area": control_area, "notes": notes,
            "target_type": target_type, "target_id": target_id,
            "plant": plant, "production_line": production_line,
            "department": department, "resource_group": resource_group,
            "resource": resource,
        }.items() if v is not None}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        a = ActionService().create_action(**kwargs)
        return f"Action created: {a.title}"

    @strawberry.mutation
    def update_action(self, info: strawberry.types.Info, id: int,
                      title: Optional[str] = None,
                      description: Optional[str] = None,
                      action_type: Optional[str] = None,
                      owner: Optional[str] = None,
                      assigned_to: Optional[str] = None,
                      priority: Optional[str] = None,
                      due_date: Optional[str] = None,
                      notes: Optional[str] = None,
                      plant: Optional[str] = None,
                      production_line: Optional[str] = None,
                      department: Optional[str] = None,
                      resource_group: Optional[str] = None,
                      resource: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "action_type": action_type,
            "owner": owner, "assigned_to": assigned_to,
            "priority": priority, "notes": notes,
            "plant": plant, "production_line": production_line,
            "department": department, "resource_group": resource_group,
            "resource": resource,
        }.items() if v is not None}
        if due_date is not None:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
        ActionService().update_action(id, **kwargs)
        return "Action updated"

    @strawberry.mutation
    def start_action(self, info: strawberry.types.Info, id: int) -> str:
        ActionService().start_action(id)
        return "Action started"

    @strawberry.mutation
    def complete_action(self, info: strawberry.types.Info, id: int,
                        completed_by: str = "",
                        completion_notes: str = "") -> str:
        ActionService().complete_action(id, completed_by=completed_by,
                                        completion_notes=completion_notes)
        return "Action completed"

    @strawberry.mutation
    def create_action_from_issue(self, info: strawberry.types.Info,
                                 issue_id: int, title: str,
                                 description: str = "",
                                 action_type: str = "CORRECTIVE",
                                 assigned_to: str = "",
                                 due_date: Optional[str] = None,
                                 priority: str = "MEDIUM",
                                 notes: str = "",
                                 plant: str = "",
                                 production_line: str = "",
                                 department: str = "",
                                 resource_group: str = "",
                                 resource: str = "") -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "action_type": action_type,
            "assigned_to": assigned_to,
            "priority": priority, "notes": notes,
            "plant": plant, "production_line": production_line,
            "department": department, "resource_group": resource_group,
            "resource": resource,
        }.items() if v is not None}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        a = ActionService().create_action_from_issue(issue_id, **kwargs)
        return f"Action created from issue: {a.title}"

    @strawberry.mutation
    def link_action_to_issue(self, info: strawberry.types.Info,
                             action_id: int, issue_id: int) -> str:
        ActionService().link_issue(action_id, issue_id)
        return "Action linked to issue"

    @strawberry.mutation
    def cancel_action(self, info: strawberry.types.Info, id: int) -> str:
        ActionService().cancel_action(id)
        return "Action cancelled"

    # ── Production Checks ──
    @strawberry.mutation
    def create_production_check(self, info: strawberry.types.Info, title: str,
                                check_type: str, target_type: str,
                                target_id: Optional[int] = None,
                                checked_by: str = "",
                                check_date: Optional[str] = None,
                                notes: str = "") -> str:
        kwargs = {"title": title, "check_type": check_type,
                  "target_type": target_type, "target_id": target_id,
                  "checked_by": checked_by, "notes": notes}
        if check_date:
            from datetime import datetime
            kwargs["check_date"] = datetime.strptime(check_date, "%Y-%m-%d").date()
        c = ProductionControlService().create_production_check(**kwargs)
        return f"Production check created: {c.title}"

    @strawberry.mutation
    def update_production_check(self, info: strawberry.types.Info, id: int,
                                title: Optional[str] = None,
                                checked_by: Optional[str] = None,
                                notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "checked_by": checked_by, "notes": notes,
        }.items() if v is not None}
        ProductionControlService().update_production_check(id, **kwargs)
        return "Production check updated"

    @strawberry.mutation
    def add_production_checklist_item(self, info: strawberry.types.Info,
                                      check_id: int, question: str) -> str:
        ProductionControlService().add_checklist_item(check_id, question=question)
        return "Checklist item added"

    @strawberry.mutation
    def update_production_checklist_item(self, info: strawberry.types.Info,
                                         id: int, result: str = "",
                                         comment: str = "") -> str:
        ProductionControlService().update_checklist_item(
            id, result=result or None, comment=comment or None,
        )
        return "Checklist item updated"

    @strawberry.mutation
    def complete_production_check(self, info: strawberry.types.Info, id: int) -> str:
        ProductionControlService().complete_production_check(id)
        return "Production check completed"

    # ── Quality Checks ──
    @strawberry.mutation
    def create_quality_check(self, info: strawberry.types.Info, title: str,
                             check_type: str, target_type: str,
                             target_id: Optional[int] = None,
                             checked_by: str = "",
                             check_date: Optional[str] = None,
                             notes: str = "") -> str:
        kwargs = {"title": title, "check_type": check_type,
                  "target_type": target_type, "target_id": target_id,
                  "checked_by": checked_by, "notes": notes}
        if check_date:
            from datetime import datetime
            kwargs["check_date"] = datetime.strptime(check_date, "%Y-%m-%d").date()
        c = QualityControlService().create_quality_check(**kwargs)
        return f"Quality check created: {c.title}"

    @strawberry.mutation
    def update_quality_check(self, info: strawberry.types.Info, id: int,
                             title: Optional[str] = None,
                             checked_by: Optional[str] = None,
                             notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "checked_by": checked_by, "notes": notes,
        }.items() if v is not None}
        QualityControlService().update_quality_check(id, **kwargs)
        return "Quality check updated"

    @strawberry.mutation
    def add_quality_checklist_item(self, info: strawberry.types.Info,
                                   check_id: int, question: str) -> str:
        QualityControlService().add_checklist_item(check_id, question=question)
        return "Checklist item added"

    @strawberry.mutation
    def update_quality_checklist_item(self, info: strawberry.types.Info,
                                      id: int, result: str = "",
                                      comment: str = "") -> str:
        QualityControlService().update_checklist_item(
            id, result=result or None, comment=comment or None,
        )
        return "Checklist item updated"

    @strawberry.mutation
    def complete_quality_check(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().complete_quality_check(id)
        return "Quality check completed"

    # ── DMRs ──
    @strawberry.mutation
    def create_dmr(self, info: strawberry.types.Info, dmr_number: str,
                   title: str, target_type: str,
                   target_id: Optional[int] = None,
                   description: str = "",
                   defect_description: str = "",
                   containment: str = "",
                   severity: str = "MEDIUM",
                   quantity: Optional[float] = None,
                   uom: str = "",
                   owner: str = "",
                   due_date: Optional[str] = None,
                   notes: str = "") -> str:
        kwargs = {k: v for k, v in {
            "dmr_number": dmr_number, "title": title,
            "target_type": target_type, "target_id": target_id,
            "description": description,
            "defect_description": defect_description,
            "containment": containment, "severity": severity,
            "quantity": quantity, "uom": uom,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        d = QualityControlService().create_dmr(**kwargs)
        return f"DMR created: {d.dmr_number}"

    @strawberry.mutation
    def update_dmr(self, info: strawberry.types.Info, id: int,
                   title: Optional[str] = None,
                   description: Optional[str] = None,
                   defect_description: Optional[str] = None,
                   containment: Optional[str] = None,
                   severity: Optional[str] = None,
                   quantity: Optional[float] = None,
                   uom: Optional[str] = None,
                   owner: Optional[str] = None,
                   due_date: Optional[str] = None,
                   notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "defect_description": defect_description,
            "containment": containment, "severity": severity,
            "quantity": quantity, "uom": uom,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if due_date is not None:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
        QualityControlService().update_dmr(id, **kwargs)
        return "DMR updated"

    @strawberry.mutation
    def review_dmr(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().review_dmr(id)
        return "DMR moved to UNDER_REVIEW"

    @strawberry.mutation
    def disposition_dmr(self, info: strawberry.types.Info, id: int,
                        disposition: str) -> str:
        QualityControlService().disposition_dmr(id, disposition)
        return "DMR dispositioned"

    @strawberry.mutation
    def quarantine_dmr(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().quarantine_dmr(id)
        return "DMR moved to QUARANTINED"

    @strawberry.mutation
    def approve_disposition_dmr(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().approve_disposition_dmr(id)
        return "DMR disposition approved"

    @strawberry.mutation
    def close_dmr(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().close_dmr(id)
        return "DMR closed"

    @strawberry.mutation
    def cancel_dmr(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().cancel_dmr(id)
        return "DMR cancelled"

    # ── RMAs ──
    @strawberry.mutation
    def create_rma(self, info: strawberry.types.Info, rma_number: str,
                   customer_name: str,
                   part_number: str = "",
                   serial_lot: str = "",
                   quantity: Optional[float] = None,
                   reason: str = "",
                   due_date: Optional[str] = None,
                   disposition: Optional[str] = None,
                   customer_response_status: Optional[str] = None,
                   receiving_inspection_result: Optional[str] = None,
                   confirmed_defect: Optional[str] = None,
                   suspected_cause: Optional[str] = None,
                   confirmed_cause: Optional[str] = None,
                   disposition_owner: Optional[str] = None,
                   disposition_date: Optional[str] = None,
                   customer_response: Optional[str] = None,
                   owner: str = "",
                   notes: str = "") -> str:
        kwargs = {k: v for k, v in {
            "rma_number": rma_number, "customer_name": customer_name,
            "part_number": part_number, "serial_lot": serial_lot,
            "quantity": quantity, "reason": reason,
            "disposition": disposition,
            "customer_response_status": customer_response_status,
            "receiving_inspection_result": receiving_inspection_result,
            "confirmed_defect": confirmed_defect,
            "suspected_cause": suspected_cause,
            "confirmed_cause": confirmed_cause,
            "disposition_owner": disposition_owner,
            "customer_response": customer_response,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        if disposition_date:
            from datetime import datetime
            kwargs["disposition_date"] = datetime.strptime(disposition_date, "%Y-%m-%d").date()
        r = QualityControlService().create_rma(**kwargs)
        return f"RMA created: {r.rma_number}"

    @strawberry.mutation
    def update_rma(self, info: strawberry.types.Info, id: int,
                   customer_name: Optional[str] = None,
                   part_number: Optional[str] = None,
                   serial_lot: Optional[str] = None,
                   reason: Optional[str] = None,
                   due_date: Optional[str] = None,
                   disposition: Optional[str] = None,
                   customer_response_status: Optional[str] = None,
                   receiving_inspection_result: Optional[str] = None,
                   confirmed_defect: Optional[str] = None,
                   suspected_cause: Optional[str] = None,
                   confirmed_cause: Optional[str] = None,
                   disposition_owner: Optional[str] = None,
                   disposition_date: Optional[str] = None,
                   customer_response: Optional[str] = None,
                   owner: Optional[str] = None,
                   notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "customer_name": customer_name, "part_number": part_number,
            "serial_lot": serial_lot, "reason": reason,
            "disposition": disposition,
            "customer_response_status": customer_response_status,
            "receiving_inspection_result": receiving_inspection_result,
            "confirmed_defect": confirmed_defect,
            "suspected_cause": suspected_cause,
            "confirmed_cause": confirmed_cause,
            "disposition_owner": disposition_owner,
            "customer_response": customer_response,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if due_date is not None:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
        if disposition_date is not None:
            from datetime import datetime
            kwargs["disposition_date"] = datetime.strptime(disposition_date, "%Y-%m-%d").date() if disposition_date else None
        QualityControlService().update_rma(id, **kwargs)
        return "RMA updated"

    @strawberry.mutation
    def receive_rma(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().receive_rma(id)
        return "RMA received"

    @strawberry.mutation
    def review_rma(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().review_rma(id)
        return "RMA moved to UNDER_REVIEW"

    @strawberry.mutation
    def disposition_rma(self, info: strawberry.types.Info, id: int,
                        disposition: str) -> str:
        QualityControlService().disposition_rma(id, disposition)
        return "RMA dispositioned"

    @strawberry.mutation
    def close_rma(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().close_rma(id)
        return "RMA closed"

    @strawberry.mutation
    def cancel_rma(self, info: strawberry.types.Info, id: int) -> str:
        QualityControlService().cancel_rma(id)
        return "RMA cancelled"

    # ── Safety Checks ──
    @strawberry.mutation
    def create_safety_check(self, info: strawberry.types.Info, title: str,
                            check_type: str, target_type: str,
                            target_id: Optional[int] = None,
                            checked_by: str = "",
                            check_date: Optional[str] = None,
                            notes: str = "") -> str:
        kwargs = {"title": title, "check_type": check_type,
                  "target_type": target_type, "target_id": target_id,
                  "checked_by": checked_by, "notes": notes}
        if check_date:
            from datetime import datetime
            kwargs["check_date"] = datetime.strptime(check_date, "%Y-%m-%d").date()
        c = SafetyControlService().create_safety_check(**kwargs)
        return f"Safety check created: {c.title}"

    @strawberry.mutation
    def update_safety_check(self, info: strawberry.types.Info, id: int,
                            title: Optional[str] = None,
                            checked_by: Optional[str] = None,
                            notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "checked_by": checked_by, "notes": notes,
        }.items() if v is not None}
        SafetyControlService().update_safety_check(id, **kwargs)
        return "Safety check updated"

    @strawberry.mutation
    def add_safety_checklist_item(self, info: strawberry.types.Info,
                                  check_id: int, question: str) -> str:
        SafetyControlService().add_checklist_item(check_id, question=question)
        return "Checklist item added"

    @strawberry.mutation
    def update_safety_checklist_item(self, info: strawberry.types.Info,
                                     id: int, result: str = "",
                                     comment: str = "") -> str:
        SafetyControlService().update_checklist_item(
            id, result=result or None, comment=comment or None,
        )
        return "Checklist item updated"

    @strawberry.mutation
    def complete_safety_check(self, info: strawberry.types.Info, id: int) -> str:
        SafetyControlService().complete_safety_check(id)
        return "Safety check completed"

    # ── Safety Events ──
    @strawberry.mutation(name="createSafetyEvent")
    def create_safety_event(self, info: strawberry.types.Info, title: str,
                            event_type: str, target_type: str,
                            severity: str = "MEDIUM",
                            target_id: Optional[int] = None,
                            description: str = "",
                            reported_by: str = "",
                            occurred_at: Optional[str] = None,
                            location_text: str = "",
                            immediate_action: str = "",
                            injury_involved: bool = False,
                            property_damage: bool = False,
                            environmental_impact: bool = False,
                            owner: str = "",
                            notes: str = "") -> int:
        kwargs = {k: v for k, v in {
            "title": title, "event_type": event_type,
            "target_type": target_type, "target_id": target_id,
            "severity": severity, "description": description,
            "reported_by": reported_by,
            "location_text": location_text,
            "immediate_action": immediate_action,
            "injury_involved": injury_involved,
            "property_damage": property_damage,
            "environmental_impact": environmental_impact,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if occurred_at:
            from datetime import datetime
            kwargs["occurred_at"] = datetime.fromisoformat(occurred_at)
        e = SafetyEventService().create_event(**kwargs)
        return e.id

    @strawberry.mutation(name="updateSafetyEvent")
    def update_safety_event(self, info: strawberry.types.Info, id: int,
                            title: Optional[str] = None,
                            description: Optional[str] = None,
                            severity: Optional[str] = None,
                            owner: Optional[str] = None,
                            target_type: Optional[str] = None,
                            target_id: Optional[int] = None,
                            location_text: Optional[str] = None,
                            immediate_action: Optional[str] = None,
                            injury_involved: Optional[bool] = None,
                            property_damage: Optional[bool] = None,
                            environmental_impact: Optional[bool] = None,
                            notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "severity": severity, "owner": owner,
            "target_type": target_type, "target_id": target_id,
            "location_text": location_text,
            "immediate_action": immediate_action,
            "injury_involved": injury_involved,
            "property_damage": property_damage,
            "environmental_impact": environmental_impact,
            "notes": notes,
        }.items() if v is not None}
        SafetyEventService().update_event(id, **kwargs)
        return "Safety event updated"

    @strawberry.mutation(name="reportSafetyEvent")
    def report_safety_event(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEventService().report_event(id)
        return "Safety event reported"

    @strawberry.mutation(name="reviewSafetyEvent")
    def review_safety_event(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEventService().review_event(id)
        return "Safety event moved to UNDER_REVIEW"

    @strawberry.mutation(name="closeSafetyEvent")
    def close_safety_event(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEventService().close_event(id)
        return "Safety event closed"

    @strawberry.mutation(name="cancelSafetyEvent")
    def cancel_safety_event(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEventService().cancel_event(id)
        return "Safety event cancelled"

    # ── Safety Incidents (legacy) ──
    @strawberry.mutation
    def create_safety_incident(self, info: strawberry.types.Info, title: str,
                               incident_type: str, target_type: str,
                               target_id: Optional[int] = None,
                               description: str = "",
                               severity: str = "MEDIUM",
                               reported_by: str = "",
                               owner: str = "",
                               containment_action: str = "",
                               notes: str = "") -> str:
        kwargs = {k: v for k, v in {
            "title": title, "incident_type": incident_type,
            "target_type": target_type, "target_id": target_id,
            "description": description, "severity": severity,
            "reported_by": reported_by, "owner": owner,
            "containment_action": containment_action, "notes": notes,
        }.items() if v is not None}
        i = SafetyControlService().create_safety_incident(**kwargs)
        return f"Safety incident created: {i.title}"

    @strawberry.mutation
    def update_safety_incident(self, info: strawberry.types.Info, id: int,
                               title: Optional[str] = None,
                               description: Optional[str] = None,
                               severity: Optional[str] = None,
                               owner: Optional[str] = None,
                               containment_action: Optional[str] = None,
                               notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "severity": severity, "owner": owner,
            "containment_action": containment_action, "notes": notes,
        }.items() if v is not None}
        SafetyControlService().update_safety_incident(id, **kwargs)
        return "Safety incident updated"

    @strawberry.mutation
    def contain_safety_incident(self, info: strawberry.types.Info, id: int) -> str:
        SafetyControlService().contain_safety_incident(id)
        return "Safety incident contained"

    @strawberry.mutation
    def review_safety_incident(self, info: strawberry.types.Info, id: int) -> str:
        SafetyControlService().review_safety_incident(id)
        return "Safety incident moved to UNDER_REVIEW"

    @strawberry.mutation
    def close_safety_incident(self, info: strawberry.types.Info, id: int) -> str:
        SafetyControlService().close_safety_incident(id)
        return "Safety incident closed"

    @strawberry.mutation
    def cancel_safety_incident(self, info: strawberry.types.Info, id: int) -> str:
        SafetyControlService().cancel_safety_incident(id)
        return "Safety incident cancelled"

    # ── Material Checks ──
    @strawberry.mutation
    def create_material_check(self, info: strawberry.types.Info, title: str,
                              check_type: str, target_type: str,
                              target_id: Optional[int] = None,
                              checked_by: str = "",
                              check_date: Optional[str] = None,
                              notes: str = "") -> str:
        kwargs = {"title": title, "check_type": check_type,
                  "target_type": target_type, "target_id": target_id,
                  "checked_by": checked_by, "notes": notes}
        if check_date:
            from datetime import datetime
            kwargs["check_date"] = datetime.strptime(check_date, "%Y-%m-%d").date()
        c = MaterialControlService().create_material_check(**kwargs)
        return f"Material check created: {c.title}"

    @strawberry.mutation
    def update_material_check(self, info: strawberry.types.Info, id: int,
                              title: Optional[str] = None,
                              checked_by: Optional[str] = None,
                              notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "checked_by": checked_by, "notes": notes,
        }.items() if v is not None}
        MaterialControlService().update_material_check(id, **kwargs)
        return "Material check updated"

    @strawberry.mutation
    def add_material_checklist_item(self, info: strawberry.types.Info,
                                    check_id: int, question: str) -> str:
        MaterialControlService().add_checklist_item(check_id, question=question)
        return "Checklist item added"

    @strawberry.mutation
    def update_material_checklist_item(self, info: strawberry.types.Info,
                                       id: int, result: str = "",
                                       comment: str = "") -> str:
        MaterialControlService().update_checklist_item(
            id, result=result or None, comment=comment or None,
        )
        return "Checklist item updated"

    @strawberry.mutation
    def complete_material_check(self, info: strawberry.types.Info, id: int) -> str:
        MaterialControlService().complete_material_check(id)
        return "Material check completed"

    # ── Material Issues ──
    @strawberry.mutation
    def create_material_issue(self, info: strawberry.types.Info, title: str,
                              issue_type: str, target_type: str,
                              target_id: Optional[int] = None,
                              description: str = "",
                              quantity: Optional[float] = None,
                              uom: str = "",
                              severity: str = "MEDIUM",
                              reported_by: str = "",
                              owner: str = "",
                              notes: str = "") -> str:
        kwargs = {k: v for k, v in {
            "title": title, "issue_type": issue_type,
            "target_type": target_type, "target_id": target_id,
            "description": description, "quantity": quantity,
            "uom": uom, "severity": severity,
            "reported_by": reported_by, "owner": owner, "notes": notes,
        }.items() if v is not None}
        m = MaterialControlService().create_material_issue(**kwargs)
        return f"Material issue created: {m.title}"

    @strawberry.mutation
    def update_material_issue(self, info: strawberry.types.Info, id: int,
                              title: Optional[str] = None,
                              description: Optional[str] = None,
                              severity: Optional[str] = None,
                              owner: Optional[str] = None,
                              notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "description": description,
            "severity": severity, "owner": owner, "notes": notes,
        }.items() if v is not None}
        MaterialControlService().update_material_issue(id, **kwargs)
        return "Material issue updated"

    @strawberry.mutation
    def contain_material_issue(self, info: strawberry.types.Info, id: int) -> str:
        MaterialControlService().contain_material_issue(id)
        return "Material issue contained"

    @strawberry.mutation
    def resolve_material_issue(self, info: strawberry.types.Info, id: int) -> str:
        MaterialControlService().resolve_material_issue(id)
        return "Material issue resolved"

    @strawberry.mutation
    def close_material_issue(self, info: strawberry.types.Info, id: int) -> str:
        MaterialControlService().close_material_issue(id)
        return "Material issue closed"

    @strawberry.mutation
    def cancel_material_issue(self, info: strawberry.types.Info, id: int) -> str:
        MaterialControlService().cancel_material_issue(id)
        return "Material issue cancelled"

    # ── Safety Injury Claims ──
    @strawberry.mutation(name="createSafetyInjuryClaim")
    def create_safety_injury_claim(self, info: strawberry.types.Info, claimant_name: str,
                                   claim_type: str, safety_event_id: Optional[int] = None,
                                   claim_number: str = "",
                                   claimant_employee_id: str = "",
                                   injury_summary: str = "",
                                   body_area: str = "",
                                   lost_time: bool = False,
                                   restricted_work: bool = False,
                                   reported_to_insurer: bool = False,
                                   insurer_reference: str = "",
                                   owner: str = "",
                                   notes: str = "",
                                   override_reason: str = "") -> int:
        kwargs = {k: v for k, v in {
            "safety_event": safety_event_id,
            "claim_number": claim_number, "claimant_name": claimant_name,
            "claimant_employee_id": claimant_employee_id, "claim_type": claim_type,
            "injury_summary": injury_summary, "body_area": body_area,
            "lost_time": lost_time, "restricted_work": restricted_work,
            "reported_to_insurer": reported_to_insurer,
            "insurer_reference": insurer_reference,
            "owner": owner, "notes": notes,
            "override_reason": override_reason,
        }.items() if v is not None}
        c = SafetyInjuryClaimService().create(**kwargs)
        return c.id

    @strawberry.mutation(name="updateSafetyInjuryClaim")
    def update_safety_injury_claim(self, info: strawberry.types.Info, id: int,
                                   claimant_name: Optional[str] = None,
                                   claim_type: Optional[str] = None,
                                   safety_event_id: Optional[int] = None,
                                   claim_number: Optional[str] = None,
                                   claimant_employee_id: Optional[str] = None,
                                   injury_summary: Optional[str] = None,
                                   body_area: Optional[str] = None,
                                   lost_time: Optional[bool] = None,
                                   restricted_work: Optional[bool] = None,
                                   reported_to_insurer: Optional[bool] = None,
                                   insurer_reference: Optional[str] = None,
                                   owner: Optional[str] = None,
                                   notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "claimant_name": claimant_name, "claim_type": claim_type,
            "safety_event": safety_event_id,
            "claim_number": claim_number,
            "claimant_employee_id": claimant_employee_id,
            "injury_summary": injury_summary, "body_area": body_area,
            "lost_time": lost_time, "restricted_work": restricted_work,
            "reported_to_insurer": reported_to_insurer,
            "insurer_reference": insurer_reference,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        SafetyInjuryClaimService().update(id, **kwargs)
        return "Safety injury claim updated"

    @strawberry.mutation(name="openSafetyInjuryClaim")
    def open_safety_injury_claim(self, info: strawberry.types.Info, id: int) -> str:
        SafetyInjuryClaimService().open_claim(id)
        return "Safety injury claim opened"

    @strawberry.mutation(name="reviewSafetyInjuryClaim")
    def review_safety_injury_claim(self, info: strawberry.types.Info, id: int) -> str:
        SafetyInjuryClaimService().review_claim(id)
        return "Safety injury claim moved to UNDER_REVIEW"

    @strawberry.mutation(name="waitInfoSafetyInjuryClaim")
    def wait_info_safety_injury_claim(self, info: strawberry.types.Info, id: int) -> str:
        SafetyInjuryClaimService().wait_info_claim(id)
        return "Safety injury claim set to WAITING_INFO"

    @strawberry.mutation(name="closeSafetyInjuryClaim")
    def close_safety_injury_claim(self, info: strawberry.types.Info, id: int) -> str:
        SafetyInjuryClaimService().close_claim(id)
        return "Safety injury claim closed"

    @strawberry.mutation(name="cancelSafetyInjuryClaim")
    def cancel_safety_injury_claim(self, info: strawberry.types.Info, id: int) -> str:
        SafetyInjuryClaimService().cancel_claim(id)
        return "Safety injury claim cancelled"

    # ── Safety Medical Cases ──
    @strawberry.mutation(name="createSafetyMedicalCase")
    def create_safety_medical_case(self, info: strawberry.types.Info, care_type: str,
                                   safety_event_id: Optional[int] = None,
                                   injury_claim_id: Optional[int] = None,
                                   affected_person_id: Optional[int] = None,
                                   case_number: str = "",
                                   visit_required: bool = False,
                                   visit_date: Optional[str] = None,
                                   work_restriction: bool = False,
                                   restriction_summary: str = "",
                                   return_to_work_date: Optional[str] = None,
                                   confidential_notes: str = "",
                                   owner: str = "",
                                   notes: str = "") -> int:
        from datetime import datetime
        kwargs = {k: v for k, v in {
            "safety_event": safety_event_id,
            "injury_claim": injury_claim_id,
            "affected_person_id": affected_person_id,
            "case_number": case_number, "care_type": care_type,
            "visit_required": visit_required, "work_restriction": work_restriction,
            "restriction_summary": restriction_summary,
            "confidential_notes": confidential_notes,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if visit_date:
            kwargs["visit_date"] = datetime.fromisoformat(visit_date)
        if return_to_work_date:
            kwargs["return_to_work_date"] = datetime.fromisoformat(return_to_work_date)
        m = SafetyMedicalCaseService().create(**kwargs)
        return m.id

    @strawberry.mutation(name="updateSafetyMedicalCase")
    def update_safety_medical_case(self, info: strawberry.types.Info, id: int,
                                   care_type: Optional[str] = None,
                                   case_number: Optional[str] = None,
                                   affected_person_id: Optional[int] = None,
                                   visit_required: Optional[bool] = None,
                                   visit_date: Optional[str] = None,
                                   work_restriction: Optional[bool] = None,
                                   restriction_summary: Optional[str] = None,
                                   return_to_work_date: Optional[str] = None,
                                   confidential_notes: Optional[str] = None,
                                   owner: Optional[str] = None,
                                   notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "care_type": care_type, "case_number": case_number,
            "affected_person_id": affected_person_id,
            "visit_required": visit_required,
            "work_restriction": work_restriction,
            "restriction_summary": restriction_summary,
            "confidential_notes": confidential_notes,
            "owner": owner, "notes": notes,
        }.items() if v is not None}
        if visit_date is not None:
            from datetime import datetime
            kwargs["visit_date"] = datetime.fromisoformat(visit_date) if visit_date else None
        if return_to_work_date is not None:
            from datetime import datetime
            kwargs["return_to_work_date"] = datetime.fromisoformat(return_to_work_date) if return_to_work_date else None
        SafetyMedicalCaseService().update(id, **kwargs)
        return "Safety medical case updated"

    @strawberry.mutation(name="openSafetyMedicalCase")
    def open_safety_medical_case(self, info: strawberry.types.Info, id: int) -> str:
        SafetyMedicalCaseService().open_case(id)
        return "Safety medical case opened"

    @strawberry.mutation(name="monitorSafetyMedicalCase")
    def monitor_safety_medical_case(self, info: strawberry.types.Info, id: int) -> str:
        SafetyMedicalCaseService().monitor_case(id)
        return "Safety medical case moved to MONITORING"

    @strawberry.mutation(name="returnToWorkSafetyMedicalCase")
    def return_to_work_safety_medical_case(self, info: strawberry.types.Info, id: int) -> str:
        SafetyMedicalCaseService().return_to_work(id)
        return "Safety medical case marked RETURNED_TO_WORK"

    @strawberry.mutation(name="closeSafetyMedicalCase")
    def close_safety_medical_case(self, info: strawberry.types.Info, id: int) -> str:
        SafetyMedicalCaseService().close_case(id)
        return "Safety medical case closed"

    @strawberry.mutation(name="cancelSafetyMedicalCase")
    def cancel_safety_medical_case(self, info: strawberry.types.Info, id: int) -> str:
        SafetyMedicalCaseService().cancel_case(id)
        return "Safety medical case cancelled"

    # ── Safety Environmental Reports ──
    @strawberry.mutation(name="createSafetyEnvironmentalReport")
    def create_safety_environmental_report(self, info: strawberry.types.Info, title: str,
                                           report_type: str, safety_event_id: Optional[int] = None,
                                           description: str = "",
                                           material_involved: str = "",
                                           estimated_quantity: Optional[float] = None,
                                           unit: str = "",
                                           containment_action: str = "",
                                           cleanup_required: bool = False,
                                           reported_externally: bool = False,
                                           external_reference: str = "",
                                           occurred_at: Optional[str] = None,
                                           owner: str = "",
                                           notes: str = "",
                                           override_reason: str = "") -> int:
        kwargs = {k: v for k, v in {
            "safety_event": safety_event_id,
            "title": title, "report_type": report_type,
            "description": description,
            "material_involved": material_involved,
            "estimated_quantity": estimated_quantity,
            "unit": unit, "containment_action": containment_action,
            "cleanup_required": cleanup_required,
            "reported_externally": reported_externally,
            "external_reference": external_reference,
            "owner": owner, "notes": notes,
            "override_reason": override_reason,
        }.items() if v is not None}
        if occurred_at:
            from datetime import datetime
            kwargs["occurred_at"] = datetime.fromisoformat(occurred_at)
        r = SafetyEnvironmentalReportService().create(**kwargs)
        return r.id

    @strawberry.mutation(name="updateSafetyEnvironmentalReport")
    def update_safety_environmental_report(self, info: strawberry.types.Info, id: int,
                                           title: Optional[str] = None,
                                           report_type: Optional[str] = None,
                                           description: Optional[str] = None,
                                           material_involved: Optional[str] = None,
                                           estimated_quantity: Optional[float] = None,
                                           unit: Optional[str] = None,
                                           containment_action: Optional[str] = None,
                                           cleanup_required: Optional[bool] = None,
                                           reported_externally: Optional[bool] = None,
                                           external_reference: Optional[str] = None,
                                           safety_event_id: Optional[int] = None,
                                           occurred_at: Optional[str] = None,
                                           owner: Optional[str] = None,
                                           notes: Optional[str] = None,
                                           target_type: Optional[str] = None,
                                           target_id: Optional[int] = None,
                                           location_text: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "report_type": report_type,
            "description": description,
            "material_involved": material_involved,
            "estimated_quantity": estimated_quantity,
            "unit": unit, "containment_action": containment_action,
            "cleanup_required": cleanup_required,
            "reported_externally": reported_externally,
            "external_reference": external_reference,
            "safety_event": safety_event_id,
            "owner": owner, "notes": notes,
            "target_type": target_type,
            "target_id": target_id,
            "location_text": location_text,
        }.items() if v is not None}
        if occurred_at is not None:
            from datetime import datetime
            kwargs["occurred_at"] = datetime.fromisoformat(occurred_at) if occurred_at else None
        SafetyEnvironmentalReportService().update(id, **kwargs)
        return "Safety environmental report updated"

    @strawberry.mutation(name="reportSafetyEnvironmentalReport")
    def report_safety_environmental_report(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEnvironmentalReportService().report(id)
        return "Safety environmental report reported"

    @strawberry.mutation(name="reviewSafetyEnvironmentalReport")
    def review_safety_environmental_report(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEnvironmentalReportService().review(id)
        return "Safety environmental report moved to UNDER_REVIEW"

    @strawberry.mutation(name="requireActionSafetyEnvironmentalReport")
    def require_action_safety_environmental_report(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEnvironmentalReportService().require_action(id)
        return "Safety environmental report set to ACTION_REQUIRED"

    @strawberry.mutation(name="closeSafetyEnvironmentalReport")
    def close_safety_environmental_report(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEnvironmentalReportService().close(id)
        return "Safety environmental report closed"

    @strawberry.mutation(name="cancelSafetyEnvironmentalReport")
    def cancel_safety_environmental_report(self, info: strawberry.types.Info, id: int) -> str:
        SafetyEnvironmentalReportService().cancel(id)
        return "Safety environmental report cancelled"

    # ── Safety CAPAs ──
    @strawberry.mutation(name="createSafetyCAPA")
    def create_safety_capa(self, info: strawberry.types.Info, title: str,
                           source_type: str = "", source_id: Optional[int] = None,
                           problem_statement: str = "",
                           root_cause: str = "",
                           containment_action: str = "",
                           corrective_action: str = "",
                           preventive_action: str = "",
                           owner: str = "",
                           due_date: Optional[str] = None,
                           effectiveness_check_required: bool = False,
                           notes: str = "") -> int:
        kwargs = {k: v for k, v in {
            "title": title, "source_type": source_type,
            "source_id": source_id,
            "problem_statement": problem_statement,
            "root_cause": root_cause,
            "containment_action": containment_action,
            "corrective_action": corrective_action,
            "preventive_action": preventive_action,
            "owner": owner,
            "effectiveness_check_required": effectiveness_check_required,
            "notes": notes,
        }.items() if v is not None}
        if due_date:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date()
        c = SafetyCAPAService().create(**kwargs)
        return c.id

    @strawberry.mutation(name="updateSafetyCAPA")
    def update_safety_capa(self, info: strawberry.types.Info, id: int,
                           title: Optional[str] = None,
                           source_type: Optional[str] = None,
                           source_id: Optional[int] = None,
                           problem_statement: Optional[str] = None,
                           root_cause: Optional[str] = None,
                           containment_action: Optional[str] = None,
                           corrective_action: Optional[str] = None,
                           preventive_action: Optional[str] = None,
                           owner: Optional[str] = None,
                           due_date: Optional[str] = None,
                           effectiveness_check_required: Optional[bool] = None,
                           notes: Optional[str] = None) -> str:
        kwargs = {k: v for k, v in {
            "title": title, "source_type": source_type,
            "source_id": source_id,
            "problem_statement": problem_statement,
            "root_cause": root_cause,
            "containment_action": containment_action,
            "corrective_action": corrective_action,
            "preventive_action": preventive_action,
            "owner": owner,
            "effectiveness_check_required": effectiveness_check_required,
            "notes": notes,
        }.items() if v is not None}
        if due_date is not None:
            from datetime import datetime
            kwargs["due_date"] = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
        SafetyCAPAService().update(id, **kwargs)
        return "Safety CAPA updated"

    @strawberry.mutation(name="openSafetyCAPA")
    def open_safety_capa(self, info: strawberry.types.Info, id: int) -> str:
        SafetyCAPAService().open(id)
        return "Safety CAPA opened"

    @strawberry.mutation(name="startSafetyCAPA")
    def start_safety_capa(self, info: strawberry.types.Info, id: int) -> str:
        SafetyCAPAService().start(id)
        return "Safety CAPA started"

    @strawberry.mutation(name="pendingEffectivenessSafetyCAPA")
    def pending_effectiveness_safety_capa(self, info: strawberry.types.Info, id: int) -> str:
        SafetyCAPAService().pending_effectiveness(id)
        return "Safety CAPA set to PENDING_EFFECTIVENESS"

    @strawberry.mutation(name="completeEffectivenessSafetyCAPA")
    def complete_effectiveness_safety_capa(self, info: strawberry.types.Info, id: int, effective: bool) -> str:
        SafetyCAPAService().complete_effectiveness(id, effective)
        return f"Safety CAPA effectiveness {'effective' if effective else 'ineffective'}"

    @strawberry.mutation(name="closeSafetyCAPA")
    def close_safety_capa(self, info: strawberry.types.Info, id: int) -> str:
        SafetyCAPAService().close(id)
        return "Safety CAPA closed"

    @strawberry.mutation(name="cancelSafetyCAPA")
    def cancel_safety_capa(self, info: strawberry.types.Info, id: int) -> str:
        SafetyCAPAService().cancel(id)
        return "Safety CAPA cancelled"
