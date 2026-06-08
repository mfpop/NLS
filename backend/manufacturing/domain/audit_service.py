from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

from django.db import transaction, models as db_models

from manufacturing.models.audit import (
    Audit,
    AuditAnswer,
    AuditChecklistItem,
    AuditFinding,
    AuditTemplate,
    AuditTemplateCategory,
    AuditTemplateQuestion,
    AuditType,
    AuditTargetType,
    AuditStatus,
    ChecklistResult,
    Severity,
    FindingStatus,
    TemplateStatus,
    ModuleScope,
    ResponseType,
    ALLOWED_AUDIT_TARGET_TYPES,
    FORBIDDEN_TARGET_TYPES,
)
from manufacturing.models import (
    Plant,
    ProductionLine,
    Department,
    ResourceGroup,
    Resource,
)


@dataclass
class AuditServiceError(Exception):
    field: Optional[str]
    code: str
    message: str


AUDIT_TARGET_MODEL_MAP: dict[str, type[db_models.Model]] = {
    AuditTargetType.PLANT: Plant,
    AuditTargetType.PRODUCTION_LINE: ProductionLine,
    AuditTargetType.DEPARTMENT: Department,
    AuditTargetType.RESOURCE_GROUP: ResourceGroup,
    AuditTargetType.RESOURCE: Resource,
}


# ──────────────────────────────────────────────
#  DEFAULT PRODUCTION CONTROL TEMPLATES
# ──────────────────────────────────────────────

PC_TEMPLATES = [
    {
        "code": "PC_5S_AUDIT",
        "name": "5S Audit",
        "audit_type": AuditType.FIVE_S,
        "sections": [
            {
                "code": "SORT",
                "name": "Sort",
                "sequence": 1,
                "questions": [
                    {
                        "code": "SORT_Q01",
                        "question": "Are all unnecessary items removed from the work area?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                        "help_text": "Check for obsolete tools, materials, scrap, and personal items.",
                    },
                    {
                        "code": "SORT_Q02",
                        "question": "Are only required items present at the workstation?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "SORT_Q03",
                        "question": "Are aisles, exits, and emergency equipment free from obstruction?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "SORT_Q04",
                        "question": "Is excess WIP, rework, and scrap controlled and not stored in the work area?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                    {
                        "code": "SORT_Q05",
                        "question": "Are obsolete, damaged, or expired items clearly removed or controlled?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 5,
                    },
                ],
            },
            {
                "code": "SET_IN_ORDER",
                "name": "Set in Order",
                "sequence": 2,
                "questions": [
                    {
                        "code": "SET_Q01",
                        "question": "Does every tool, material, and supply have a defined, labeled location?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "SET_Q02",
                        "question": "Are locations clearly marked and easy to identify?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "SET_Q03",
                        "question": "Are frequently used items located close to point of use?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "SET_Q04",
                        "question": "Are shadow boards, floor markings, and visual controls used where needed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                    {
                        "code": "SET_Q05",
                        "question": "Can missing or misplaced items be identified quickly?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 5,
                    },
                ],
            },
            {
                "code": "SHINE",
                "name": "Shine",
                "sequence": 3,
                "questions": [
                    {
                        "code": "SHINE_Q01",
                        "question": "Are floors, work surfaces, machines, and tools clean?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "SHINE_Q02",
                        "question": "Is the area free of trash, dust, oil, leaks, and debris?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "SHINE_Q03",
                        "question": "Are cleaning tools and supplies available and stored correctly?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "SHINE_Q04",
                        "question": "Are equipment abnormalities, leaks, or damage visible and reported?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                    {
                        "code": "SHINE_Q05",
                        "question": "Are sources of dirt or contamination corrected instead of only cleaned?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 5,
                    },
                ],
            },
            {
                "code": "STANDARDIZE",
                "name": "Standardize",
                "sequence": 4,
                "questions": [
                    {
                        "code": "STD_Q01",
                        "question": "Are 5S standards and expected-condition photos available for the area?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "STD_Q02",
                        "question": "Are labels, markings, and storage methods consistent?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "STD_Q03",
                        "question": "Are cleaning and organization routines clearly defined?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "STD_Q04",
                        "question": "Are team members trained and following the same area standard?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                    {
                        "code": "STD_Q05",
                        "question": "Are changes to layout or process updated in the standard?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 5,
                    },
                ],
            },
            {
                "code": "SUSTAIN",
                "name": "Sustain",
                "sequence": 5,
                "questions": [
                    {
                        "code": "SUS_Q01",
                        "question": "Were previous 5S findings corrected on time?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "SUS_Q02",
                        "question": "Are recurring issues tracked and prevented from returning?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "SUS_Q03",
                        "question": "Does the area owner regularly review and maintain 5S condition?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "SUS_Q04",
                        "question": "Do operators follow the standard without reminders?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                    {
                        "code": "SUS_Q05",
                        "question": "Does audit history show stable or improving 5S performance?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 5,
                    },
                ],
            },
        ],
    },
    {
        "code": "PC_STANDARD_WORK_AUDIT",
        "name": "Standard Work Audit",
        "audit_type": AuditType.STANDARD_WORK_CHECK,
        "sections": [
            {
                "code": "WORK_INSTRUCTION",
                "name": "Work Instruction Availability",
                "sequence": 1,
                "questions": [
                    {
                        "code": "WI_Q01",
                        "question": "Is the work instruction posted or available at the workstation?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "WI_Q07",
                        "question": "Does the workstation layout match the standard?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "WI_Q10",
                        "question": "Are visual controls present, readable, and current?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "STANDARD_SEQUENCE",
                "name": "Standard Sequence",
                "sequence": 2,
                "questions": [
                    {
                        "code": "WI_Q02",
                        "question": "Does the operator follow the approved standard work sequence?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "WI_Q03",
                        "question": "Is the cycle time respected against standard/takt expectation?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "WI_Q08",
                        "question": "Does WIP quantity and location follow the standard?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "QUALITY_CHECKS",
                "name": "Quality Checks",
                "sequence": 3,
                "questions": [
                    {
                        "code": "WI_Q04",
                        "question": "Are quality checkpoints being followed as specified?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "WI_Q06",
                        "question": "Are required tools, fixtures, and materials available and correctly positioned?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                ],
            },
            {
                "code": "SAFETY",
                "name": "Safety",
                "sequence": 4,
                "questions": [
                    {
                        "code": "WI_Q09",
                        "question": "Are safety and PPE requirements being followed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "WI_Q11",
                        "question": "Is the operator trained and certified for the standard work?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                ],
            },
            {
                "code": "ABNORMALITY_RESPONSE",
                "name": "Abnormality Response",
                "sequence": 5,
                "questions": [
                    {
                        "code": "WI_Q05",
                        "question": "Is the abnormality reaction procedure clearly defined and known?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "WI_Q12",
                        "question": "Are deviations recorded and escalated?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                ],
            },
        ],
    },
    {
        "code": "PC_PROCESS_COMPLIANCE_CHECK",
        "name": "Process Compliance Check",
        "audit_type": AuditType.PROCESS_CHECK,
        "sections": [
            {
                "code": "PROCESS_PARAMETERS",
                "name": "Process Parameters",
                "sequence": 1,
                "questions": [
                    {
                        "code": "PC_Q01",
                        "question": "Are process parameters being followed as specified?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "PC_Q06",
                        "question": "Does the operator follow the approved process sequence?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "PC_Q07",
                        "question": "Are required tools, fixtures, and materials available and correct?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "QUALITY_CHECKS",
                "name": "Quality Checks",
                "sequence": 2,
                "questions": [
                    {
                        "code": "PC_Q02",
                        "question": "Are required checks completed and recorded?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "PC_Q03",
                        "question": "Is traceability properly recorded?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "PC_Q08",
                        "question": "Are quality checkpoints and gates being followed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "PC_Q12",
                        "question": "Is the latest approved work instruction or standard available?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                ],
            },
            {
                "code": "DEFECTS_ABNORMALITIES",
                "name": "Defects / Abnormality Response",
                "sequence": 3,
                "questions": [
                    {
                        "code": "PC_Q04",
                        "question": "Are defects and rework documented?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "PC_Q09",
                        "question": "Are process deviations recorded and escalated?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "PC_Q10",
                        "question": "Do abnormal conditions have a reaction plan that is followed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "SAFETY_SUPERVISION",
                "name": "Safety / Supervisor",
                "sequence": 4,
                "questions": [
                    {
                        "code": "PC_Q05",
                        "question": "Has supervisor verification been completed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "PC_Q11",
                        "question": "Are safety, PPE, and process safeguards being followed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                ],
            },
        ],
    },
    {
        "code": "PC_TPM_EQUIPMENT_CHECK",
        "name": "TPM / Equipment Check",
        "audit_type": AuditType.TPM_EQUIPMENT_CHECK,
        "sections": [
            {
                "code": "EQUIPMENT_CONDITION",
                "name": "Equipment Condition",
                "sequence": 1,
                "questions": [
                    {
                        "code": "TPM_Q01",
                        "question": "Is the equipment condition OK for operation?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "TPM_Q04",
                        "question": "Are there any abnormal noises, vibration, leaks, heat, or smell?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "TPM_Q07",
                        "question": "Do critical settings and parameters match the standard?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "CLEANING_LUBRICATION",
                "name": "Cleaning / Lubrication",
                "sequence": 2,
                "questions": [
                    {
                        "code": "TPM_Q02",
                        "question": "Has basic cleaning been completed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "TPM_Q03",
                        "question": "Have lubrication and inspection points been checked?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "TPM_Q09",
                        "question": "Are tools, fixtures, and changeover items stored correctly?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "SAFETY",
                "name": "Safety",
                "sequence": 3,
                "questions": [
                    {
                        "code": "TPM_Q06",
                        "question": "Are guards, covers, sensors, and safety devices present and functional?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "TPM_Q08",
                        "question": "Are visual controls, labels, and inspection points clear?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                ],
            },
            {
                "code": "ABNORMALITIES_FOLLOWUP",
                "name": "Abnormalities / Follow-up",
                "sequence": 4,
                "questions": [
                    {
                        "code": "TPM_Q05",
                        "question": "Is the operator maintenance record completed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "TPM_Q10",
                        "question": "Are defects, abnormalities, or downtime issues recorded and escalated?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "TPM_Q11",
                        "question": "Are required spare parts and consumables available?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                    {
                        "code": "TPM_Q12",
                        "question": "Are previous findings and actions closed or still tracked?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 4,
                    },
                ],
            },
        ],
    },
    {
        "code": "PC_KANBAN_PULL_SYSTEM_CHECK",
        "name": "Kanban / Pull System Check",
        "audit_type": AuditType.KANBAN_PULL_CHECK,
        "sections": [
            {
                "code": "KANBAN_SIGNAL",
                "name": "Kanban Signal",
                "sequence": 1,
                "questions": [
                    {
                        "code": "KBN_Q01",
                        "question": "Are kanban cards and bins available and in use?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "KBN_Q06",
                        "question": "Are kanban quantities matching the approved standard?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "KBN_Q07",
                        "question": "Are empty/full signals visible and understood?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "WIP_CONTROL",
                "name": "WIP Control",
                "sequence": 2,
                "questions": [
                    {
                        "code": "KBN_Q02",
                        "question": "Is the WIP limit being respected?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "KBN_Q08",
                        "question": "Is there any unauthorized extra stock present?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "KBN_Q04",
                        "question": "Is FIFO being respected?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "REPLENISHMENT",
                "name": "Replenishment / Material",
                "sequence": 3,
                "questions": [
                    {
                        "code": "KBN_Q03",
                        "question": "Is the replenishment trigger clearly defined and followed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "KBN_Q09",
                        "question": "Is material stored in the correct location or bin?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "KBN_Q10",
                        "question": "Is the replenishment cycle time being followed?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
            {
                "code": "ESCALATION_VISUAL",
                "name": "Shortage / Visual Controls",
                "sequence": 4,
                "questions": [
                    {
                        "code": "KBN_Q05",
                        "question": "Are shortages and escalations recorded?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 1,
                    },
                    {
                        "code": "KBN_Q11",
                        "question": "Are abnormal conditions escalated using the defined process?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 2,
                    },
                    {
                        "code": "KBN_Q12",
                        "question": "Are visual controls current, readable, and accurate?",
                        "response_type": ResponseType.PASS_FAIL_NA,
                        "sequence": 3,
                    },
                ],
            },
        ],
    },
]


QC_TEMPLATES = [
    {
        "code": "QC_PRODUCT_CHECK",
        "name": "Product Quality Check",
        "audit_type": AuditType.QC_PRODUCT_CHECK,
        "sections": [
            {
                "code": "PRODUCT_SPEC",
                "name": "Product Specification",
                "sequence": 1,
                "questions": [
                    {"code": "PCK_Q01", "question": "Does the product match the approved specification or drawing?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 1},
                    {"code": "PCK_Q02", "question": "Are critical dimensions within tolerance?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 2},
                    {"code": "PCK_Q03", "question": "Are visual defects absent?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 3},
                    {"code": "PCK_Q04", "question": "Are required labels and markings correct and readable?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 4},
                    {"code": "PCK_Q05", "question": "Are materials and components correct for the product?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 5},
                    {"code": "PCK_Q06", "question": "Are assembly, fit, and function requirements met?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 6},
                    {"code": "PCK_Q07", "question": "Are packaging requirements followed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 7},
                    {"code": "PCK_Q08", "question": "Are inspection records completed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 8},
                    {"code": "PCK_Q09", "question": "Are nonconforming parts segregated?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 9},
                    {"code": "PCK_Q10", "question": "Are defects and escalations recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 10},
                ],
            },
        ],
    },
    {
        "code": "QC_PROCESS_AUDIT",
        "name": "Process Quality Audit",
        "audit_type": AuditType.QC_PROCESS_AUDIT,
        "sections": [
            {
                "code": "PROCESS_COMPLIANCE",
                "name": "Process Compliance",
                "sequence": 1,
                "questions": [
                    {"code": "PQA_Q01", "question": "Is the approved process being followed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 1},
                    {"code": "PQA_Q02", "question": "Are process parameters within required limits?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 2},
                    {"code": "PQA_Q03", "question": "Are quality checkpoints completed at the required steps?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 3},
                    {"code": "PQA_Q04", "question": "Are operators using the correct tools, fixtures, and gauges?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 4},
                    {"code": "PQA_Q05", "question": "Are work instructions and standards available and current?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 5},
                    {"code": "PQA_Q06", "question": "Are defects and rework recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 6},
                    {"code": "PQA_Q07", "question": "Is traceability maintained through the process?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 7},
                    {"code": "PQA_Q08", "question": "Are abnormal conditions escalated?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 8},
                    {"code": "PQA_Q09", "question": "Are control plan requirements followed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 9},
                    {"code": "PQA_Q10", "question": "Are corrective actions from previous findings closed or tracked?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 10},
                ],
            },
        ],
    },
    {
        "code": "QC_FIRST_PIECE",
        "name": "First Piece Check",
        "audit_type": AuditType.QC_FIRST_PIECE,
        "sections": [
            {
                "code": "FIRST_PIECE",
                "name": "First Piece",
                "sequence": 1,
                "questions": [
                    {"code": "FPC_Q01", "question": "Is the first piece produced from the correct setup?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 1},
                    {"code": "FPC_Q02", "question": "Does the first piece match the approved drawing or specification?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 2},
                    {"code": "FPC_Q03", "question": "Are critical dimensions verified?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 3},
                    {"code": "FPC_Q04", "question": "Are required materials and components correct?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 4},
                    {"code": "FPC_Q05", "question": "Are machine and process settings recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 5},
                    {"code": "FPC_Q06", "question": "Are tools, fixtures, and gauges verified before production release?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 6},
                    {"code": "FPC_Q07", "question": "Are visual and functional checks passed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 7},
                    {"code": "FPC_Q08", "question": "Is first piece approval documented?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 8},
                    {"code": "FPC_Q09", "question": "Is production held until approval is completed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 9},
                    {"code": "FPC_Q10", "question": "Are issues and failures recorded and escalated?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 10},
                ],
            },
        ],
    },
    {
        "code": "QC_FINAL_INSPECTION",
        "name": "Final Inspection Audit",
        "audit_type": AuditType.QC_FINAL_INSPECTION,
        "sections": [
            {
                "code": "FINAL_INSPECTION",
                "name": "Final Inspection",
                "sequence": 1,
                "questions": [
                    {"code": "FIA_Q01", "question": "Does the finished product meet all final quality requirements?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 1},
                    {"code": "FIA_Q02", "question": "Are all required dimensions and features verified?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 2},
                    {"code": "FIA_Q03", "question": "Are visual defects absent?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 3},
                    {"code": "FIA_Q04", "question": "Are functional requirements verified?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 4},
                    {"code": "FIA_Q05", "question": "Are labels, serial numbers, and markings correct?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 5},
                    {"code": "FIA_Q06", "question": "Is packaging complete and correct?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 6},
                    {"code": "FIA_Q07", "question": "Are required documents and records attached or completed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 7},
                    {"code": "FIA_Q08", "question": "Are nonconforming units blocked from shipment?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 8},
                    {"code": "FIA_Q09", "question": "Are final inspection results recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 9},
                    {"code": "FIA_Q10", "question": "Are defects and corrective actions linked when required?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 10},
                ],
            },
        ],
    },
    {
        "code": "QC_DMR_REVIEW",
        "name": "DMR Review Check",
        "audit_type": AuditType.QC_DMR_REVIEW,
        "sections": [
            {
                "code": "DMR_REVIEW",
                "name": "DMR Review",
                "sequence": 1,
                "questions": [
                    {"code": "DMR_Q01", "question": "Is the defective material clearly identified?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 1},
                    {"code": "DMR_Q02", "question": "Is the defect description complete?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 2},
                    {"code": "DMR_Q03", "question": "Is the affected quantity recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 3},
                    {"code": "DMR_Q04", "question": "Is the material properly segregated and quarantined?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 4},
                    {"code": "DMR_Q05", "question": "Is the source, process, or location identified?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 5},
                    {"code": "DMR_Q06", "question": "Is disposition selected and approved?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 6},
                    {"code": "DMR_Q07", "question": "Are rework, scrap, or return decisions documented?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 7},
                    {"code": "DMR_Q08", "question": "Are containment actions recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 8},
                    {"code": "DMR_Q09", "question": "Are linked issues and actions created when required?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 9},
                    {"code": "DMR_Q10", "question": "Is the DMR closed only after disposition completion?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 10},
                ],
            },
        ],
    },
    {
        "code": "QC_RMA_REVIEW",
        "name": "RMA Review Check",
        "audit_type": AuditType.QC_RMA_REVIEW,
        "sections": [
            {
                "code": "RMA_REVIEW",
                "name": "RMA Review",
                "sequence": 1,
                "questions": [
                    {"code": "RMA_Q01", "question": "Is the customer return clearly identified?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 1},
                    {"code": "RMA_Q02", "question": "Is the return reason documented?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 2},
                    {"code": "RMA_Q03", "question": "Is the returned product matched to order, serial, or lot data?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 3},
                    {"code": "RMA_Q04", "question": "Is receiving inspection completed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 4},
                    {"code": "RMA_Q05", "question": "Is the defect or failure confirmed?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 5},
                    {"code": "RMA_Q06", "question": "Is the root cause or suspected cause recorded?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 6},
                    {"code": "RMA_Q07", "question": "Is disposition documented?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 7},
                    {"code": "RMA_Q08", "question": "Is customer response or status updated?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 8},
                    {"code": "RMA_Q09", "question": "Are linked issues and actions created when required?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 9},
                    {"code": "RMA_Q10", "question": "Is the RMA closed only after all required steps are complete?", "response_type": ResponseType.PASS_FAIL_NA, "sequence": 10},
                ],
            },
        ],
    },
]


# ──────────────────────────────────────────────
# ──────────────────────────────────────────────
# ──────────────────────────────────────────────
# ──────────────────────────────────────────────
#  DEFAULT SAFETY CONTROL TEMPLATES (8 audits)
# ──────────────────────────────────────────────

SAFETY_TEMPLATES = [
    {
        "code": "SF_GENERAL_SAFETY",
        "name": "Safety Audit",
        "audit_type": AuditType.SAFETY,
        "sections": [
            {
                "code": "WORK_AREA",
                "name": "Work Area Conditions",
                "sequence": 1,
                "questions": [
                    {"code": "GEN_Q01", "question": "Are walkways, aisles, and exits clear of obstructions?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "GEN_Q02", "question": "Is the floor surface clean and free of trip, slip, and spill hazards?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "GEN_Q03", "question": "Is adequate lighting provided in all work areas and stairwells?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "GEN_Q04", "question": "Are ventilation and air quality adequate for the tasks performed?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "GEN_Q05", "question": "Are noise levels within safe limits or hearing protection provided?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "GEN_Q06", "question": "Are warning signs and safety placards posted and legible?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                    {"code": "GEN_Q07", "question": "Are electrical panels, junction boxes, and cords in good condition?", "response_type": "PASS_FAIL_NA", "sequence": 7},
                ],
            },
            {
                "code": "WORKER_BEHAVIOR",
                "name": "Worker Safety Practices",
                "sequence": 2,
                "questions": [
                    {"code": "GEN_Q08", "question": "Are workers following safe work practices and procedures?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "GEN_Q09", "question": "Are workers using required PPE correctly and consistently?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "GEN_Q10", "question": "Are work permits (hot work, confined space) used when required?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "GEN_Q11", "question": "Are operators trained and certified for their assigned tasks?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "GEN_Q12", "question": "Are emergency stop buttons and safety devices accessible and unobstructed?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "GEN_Q13", "question": "Are hazardous materials properly labeled, stored, and handled?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "DOCUMENTATION",
                "name": "Safety Documentation",
                "sequence": 3,
                "questions": [
                    {"code": "GEN_Q14", "question": "Are safety data sheets (SDS) available for all chemicals?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "GEN_Q15", "question": "Are area risk assessments and job safety analyses documented?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "GEN_Q16", "question": "Are safety inspection records and corrective actions current?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "GEN_Q17", "question": "Are near-miss and incident reports filed and reviewed?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
        ],
    },
    {
        "code": "SF_PPE_CHECK",
        "name": "PPE Check",
        "audit_type": AuditType.SAFETY,
        "sections": [
            {
                "code": "PPE_AVAILABILITY",
                "name": "PPE Availability & Posting",
                "sequence": 1,
                "questions": [
                    {"code": "PPE_Q01", "question": "Are area-specific PPE requirements clearly posted at all entrances?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "PPE_Q02", "question": "Is required PPE available in appropriate sizes for all workers?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "PPE_Q03", "question": "Are PPE vending/dispensing stations stocked and functional?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "PPE_Q04", "question": "Is a PPE matrix or chart posted showing what is required per area?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
            {
                "code": "PPE_COMPLIANCE",
                "name": "PPE Compliance by Category",
                "sequence": 2,
                "questions": [
                    {"code": "PPE_Q05", "question": "Are hard hats worn in all designated hard-hat areas?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "PPE_Q06", "question": "Are safety glasses or face shields worn wherever eye/face hazards exist?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "PPE_Q07", "question": "Are hearing protection devices worn in all high-noise areas?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "PPE_Q08", "question": "Are safety-toe shoes worn in areas with drop, crush, or puncture risk?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "PPE_Q09", "question": "Are gloves appropriate for the task (cut-resistant, chemical, thermal)?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "PPE_Q10", "question": "Are respirators and face masks used where airborne hazards exist?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                    {"code": "PPE_Q11", "question": "Are high-visibility vests worn in areas with moving vehicles/equipment?", "response_type": "PASS_FAIL_NA", "sequence": 7},
                    {"code": "PPE_Q12", "question": "Are protective aprons, sleeves, or suits used for chemical or hot-work tasks?", "response_type": "PASS_FAIL_NA", "sequence": 8},
                ],
            },
            {
                "code": "PPE_CONDITION",
                "name": "PPE Condition & Storage",
                "sequence": 3,
                "questions": [
                    {"code": "PPE_Q13", "question": "Is all PPE in good condition without cracks, tears, or visible damage?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "PPE_Q14", "question": "Is PPE stored correctly in clean, dry areas when not in use?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "PPE_Q15", "question": "Are disposable PPE items replaced before expiration or after single use?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "PPE_Q16", "question": "Are inspection and replacement dates tracked for reusable PPE (harnesses, respirators)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
        ],
    },
    {
        "code": "SF_UNSAFE_CONDITION",
        "name": "Unsafe Condition Check",
        "audit_type": AuditType.SAFETY,
        "sections": [
            {
                "code": "PHYSICAL_HAZARDS",
                "name": "Physical Hazards",
                "sequence": 1,
                "questions": [
                    {"code": "UNC_Q01", "question": "Are there any unguarded openings, pits, or floor holes?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "UNC_Q02", "question": "Are there exposed electrical wires, frayed cords, or overloaded outlets?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "UNC_Q03", "question": "Are there tripping hazards such as loose cables, hoses, or uneven flooring?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "UNC_Q04", "question": "Are there spills, leaks, or slippery surfaces that have not been addressed?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "UNC_Q05", "question": "Are storage racks, shelving, and pallets stable and not overloaded?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "UNC_Q06", "question": "Are overhead hazards (cranes, hoists, suspended loads) properly secured?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "EXPOSURE_HAZARDS",
                "name": "Exposure & Environmental Hazards",
                "sequence": 2,
                "questions": [
                    {"code": "UNC_Q07", "question": "Are chemical containers properly sealed, labeled, and stored in approved cabinets?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "UNC_Q08", "question": "Are flammable materials stored away from ignition sources?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "UNC_Q09", "question": "Are compressed gas cylinders secured upright and capped when not in use?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "UNC_Q10", "question": "Are there visible dust, fume, vapor, or mist accumulations indicating inadequate ventilation?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "UNC_Q11", "question": "Are extreme temperature surfaces (hot pipes, cold lines) insulated or guarded?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "BLOCKED_EXITS",
                "name": "Blocked Exits & Access",
                "sequence": 3,
                "questions": [
                    {"code": "UNC_Q12", "question": "Are all emergency exits clearly marked, lit, and unobstructed?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "UNC_Q13", "question": "Are fire extinguishers, hoses, and suppression systems accessible?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "UNC_Q14", "question": "Are emergency eyewash stations and safety showers unobstructed and reachable?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "UNC_Q15", "question": "Are electrical panels and shut-off valves accessible (36-inch clearance)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "UNC_Q16", "question": "Are first aid kits and AEDs accessible and fully stocked?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "SF_NEAR_MISS",
        "name": "Near Miss Review",
        "audit_type": AuditType.SAFETY,
        "sections": [
            {
                "code": "NEAR_MISS_REPORTING",
                "name": "Reporting & Documentation",
                "sequence": 1,
                "questions": [
                    {"code": "NMR_Q01", "question": "Is there a clear process for reporting near-miss events?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "NMR_Q02", "question": "Are near-miss reporting forms or digital tools available and easy to use?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "NMR_Q03", "question": "Are all near-miss reports from the review period completed with sufficient detail?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "NMR_Q04", "question": "Are near-miss events categorized by type (slip, trip, caught-in, struck-by, etc.)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "NMR_Q05", "question": "Is there a trend analysis showing frequency of near-miss types over time?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "ROOT_CAUSE",
                "name": "Root Cause & Investigation",
                "sequence": 2,
                "questions": [
                    {"code": "NMR_Q06", "question": "Is root cause analysis (5-Why, fishbone) performed on significant near-miss events?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "NMR_Q07", "question": "Are immediate containment actions taken when a near-miss is identified?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "NMR_Q08", "question": "Are corrective actions specific, assignable, and time-bound?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "NMR_Q09", "question": "Are cross-functional teams involved in investigating high-potential near-misses?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
            {
                "code": "PREVENTION",
                "name": "Prevention & Follow-up",
                "sequence": 3,
                "questions": [
                    {"code": "NMR_Q10", "question": "Are corrective actions tracked to closure with verifiable evidence?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "NMR_Q11", "question": "Are lessons learned from near-misses shared across shifts and departments?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "NMR_Q12", "question": "Are engineering controls implemented to prevent recurrence of high-risk near-misses?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "NMR_Q13", "question": "Is near-miss data used to update risk assessments and standard work?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "NMR_Q14", "question": "Are repeat near-misses investigated with escalation to leadership?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "SF_MACHINE_GUARDING",
        "name": "Machine Guarding Check",
        "audit_type": AuditType.TPM_EQUIPMENT_CHECK,
        "sections": [
            {
                "code": "GUARDS_INTERLOCKS",
                "name": "Guards & Interlocks",
                "sequence": 1,
                "questions": [
                    {"code": "MGD_Q01", "question": "Are all moving parts (belts, pulleys, chains, gears, shafts) properly guarded?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MGD_Q02", "question": "Are fixed guards securely fastened and not easily removable?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MGD_Q03", "question": "Are interlocked guards functional - machine stops when guard is opened?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MGD_Q04", "question": "Are presence-sensing devices (light curtains, pressure mats) properly aligned and tested?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MGD_Q05", "question": "Are two-hand controls and safety trips functional and not bypassed?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "MGD_Q06", "question": "Are pinch points, shear points, and in-running nips guarded or labeled?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "SAFETY_DEVICES",
                "name": "Safety Devices & Controls",
                "sequence": 2,
                "questions": [
                    {"code": "MGD_Q07", "question": "Are emergency stop buttons clearly marked, accessible, and functional?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MGD_Q08", "question": "Are safety relays and PLC safety circuits tested and operational?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MGD_Q09", "question": "Are automatic guards and barrier doors interlocked with machine cycle?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MGD_Q10", "question": "Are residual risk and hazard labels attached to the machine?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MGD_Q11", "question": "Are chips, sparks, and debris guards installed where needed?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "MAINTENANCE",
                "name": "Guarding Maintenance & Bypass",
                "sequence": 3,
                "questions": [
                    {"code": "MGD_Q12", "question": "Are guards and safety devices included in the preventive maintenance schedule?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MGD_Q13", "question": "Are there any bypassed, tied-back, or defeated guards or interlocks?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MGD_Q14", "question": "Are bypassed devices clearly tagged with reason, date, and authorization?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MGD_Q15", "question": "Is there a documented process to restore guards after maintenance?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
        ],
    },
    {
        "code": "SF_LOCKOUT_TAGOUT",
        "name": "Lockout/Tagout Check",
        "audit_type": AuditType.STANDARD_WORK_CHECK,
        "sections": [
            {
                "code": "LOTO_PROCEDURES",
                "name": "LOTO Procedures & Documentation",
                "sequence": 1,
                "questions": [
                    {"code": "LTO_Q01", "question": "Are written LOTO procedures available for all equipment with hazardous energy?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "LTO_Q02", "question": "Are procedures specific to each piece of equipment and include energy isolation points?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "LTO_Q03", "question": "Are LOTO procedures reviewed and updated after equipment modifications?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "LTO_Q04", "question": "Are energy isolation points clearly labeled and identified?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "LTO_Q05", "question": "Is there a current list of authorized LOTO employees?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "LOTO_EXECUTION",
                "name": "LOTO Execution (Observed)",
                "sequence": 2,
                "questions": [
                    {"code": "LTO_Q06", "question": "Does the authorized employee follow the correct shutdown sequence?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "LTO_Q07", "question": "Does each worker apply their own personal lock and tag?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "LTO_Q08", "question": "Is stored energy (capacitors, springs, gravity, pressurized fluids) verified and released?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "LTO_Q09", "question": "Is zero-energy state verified by attempting a safe start after lockout?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "LTO_Q10", "question": "Are locks and tags removed only by the authorized employee who applied them?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "LTO_Q11", "question": "Is the correct startup sequence followed after work is complete?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                    {"code": "LTO_Q12", "question": "Is the area cleared of tools and personnel before re-energizing?", "response_type": "PASS_FAIL_NA", "sequence": 7},
                ],
            },
            {
                "code": "LOTO_GROUP",
                "name": "Group LOTO & Shift Handoff",
                "sequence": 3,
                "questions": [
                    {"code": "LTO_Q13", "question": "Does group LOTO use a master lock box or hasp with individual locks?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "LTO_Q14", "question": "Is there a clear shift handoff process for LOTO when work spans shifts?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "LTO_Q15", "question": "Are temporary LOTO tags (training, testing) clearly distinguished from permanent?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "LTO_Q16", "question": "Are LOTO training records current for all authorized and affected employees?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
        ],
    },
    {
        "code": "SF_EMERGENCY_READINESS",
        "name": "Emergency Readiness Check",
        "audit_type": AuditType.SAFETY,
        "sections": [
            {
                "code": "EXITS_EVACUATION",
                "name": "Exits & Evacuation Routes",
                "sequence": 1,
                "questions": [
                    {"code": "EMR_Q01", "question": "Are all emergency exits clearly marked with illuminated exit signs?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "EMR_Q02", "question": "Are exit pathways and stairwells free of obstruction and debris?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "EMR_Q03", "question": "Do exit doors open in the direction of egress and operate easily?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "EMR_Q04", "question": "Are evacuation maps posted in visible locations showing current floor layout?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "EMR_Q05", "question": "Are designated assembly points clearly marked and communicated?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "FIRE_SAFETY",
                "name": "Fire Safety Equipment",
                "sequence": 2,
                "questions": [
                    {"code": "EMR_Q06", "question": "Are fire extinguishers in correct locations, accessible, and within inspection date?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "EMR_Q07", "question": "Is the correct type of fire extinguisher available for each hazard class (A, B, C, D, K)?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "EMR_Q08", "question": "Are fire alarm pull stations clearly visible and unobstructed?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "EMR_Q09", "question": "Are sprinkler heads and fire suppression systems unobstructed (18-inch clearance)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "EMR_Q10", "question": "Are flammable storage cabinets and waste containers properly used?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "EMERGENCY_SYSTEMS",
                "name": "Emergency Systems & Drills",
                "sequence": 3,
                "questions": [
                    {"code": "EMR_Q11", "question": "Are emergency lighting and exit signs functional and tested monthly?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "EMR_Q12", "question": "Are fire alarms and mass notification systems tested and audible throughout?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "EMR_Q13", "question": "Are emergency generators and backup power systems tested regularly?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "EMR_Q14", "question": "Are emergency drills (fire, evacuation, shelter-in-place) conducted per schedule?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "EMR_Q15", "question": "Are drill results documented with lessons learned and improvements tracked?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "EMR_Q16", "question": "Are first aid kits, AEDs, and emergency supplies accessible and within expiration?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
        ],
    },
    {
        "code": "SF_ERGONOMICS",
        "name": "Ergonomics Check",
        "audit_type": AuditType.STANDARD_WORK_CHECK,
        "sections": [
            {
                "code": "WORKSTATION",
                "name": "Workstation Design & Posture",
                "sequence": 1,
                "questions": [
                    {"code": "ERG_Q01", "question": "Are workstations adjustable to fit the operator's body dimensions?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "ERG_Q02", "question": "Are workbenches and tables at appropriate height to avoid excessive bending or reaching?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "ERG_Q03", "question": "Are operators able to maintain neutral wrist, elbow, and shoulder postures?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "ERG_Q04", "question": "Are footrests, anti-fatigue mats, or sit-stand options provided where workers stand for long periods?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "ERG_Q05", "question": "Are frequently used tools, parts, and controls within comfortable reach (no stretching)?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "ERG_Q06", "question": "Are computer monitors and screens at eye level to avoid neck strain?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "LIFTING",
                "name": "Lifting & Material Handling",
                "sequence": 2,
                "questions": [
                    {"code": "ERG_Q07", "question": "Are mechanical lifting aids (hoists, lift tables, conveyors) available for heavy loads (>25 kg)?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "ERG_Q08", "question": "Are operators trained in proper lifting techniques (legs not back)?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "ERG_Q09", "question": "Are loads kept close to the body and between knee and shoulder height?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "ERG_Q10", "question": "Are team lifts used for awkward or oversized loads?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "ERG_Q11", "question": "Are carts, dollies, and pallet jacks available and in good working condition?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "REPETITIVE_MOTION",
                "name": "Repetitive Motion & Task Rotation",
                "sequence": 3,
                "questions": [
                    {"code": "ERG_Q12", "question": "Are repetitive motion tasks identified and assessed for ergonomic risk?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "ERG_Q13", "question": "Is job rotation used to reduce prolonged exposure to repetitive tasks?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "ERG_Q14", "question": "Are micro-breaks or stretch breaks incorporated into the work routine?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "ERG_Q15", "question": "Are ergonomic tools (pistol-grip, vibration-dampened, angled) provided for high-risk tasks?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "ERG_Q16", "question": "Are workstations designed to minimize twisting, bending, and overhead reaching?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "ERG_Q17", "question": "Are operator discomfort and early symptom reports encouraged and tracked?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
        ],
    },
]




# ──────────────────────────────────────────────
# ──────────────────────────────────────────────
#  DEFAULT MATERIAL CONTROL TEMPLATES (8 audits)
# ──────────────────────────────────────────────

MATERIAL_TEMPLATES = [
    {
        "code": "MT_MATERIAL_FLOW",
        "name": "Material Flow Check",
        "audit_type": AuditType.KANBAN_PULL_CHECK,
        "sections": [
            {
                "code": "MATERIAL_MOVEMENT",
                "name": "Material Movement & Staging",
                "sequence": 1,
                "questions": [
                    {"code": "MFL_Q01", "question": "Is material moved according to the defined flow path and standard route?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MFL_Q02", "question": "Are materials staged in the correct pre-defined staging areas before use?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MFL_Q03", "question": "Is there visual material flow mapping (spaghetti diagram, flow arrows) posted?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MFL_Q04", "question": "Are material movement routes clear of obstructions and blocked aisles?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MFL_Q05", "question": "Is material movement synchronized with production consumption (pull vs push)?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "MFL_Q06", "question": "Is there a standard route for material handlers (mizusumashi / water spider)?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "REPLENISHMENT",
                "name": "Replenishment & Consumption",
                "sequence": 2,
                "questions": [
                    {"code": "MFL_Q07", "question": "Is material replenishment triggered by actual consumption (pull signal)?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MFL_Q08", "question": "Are replenishment lead times and quantities defined and respected?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MFL_Q09", "question": "Is there a clear signal (kanban, empty bin, electronic call) for replenishment?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MFL_Q10", "question": "Are material handlers responding to replenishment signals within target time?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MFL_Q11", "question": "Is returned or excess material processed following the standard return flow?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "MFL_Q12", "question": "Is material consumption tracked and reconciled with production output?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "VISUAL_CONTROLS",
                "name": "Visual Controls & Signals",
                "sequence": 3,
                "questions": [
                    {"code": "MFL_Q13", "question": "Are floor markings and signage for material lanes, staging, and flow clear?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MFL_Q14", "question": "Are material shortage or replenishment call boards/andon visible and working?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MFL_Q15", "question": "Are material pull signals (kanban post, two-bin system) functioning correctly?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MFL_Q16", "question": "Is there a real-time material status board or display for the area?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                ],
            },
        ],
    },
    {
        "code": "MT_FIFO_CHECK",
        "name": "FIFO Check",
        "audit_type": AuditType.KANBAN_PULL_CHECK,
        "sections": [
            {
                "code": "FIFO_ADHERENCE",
                "name": "FIFO Rule Adherence",
                "sequence": 1,
                "questions": [
                    {"code": "FIF_Q01", "question": "Is material physically rotated using FIFO (first-in, first-out) in all storage locations?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "FIF_Q02", "question": "Are FIFO lanes or flow racks used to ensure natural FIFO movement?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "FIF_Q03", "question": "Is older stock clearly moved forward and consumed before newer stock?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "FIF_Q04", "question": "Are FIFO violations (out-of-sequence consumption) visible and reported?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "FIF_Q05", "question": "Are expiration or shelf-life dates checked and respected for FIFO materials?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "FIF_Q06", "question": "Are pull-from and put-to positions clearly marked in FIFO racks?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "FIFO_TRACEABILITY",
                "name": "Traceability & Labeling",
                "sequence": 2,
                "questions": [
                    {"code": "FIF_Q07", "question": "Are date codes, lot numbers, or batch numbers visible on all material units?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "FIF_Q08", "question": "Are receipt dates or manufacturing dates clearly labeled or color-coded?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "FIF_Q09", "question": "Is there a FIFO verification log or check sheet being used?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "FIF_Q10", "question": "Are FIFO check sheets up-to-date and showing no overdue entries?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "FIF_Q11", "question": "Are system date stamps (ERP/WMS) aligned with physical material dates?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "FIFO_DEVIATIONS",
                "name": "Deviations & Corrective Action",
                "sequence": 3,
                "questions": [
                    {"code": "FIF_Q12", "question": "Are FIFO breaches investigated with root cause within 24 hours?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "FIF_Q13", "question": "Are corrective actions for FIFO violations tracked to closure?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "FIF_Q14", "question": "Are expired or obsolete materials removed and segregated immediately?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "FIF_Q15", "question": "Is FIFO compliance trend data visible and reviewed in area meetings?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "FIF_Q16", "question": "Are operators trained on FIFO rules and consequences of non-compliance?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "MT_BIN_LOCATION",
        "name": "Bin / Location Check",
        "audit_type": AuditType.PROCESS_CHECK,
        "sections": [
            {
                "code": "LOCATION_ACCURACY",
                "name": "Bin & Location Accuracy",
                "sequence": 1,
                "questions": [
                    {"code": "BLK_Q01", "question": "Is every material item assigned to a specific bin or location?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "BLK_Q02", "question": "Does the physical location match the system location for all checked materials?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "BLK_Q03", "question": "Are bin labels and location IDs visible, readable, and properly attached?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "BLK_Q04", "question": "Are locations logically organized (zone, aisle, rack, shelf, position)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "BLK_Q05", "question": "Is there a location master list or map available for the area?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "BLK_Q06", "question": "Are empty locations clearly marked as empty or available?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "FILL_LEVELS",
                "name": "Bin Fill Levels & Overflows",
                "sequence": 2,
                "questions": [
                    {"code": "BLK_Q07", "question": "Are bin capacities (min/max/standard quantities) clearly indicated?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "BLK_Q08", "question": "Are bins filled to the correct standard quantity (no overfill or underfill)?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "BLK_Q09", "question": "Is overflow material properly stored in designated overflow locations?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "BLK_Q10", "question": "Are kanban or two-bin quantities within defined limits?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "BLK_Q11", "question": "Are there no mixed part numbers in the same bin or location?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "HOUSEKEEPING",
                "name": "Bin Condition & Housekeeping",
                "sequence": 3,
                "questions": [
                    {"code": "BLK_Q12", "question": "Are bins, totes, and containers clean and in good condition (no cracks, damage)?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "BLK_Q13", "question": "Are bins properly stacked, stored, and not creating a safety hazard?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "BLK_Q14", "question": "Are dunnage and packaging materials removed and disposed of correctly?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "BLK_Q15", "question": "Are visual quantity indicators (min/max lines, tape, color bands) present?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "BLK_Q16", "question": "Are location audits performed regularly with documented results?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "MT_WIP_CHECK",
        "name": "WIP Check",
        "audit_type": AuditType.KANBAN_PULL_CHECK,
        "sections": [
            {
                "code": "WIP_QUANTITY",
                "name": "WIP Quantity & Control",
                "sequence": 1,
                "questions": [
                    {"code": "WIP_Q01", "question": "Is WIP quantity within the standard or kanban limit for the area?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "WIP_Q02", "question": "Is WIP staged only in designated WIP lanes or marked areas?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "WIP_Q03", "question": "Is there a visual WIP board or signal showing current WIP vs target?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "WIP_Q04", "question": "Are WIP levels at each process step visible and measurable?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "WIP_Q05", "question": "Is WIP tracked by hour or shift with escalation when limits are exceeded?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "WIP_Q06", "question": "Is there any excess WIP stored in aisles, under machines, or in non-designated areas?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "WIP_LABELING",
                "name": "WIP Labeling & Identification",
                "sequence": 2,
                "questions": [
                    {"code": "WIP_Q07", "question": "Is every WIP container/unit clearly labeled with part number, quantity, and operation?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "WIP_Q08", "question": "Are WIP labels or travelers showing the current and next process step?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "WIP_Q09", "question": "Are date/time stamps on WIP units visible for flow tracking?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "WIP_Q10", "question": "Are rework or defect WIP units clearly marked and segregated from good WIP?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "WIP_Q11", "question": "Are defect tags or hold tags used for non-conforming WIP?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "WIP_FLOW",
                "name": "WIP Flow & FIFO Discipline",
                "sequence": 3,
                "questions": [
                    {"code": "WIP_Q12", "question": "Is WIP moving in a continuous flow without unnecessary stops or accumulation?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "WIP_Q13", "question": "Is FIFO maintained within WIP lanes between process steps?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "WIP_Q14", "question": "Are WIP handoff points between shifts or operators clear and standardized?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "WIP_Q15", "question": "Are WIP overflow or storage escalation procedures defined and followed?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "WIP_Q16", "question": "Is first-in-first-out physically enforced through flow racks or FIFO lanes?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "MT_SHORTAGE_CHECK",
        "name": "Shortage Check",
        "audit_type": AuditType.PROCESS_CHECK,
        "sections": [
            {
                "code": "SHORTAGE_DETECTION",
                "name": "Shortage Detection & Recording",
                "sequence": 1,
                "questions": [
                    {"code": "SHT_Q01", "question": "Are material shortages clearly identified and recorded immediately when discovered?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "SHT_Q02", "question": "Is there a shortage notification system (andon, call button, shortage board)?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "SHT_Q03", "question": "Are shortage reports or logs showing part number, quantity missing, date, and time?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "SHT_Q04", "question": "Are shortages categorized by root cause (supplier, inventory error, consumption spike, etc.)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "SHT_Q05", "question": "Is shortage frequency tracked and trended over time?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "SHORTAGE_RESPONSE",
                "name": "Shortage Response & Escalation",
                "sequence": 2,
                "questions": [
                    {"code": "SHT_Q06", "question": "Is there a defined escalation path for material shortages (team leader, supervisor, planner)?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "SHT_Q07", "question": "Are shortage resolution target times defined and tracked?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "SHT_Q08", "question": "Are temporary workarounds (borrowing, alternative material) documented and approved?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "SHT_Q09", "question": "Is production stoppage due to shortage used as a last resort and documented?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "SHT_Q10", "question": "Are shortages communicated to the next shift during handoff?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "SHORTAGE_PREVENTION",
                "name": "Shortage Prevention & Root Cause",
                "sequence": 3,
                "questions": [
                    {"code": "SHT_Q11", "question": "Is root cause analysis performed for recurring shortages?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "SHT_Q12", "question": "Are corrective actions for shortages tracked to closure with evidence?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "SHT_Q13", "question": "Are kanban or min/max levels reviewed after shortage events?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "SHT_Q14", "question": "Are material planning and procurement lead times aligned with consumption patterns?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "SHT_Q15", "question": "Is there a shortage prevention kaizen or improvement project active?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "MT_WRONG_MATERIAL",
        "name": "Wrong Material Check",
        "audit_type": AuditType.PROCESS_CHECK,
        "sections": [
            {
                "code": "WRONG_MATERIAL_DETECTION",
                "name": "Wrong Material Detection",
                "sequence": 1,
                "questions": [
                    {"code": "WRM_Q01", "question": "Are parts verified against the bill of material (BOM) before use at the line?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "WRM_Q02", "question": "Is there a part verification step (scanning, visual check, poke-yoke) at point of use?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "WRM_Q03", "question": "Are part numbers, revision levels, and labels checked before material kitting?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "WRM_Q04", "question": "Are wrong-material incidents recorded with part number, location, and shift?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "WRM_Q05", "question": "Is there a visual or barcode-based confirmation at the bin or point-of-use?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "WRM_Q06", "question": "Are look-alike parts (similar shape, size, color) identified and flagged at storage locations?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "WRONG_MATERIAL_RESPONSE",
                "name": "Containment & Correction",
                "sequence": 2,
                "questions": [
                    {"code": "WRM_Q07", "question": "Is wrong material immediately quarantined and segregated upon discovery?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "WRM_Q08", "question": "Is there a containment check across all affected locations when wrong material is found?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "WRM_Q09", "question": "Are wrong-material incidents escalated to material handling and quality teams?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "WRM_Q10", "question": "Is the wrong material disposition (return, rework, scrap) clearly documented?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "WRM_Q11", "question": "Are affected products traced and inspected for potential quality impact?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
            {
                "code": "WRONG_MATERIAL_PREVENTION",
                "name": "Prevention & Poka-Yoke",
                "sequence": 3,
                "questions": [
                    {"code": "WRM_Q12", "question": "Is root cause analysis performed for each wrong-material incident?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "WRM_Q13", "question": "Are mistake-proofing (poka-yoke) devices considered for repeat wrong-material issues?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "WRM_Q14", "question": "Are bin labels, part numbers, and location markings updated after errors?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "WRM_Q15", "question": "Are material handlers and operators trained on correct part identification?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "WRM_Q16", "question": "Is wrong-material trend data reviewed in daily or weekly meetings?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                ],
            },
        ],
    },
    {
        "code": "MT_SUPERMARKET_KANBAN",
        "name": "Supermarket / Kanban Check",
        "audit_type": AuditType.KANBAN_PULL_CHECK,
        "sections": [
            {
                "code": "SUPERMARKET_LEVELS",
                "name": "Supermarket Levels & Organization",
                "sequence": 1,
                "questions": [
                    {"code": "SUP_Q01", "question": "Are supermarket locations clearly defined, labeled, and organized by part family?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "SUP_Q02", "question": "Is each supermarket part within its defined min/max or kanban quantity?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "SUP_Q03", "question": "Are supermarket levels visually indicated (color zones, fill-level markers)?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "SUP_Q04", "question": "Is there a clear max level and reorder point defined for each supermarket item?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "SUP_Q05", "question": "Are supermarket replenishment rules (min/max, two-bin, batch) documented and followed?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "SUP_Q06", "question": "Are empty or low supermarket locations immediately visible to material handlers?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "KANBAN_SIGNALS",
                "name": "Kanban Cards & Signals",
                "sequence": 2,
                "questions": [
                    {"code": "SUP_Q07", "question": "Are kanban cards present, clean, and attached to all kanban-managed containers?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "SUP_Q08", "question": "Are kanban card fields (part number, qty, location, supplier) filled correctly?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "SUP_Q09", "question": "Are electronic or visual kanban signals (andon, light, display) working properly?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "SUP_Q10", "question": "Are kanban cards circulating correctly (consumed, posted, replenished, returned)?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "SUP_Q11", "question": "Are there any unauthorized parts or excess quantities in the supermarket?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "SUP_Q12", "question": "Are kanban quantities reviewed and adjusted based on consumption changes?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "REPLENISHMENT_CYCLE",
                "name": "Replenishment Cycle & Lead Time",
                "sequence": 3,
                "questions": [
                    {"code": "SUP_Q13", "question": "Is supermarket replenishment performed in standard lot sizes and routes?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "SUP_Q14", "question": "Are replenishment routes and schedules respected (milk run timing)?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "SUP_Q15", "question": "Is the supermarket replenishment lead time known and stable?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "SUP_Q16", "question": "Are supermarket shortages escalated immediately when replenishment cannot keep up?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "SUP_Q17", "question": "Is the number of kanban cards in circulation matching the calculated quantity?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "SUP_Q18", "question": "Are supermarket and kanban effectiveness metrics (fill rate, turns) reviewed regularly?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
        ],
    },
    {
        "code": "MT_MATERIAL_HANDLING",
        "name": "Material Handling Check",
        "audit_type": AuditType.PROCESS_CHECK,
        "sections": [
            {
                "code": "HANDLING_METHOD",
                "name": "Handling Methods & Equipment",
                "sequence": 1,
                "questions": [
                    {"code": "MHL_Q01", "question": "Are the correct material handling methods (cart, pallet jack, forklift, conveyor) being used?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MHL_Q02", "question": "Are handling equipment and tools in good condition with no visible defects?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MHL_Q03", "question": "Are operators trained and certified for the handling equipment they operate?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MHL_Q04", "question": "Are handling aids (carts, dollies, lift tables) available at all points where needed?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MHL_Q05", "question": "Is there a standard handling procedure documented for each material type?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "MHL_Q06", "question": "Are heavy, bulky, or awkward materials handled with mechanical assistance only?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "DAMAGE_PREVENTION",
                "name": "Damage Prevention & Packaging",
                "sequence": 2,
                "questions": [
                    {"code": "MHL_Q07", "question": "Is material free of handling damage (dents, scratches, crushed packaging)?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MHL_Q08", "question": "Is packaging appropriate for the material type and handling method?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MHL_Q09", "question": "Are dunnage and protective inserts used correctly to prevent in-transit damage?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MHL_Q10", "question": "Are damage incidents recorded with part number, quantity, and cause?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MHL_Q11", "question": "Are damaged materials segregated and dispositioned promptly?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "MHL_Q12", "question": "Is there a damage trend analysis used to drive packaging or handling improvements?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
            {
                "code": "MOVEMENT_SAFETY",
                "name": "Movement Safety & Ergonomics",
                "sequence": 3,
                "questions": [
                    {"code": "MHL_Q13", "question": "Are material handling routes clear of pedestrian traffic and obstructions?", "response_type": "PASS_FAIL_NA", "sequence": 1},
                    {"code": "MHL_Q14", "question": "Are speed limits and traffic rules for forklifts and carts enforced?", "response_type": "PASS_FAIL_NA", "sequence": 2},
                    {"code": "MHL_Q15", "question": "Are loads secured and stable during transport to prevent shifting or falling?", "response_type": "PASS_FAIL_NA", "sequence": 3},
                    {"code": "MHL_Q16", "question": "Are height and weight limits for racks, shelves, and handling equipment respected?", "response_type": "PASS_FAIL_NA", "sequence": 4},
                    {"code": "MHL_Q17", "question": "Are ergonomic risks in material handling (lifting, twisting, reaching) assessed?", "response_type": "PASS_FAIL_NA", "sequence": 5},
                    {"code": "MHL_Q18", "question": "Is there a near-miss or incident reporting system for material handling events?", "response_type": "PASS_FAIL_NA", "sequence": 6},
                ],
            },
        ],
    },
]




class AuditTemplateService:

    @classmethod
    def get_active_template(cls, audit_type: str) -> Optional[AuditTemplate]:
        return AuditTemplate.objects.filter(
            audit_type=audit_type, status=TemplateStatus.ACTIVE
        ).order_by("-version").first()

    @classmethod
    def list_templates(cls) -> list[AuditTemplate]:
        return list(AuditTemplate.objects.order_by("code"))

    @classmethod
    def get_template(cls, template_id: int) -> Optional[AuditTemplate]:
        return AuditTemplate.objects.filter(id=template_id).first()

    @classmethod
    def get_template_with_data(cls, template_id: int) -> Optional[AuditTemplate]:
        return AuditTemplate.objects.prefetch_related(
            "categories__questions"
        ).filter(id=template_id).first()

    @classmethod
    def list_active_templates(
        cls,
        module_scope: Optional[str] = None,
        target_type: Optional[str] = None,
    ) -> list[AuditTemplate]:
        qs = AuditTemplate.objects.filter(status=TemplateStatus.ACTIVE)
        if module_scope:
            qs = qs.filter(module_scope=module_scope)
        if target_type:
            qs = qs.filter(target_types__contains=[target_type])
        return list(qs.order_by("code"))

    @classmethod
    @transaction.atomic
    def activate_template(cls, template_id: int) -> AuditTemplate:
        template = AuditTemplate.objects.filter(id=template_id).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        template.status = TemplateStatus.ACTIVE
        template.save()
        return template

    @classmethod
    @transaction.atomic
    def archive_template(cls, template_id: int) -> AuditTemplate:
        template = AuditTemplate.objects.filter(id=template_id).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        template.status = TemplateStatus.ARCHIVED
        template.save()
        return template

    @classmethod
    @transaction.atomic
    def clone_template_version(cls, template_id: int) -> AuditTemplate:
        original = AuditTemplate.objects.prefetch_related(
            "categories__questions"
        ).filter(id=template_id).first()
        if not original:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        clone = AuditTemplate.objects.create(
            code=f"{original.code}_v{original.version + 1}",
            name=original.name,
            audit_type=original.audit_type,
            module_scope=original.module_scope,
            target_types=original.target_types,
            version=original.version + 1,
            status=TemplateStatus.DRAFT,
            is_default=False,
        )
        for cat in original.categories.all().order_by("sequence"):
            new_cat = AuditTemplateCategory.objects.create(
                template=clone,
                code=cat.code,
                name=cat.name,
                sequence=cat.sequence,
                is_required=cat.is_required,
            )
            for q in cat.questions.all().order_by("sequence"):
                AuditTemplateQuestion.objects.create(
                    category=new_cat,
                    code=q.code,
                    question=q.question,
                    response_type=q.response_type,
                    is_required=q.is_required,
                    weight=q.weight,
                    sequence=q.sequence,
                    help_text=q.help_text,
                    max_score=q.max_score,
                    allow_na=q.allow_na,
                )
        return clone

    @classmethod
    @transaction.atomic
    def update_template_metadata(
        cls,
        template_id: int,
        name: Optional[str] = None,
        module_scope: Optional[str] = None,
        target_types: Optional[list] = None,
    ) -> AuditTemplate:
        template = AuditTemplate.objects.filter(id=template_id).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        if name is not None:
            template.name = name
        if module_scope is not None:
            template.module_scope = module_scope
        if target_types is not None:
            template.target_types = target_types
        template.save()
        return template

    @classmethod
    @transaction.atomic
    def update_template_metadata(
        cls,
        template_id: int,
        name: Optional[str] = None,
        module_scope: Optional[str] = None,
        target_types: Optional[list] = None,
    ) -> AuditTemplate:
        template = AuditTemplate.objects.filter(id=template_id).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        if name is not None:
            template.name = name
        if module_scope is not None:
            template.module_scope = module_scope
        if target_types is not None:
            template.target_types = target_types
        template.save()
        return template

    @classmethod
    @transaction.atomic
    def update_template_metadata(
        cls,
        template_id: int,
        name: Optional[str] = None,
        module_scope: Optional[str] = None,
        target_types: Optional[list] = None,
    ) -> AuditTemplate:
        template = AuditTemplate.objects.filter(id=template_id).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Audit template {template_id} not found",
            )
        if name is not None:
            template.name = name
        if module_scope is not None:
            template.module_scope = module_scope
        if target_types is not None:
            template.target_types = target_types
        template.save()
        return template

    @classmethod
    @transaction.atomic
    def install_default_production_control_templates(cls) -> list[AuditTemplate]:
        """Idempotent: creates or updates default templates."""
        created = []
        for tmpl_data in PC_TEMPLATES:
            existing = AuditTemplate.objects.filter(code=tmpl_data["code"]).first()
            if existing:
                if existing.status != TemplateStatus.ACTIVE:
                    existing.status = TemplateStatus.ACTIVE
                    existing.save()
                # Rebuild sections/questions to pick up template changes
                existing.categories.all().delete()
                for section_data in tmpl_data["sections"]:
                    cat = AuditTemplateCategory.objects.create(
                        template=existing,
                        code=section_data["code"],
                        name=section_data["name"],
                        sequence=section_data["sequence"],
                        is_required=True,
                    )
                    for q_data in section_data["questions"]:
                        AuditTemplateQuestion.objects.create(
                            category=cat,
                            code=q_data["code"],
                            question=q_data["question"],
                            response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA),
                            is_required=True,
                            weight=1,
                            sequence=q_data["sequence"],
                            help_text=q_data.get("help_text", ""),
                            max_score=5,
                            allow_na=True,
                        )
                existing.version += 1
                existing.save(update_fields=["version"])
                created.append(existing)
                continue

            template = AuditTemplate.objects.create(
                code=tmpl_data["code"],
                name=tmpl_data["name"],
                audit_type=tmpl_data["audit_type"],
                module_scope=ModuleScope.PRODUCTION_CONTROL,
                version=1,
                status=TemplateStatus.ACTIVE,
                is_default=True,
                target_types=[
                    AuditTargetType.PLANT,
                    AuditTargetType.PRODUCTION_LINE,
                    AuditTargetType.DEPARTMENT,
                    AuditTargetType.RESOURCE_GROUP,
                    AuditTargetType.RESOURCE,
                ],
            )
            for section_data in tmpl_data["sections"]:
                category = AuditTemplateCategory.objects.create(
                    template=template,
                    code=section_data["code"],
                    name=section_data["name"],
                    sequence=section_data["sequence"],
                    is_required=True,
                )
                for q_data in section_data["questions"]:
                    AuditTemplateQuestion.objects.create(
                        category=category,
                        code=q_data["code"],
                        question=q_data["question"],
                        response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA),
                        is_required=True,
                        weight=1,
                        sequence=q_data["sequence"],
                        help_text=q_data.get("help_text", ""),
                        max_score=5,
                        allow_na=True,
                    )
            created.append(template)
        return created

    @classmethod
    @transaction.atomic
    def install_default_quality_control_templates(cls) -> list[AuditTemplate]:
        """Idempotent: creates or updates default QC audit templates."""
        created = []
        for tmpl_data in QC_TEMPLATES:
            existing = AuditTemplate.objects.filter(code=tmpl_data["code"]).first()
            if existing:
                if existing.status != TemplateStatus.ACTIVE:
                    existing.status = TemplateStatus.ACTIVE
                    existing.save()
                existing.categories.all().delete()
                for section_data in tmpl_data["sections"]:
                    cat = AuditTemplateCategory.objects.create(template=existing, code=section_data["code"], name=section_data["name"], sequence=section_data["sequence"], is_required=True)
                    for q_data in section_data["questions"]:
                        AuditTemplateQuestion.objects.create(category=cat, code=q_data["code"], question=q_data["question"], response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA), is_required=True, weight=1, sequence=q_data["sequence"], help_text=q_data.get("help_text", ""), max_score=5, allow_na=True)
                existing.version += 1
                existing.save(update_fields=["version"])
                created.append(existing)
                continue
            template = AuditTemplate.objects.create(code=tmpl_data["code"], name=tmpl_data["name"], audit_type=tmpl_data["audit_type"], module_scope=ModuleScope.QUALITY_CONTROL, version=1, status=TemplateStatus.ACTIVE, is_default=True, target_types=[AuditTargetType.PLANT, AuditTargetType.PRODUCTION_LINE, AuditTargetType.DEPARTMENT, AuditTargetType.RESOURCE_GROUP, AuditTargetType.RESOURCE])
            for section_data in tmpl_data["sections"]:
                category = AuditTemplateCategory.objects.create(template=template, code=section_data["code"], name=section_data["name"], sequence=section_data["sequence"], is_required=True)
                for q_data in section_data["questions"]:
                    AuditTemplateQuestion.objects.create(category=category, code=q_data["code"], question=q_data["question"], response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA), is_required=True, weight=1, sequence=q_data["sequence"], help_text=q_data.get("help_text", ""), max_score=5, allow_na=True)
            created.append(template)
        return created

    @classmethod
    @transaction.atomic
    def install_default_safety_control_templates(cls) -> list[AuditTemplate]:
        """Idempotent: creates or updates default Safety control audit templates."""
        created = []
        for tmpl_data in SAFETY_TEMPLATES:
            existing = AuditTemplate.objects.filter(code=tmpl_data["code"]).first()
            if existing:
                if existing.status != TemplateStatus.ACTIVE:
                    existing.status = TemplateStatus.ACTIVE
                    existing.save()
                existing.categories.all().delete()
                for section_data in tmpl_data["sections"]:
                    cat = AuditTemplateCategory.objects.create(template=existing, code=section_data["code"], name=section_data["name"], sequence=section_data["sequence"], is_required=True)
                    for q_data in section_data["questions"]:
                        AuditTemplateQuestion.objects.create(category=cat, code=q_data["code"], question=q_data["question"], response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA), is_required=True, weight=1, sequence=q_data["sequence"], help_text=q_data.get("help_text", ""), max_score=5, allow_na=True)
                existing.version += 1
                existing.save(update_fields=["version"])
                created.append(existing)
                continue
            template = AuditTemplate.objects.create(code=tmpl_data["code"], name=tmpl_data["name"], audit_type=tmpl_data["audit_type"], module_scope=ModuleScope.SAFETY_CONTROL, version=1, status=TemplateStatus.ACTIVE, is_default=True, target_types=[AuditTargetType.PLANT, AuditTargetType.PRODUCTION_LINE, AuditTargetType.DEPARTMENT, AuditTargetType.RESOURCE_GROUP, AuditTargetType.RESOURCE])
            for section_data in tmpl_data["sections"]:
                category = AuditTemplateCategory.objects.create(template=template, code=section_data["code"], name=section_data["name"], sequence=section_data["sequence"], is_required=True)
                for q_data in section_data["questions"]:
                    AuditTemplateQuestion.objects.create(category=category, code=q_data["code"], question=q_data["question"], response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA), is_required=True, weight=1, sequence=q_data["sequence"], help_text=q_data.get("help_text", ""), max_score=5, allow_na=True)
            created.append(template)
        return created

    @classmethod
    @transaction.atomic
    def install_default_material_control_templates(cls) -> list[AuditTemplate]:
        """Idempotent: creates or updates default Material control audit templates."""
        created = []
        for tmpl_data in MATERIAL_TEMPLATES:
            existing = AuditTemplate.objects.filter(code=tmpl_data["code"]).first()
            if existing:
                if existing.status != TemplateStatus.ACTIVE:
                    existing.status = TemplateStatus.ACTIVE
                    existing.save()
                existing.categories.all().delete()
                for section_data in tmpl_data["sections"]:
                    cat = AuditTemplateCategory.objects.create(template=existing, code=section_data["code"], name=section_data["name"], sequence=section_data["sequence"], is_required=True)
                    for q_data in section_data["questions"]:
                        AuditTemplateQuestion.objects.create(category=cat, code=q_data["code"], question=q_data["question"], response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA), is_required=True, weight=1, sequence=q_data["sequence"], help_text=q_data.get("help_text", ""), max_score=5, allow_na=True)
                existing.version += 1
                existing.save(update_fields=["version"])
                created.append(existing)
                continue
            template = AuditTemplate.objects.create(code=tmpl_data["code"], name=tmpl_data["name"], audit_type=tmpl_data["audit_type"], module_scope=ModuleScope.MATERIAL_CONTROL, version=1, status=TemplateStatus.ACTIVE, is_default=True, target_types=[AuditTargetType.PLANT, AuditTargetType.PRODUCTION_LINE, AuditTargetType.DEPARTMENT, AuditTargetType.RESOURCE_GROUP, AuditTargetType.RESOURCE])
            for section_data in tmpl_data["sections"]:
                category = AuditTemplateCategory.objects.create(template=template, code=section_data["code"], name=section_data["name"], sequence=section_data["sequence"], is_required=True)
                for q_data in section_data["questions"]:
                    AuditTemplateQuestion.objects.create(category=category, code=q_data["code"], question=q_data["question"], response_type=q_data.get("response_type", ResponseType.PASS_FAIL_NA), is_required=True, weight=1, sequence=q_data["sequence"], help_text=q_data.get("help_text", ""), max_score=5, allow_na=True)
            created.append(template)
        return created

    @classmethod
    def seed_5s_template(cls) -> AuditTemplate:
        """Seed the 5S audit template for tests."""
        created = cls.install_default_production_control_templates()
        tmpl = next((t for t in created if t.code == "PC_5S_AUDIT"), None)
        if not tmpl:
            tmpl = AuditTemplate.objects.filter(code="PC_5S_AUDIT").first()
        return tmpl


class AuditService:

    @classmethod
    def validate_audit_type(cls, audit_type: str) -> None:
        if audit_type not in AuditType.values:
            raise AuditServiceError(
                field="auditType",
                code="INVALID_AUDIT_TYPE",
                message=f"Invalid audit type '{audit_type}'. Allowed: {', '.join(sorted(AuditType.values))}",
            )

    @classmethod
    def validate_target(cls, target_type: str, target_id: int) -> None:
        if target_type in FORBIDDEN_TARGET_TYPES:
            raise AuditServiceError(
                field="targetType",
                code="FORBIDDEN_TARGET_TYPE",
                message=f"Target type '{target_type}' is not allowed for audits. Allowed: {', '.join(sorted(AUDIT_TARGET_MODEL_MAP))}",
            )
        if target_type not in AUDIT_TARGET_MODEL_MAP:
            raise AuditServiceError(
                field="targetType",
                code="INVALID_TARGET_TYPE",
                message=f"Invalid target type '{target_type}'. Allowed: {', '.join(sorted(AUDIT_TARGET_MODEL_MAP))}",
            )
        model = AUDIT_TARGET_MODEL_MAP[target_type]
        if not model.objects.filter(id=target_id).exists():
            raise AuditServiceError(
                field="targetId",
                code="TARGET_NOT_FOUND",
                message=f"{model.__name__} with id {target_id} not found",
            )

    @classmethod
    def _calculate_score(cls, audit_id: int) -> Optional[float]:
        items = AuditChecklistItem.objects.filter(audit_id=audit_id)
        applicable = items.filter(is_na=False, score__isnull=False)
        total = applicable.count()
        if total == 0:
            return None
        score_sum = sum(applicable.values_list("score", flat=True))
        max_possible = total * 5
        return round((score_sum / max_possible) * 100, 2) if max_possible > 0 else None

    @classmethod
    @transaction.atomic
    def create_audit(
        cls,
        control_area: str = "PRODUCTION",
        audit_type: str = "",
        target_type: str = "",
        target_id: int = 0,
        title: str = "",
        auditor: str = "",
        audit_date: Optional[str] = None,
        notes: str = "",
    ) -> Audit:
        cls.validate_audit_type(audit_type)
        cls.validate_target(target_type, target_id)
        parsed_date = date.fromisoformat(audit_date) if audit_date else None
        audit = Audit.objects.create(
            control_area=control_area,
            audit_type=audit_type,
            target_type=target_type,
            target_id=target_id,
            title=title,
            auditor=auditor,
            audit_date=parsed_date,
            notes=notes,
        )
        return audit

    @classmethod
    @transaction.atomic
    def create_audit_from_template(
        cls,
        template_id: int,
        target_type: str = "",
        target_id: int = 0,
        title: str = "",
        auditor: str = "",
        audit_date: Optional[str] = None,
        notes: str = "",
        control_area: str = "PRODUCTION",
    ) -> Audit:
        template = AuditTemplate.objects.filter(
            id=template_id, status=TemplateStatus.ACTIVE
        ).first()
        if not template:
            raise AuditServiceError(
                field="templateId", code="TEMPLATE_NOT_FOUND",
                message=f"Active audit template {template_id} not found",
            )
        cls.validate_target(target_type, target_id)
        parsed_date = date.fromisoformat(audit_date) if audit_date else None
        audit = Audit.objects.create(
            template=template,
            audit_type=template.audit_type,
            control_area=control_area,
            target_type=target_type,
            target_id=target_id,
            title=title,
            auditor=auditor,
            audit_date=parsed_date,
            notes=notes,
        )
        categories = AuditTemplateCategory.objects.filter(
            template=template
        ).order_by("sequence").prefetch_related("questions")
        for cat in categories:
            for question in cat.questions.filter(is_active=True).order_by("sequence"):
                AuditChecklistItem.objects.create(
                    audit=audit,
                    template_question=question,
                    question=question.question,
                )
                AuditAnswer.objects.create(
                    audit=audit,
                    template_question=question,
                )
        return audit

    @classmethod
    @transaction.atomic
    def update_audit(
        cls,
        audit_id: int,
        title: Optional[str] = None,
        auditor: Optional[str] = None,
        audit_date: Optional[str] = None,
        notes: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Audit:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if title is not None:
            audit.title = title
        if auditor is not None:
            audit.auditor = auditor
        if audit_date is not None:
            audit.audit_date = date.fromisoformat(audit_date) if audit_date else None
        if notes is not None:
            audit.notes = notes
        if status is not None:
            if status not in AuditStatus.values:
                raise AuditServiceError(
                    field="status",
                    code="INVALID_STATUS",
                    message=f"Invalid status '{status}'. Allowed: {', '.join(AuditStatus.values)}",
                )
            audit.status = status
        audit.save()
        return audit

    @classmethod
    @transaction.atomic
    def delete_audit(cls, audit_id: int) -> None:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        audit.delete()

    @classmethod
    def get_audit(cls, audit_id: int) -> Optional[Audit]:
        try:
            return Audit.objects.get(id=audit_id)
        except Audit.DoesNotExist:
            return None

    @classmethod
    def list_audits(
        cls,
        control_area: Optional[str] = None,
        audit_type: Optional[str] = None,
        status: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        auditor: Optional[str] = None,
    ) -> list[Audit]:
        qs = Audit.objects.all()
        if control_area:
            qs = qs.filter(control_area=control_area)
        if audit_type:
            qs = qs.filter(audit_type=audit_type)
        if status:
            qs = qs.filter(status=status)
        if target_type:
            qs = qs.filter(target_type=target_type)
        if target_id is not None:
            qs = qs.filter(target_id=target_id)
        if auditor:
            qs = qs.filter(auditor__icontains=auditor)
        return list(qs.order_by("-updated_at"))

    @classmethod
    @transaction.atomic
    def complete_audit(cls, audit_id: int) -> Audit:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if audit.status == AuditStatus.COMPLETED:
            raise AuditServiceError(
                field="status", code="ALREADY_COMPLETED",
                message="Audit is already completed",
            )
        # Sync unsynced AuditAnswer records into AuditChecklistItem
        answers = AuditAnswer.objects.filter(audit=audit).select_related("template_question")
        for answer in answers:
            q = answer.template_question
            if q:
                cls._sync_answer_to_checklist_item(audit, q, answer.answer_value, answer.comment)
        items = audit.checklist_items.all()
        unanswered = items.filter(is_na=False, score__isnull=True)
        if unanswered.exists():
            raise AuditServiceError(
                field="checklistItems", code="UNANSWERED_ITEMS",
                message=f"{unanswered.count()} applicable checklist item(s) have not been scored",
            )
        audit.score = cls._calculate_score(audit_id)
        audit.status = AuditStatus.COMPLETED
        audit.save()
        return audit

    @classmethod
    @transaction.atomic
    def add_checklist_item(
        cls,
        audit_id: int,
        question: str,
        score: Optional[int] = None,
        is_na: bool = False,
        comment: str = "",
    ) -> AuditChecklistItem:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if score is not None and (score < 0 or score > 5):
            raise AuditServiceError(
                field="score", code="INVALID_SCORE",
                message="Score must be between 0 and 5",
            )
        item = AuditChecklistItem.objects.create(
            audit=audit, question=question, score=score, is_na=is_na, comment=comment,
        )
        audit.score = cls._calculate_score(audit.id)
        audit.save(update_fields=["score"])
        return item

    @classmethod
    @transaction.atomic
    def update_checklist_item(
        cls,
        item_id: int,
        question: Optional[str] = None,
        score: Optional[int] = None,
        is_na: Optional[bool] = None,
        result: Optional[str] = None,
        comment: Optional[str] = None,
    ) -> AuditChecklistItem:
        try:
            item = AuditChecklistItem.objects.select_related("audit").select_for_update().get(id=item_id)
        except AuditChecklistItem.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Checklist item {item_id} not found"
            )
        if question is not None:
            item.question = question
        if score is not None:
            if score < 0 or score > 5:
                raise AuditServiceError(
                    field="score", code="INVALID_SCORE",
                    message="Score must be between 0 and 5",
                )
            item.score = score
            if score is not None:
                item.is_na = False
        if is_na is not None:
            item.is_na = is_na
            if is_na:
                item.score = None
        if result is not None:
            if result and result not in ChecklistResult.values:
                raise AuditServiceError(
                    field="result", code="INVALID_RESULT",
                    message=f"Invalid result '{result}'. Allowed: {', '.join(ChecklistResult.values)}",
                )
            item.result = result
        if comment is not None:
            item.comment = comment
        item.save()
        item.audit.score = cls._calculate_score(item.audit.id)
        item.audit.save(update_fields=["score"])
        return item

    @classmethod
    def _answer_to_score(cls, response_type: str, answer_value: str) -> tuple[Optional[int], bool]:
        if not answer_value:
            return None, False
        if response_type == ResponseType.SCORE_1_5:
            try:
                return int(answer_value), False
            except (ValueError, TypeError):
                return None, False
        if response_type in (ResponseType.PASS_FAIL_NA, ResponseType.YES_NO_NA):
            if answer_value in ("N/A",):
                return None, True
            if answer_value in ("PASS", "YES"):
                return 5, False
            if answer_value in ("FAIL", "NO"):
                return 0, False
            return None, False
        return None, False

    @classmethod
    def _sync_answer_to_checklist_item(cls, audit: Audit, question: AuditTemplateQuestion, answer_value: str, comment: str) -> None:
        score, is_na = cls._answer_to_score(question.response_type, answer_value)
        AuditChecklistItem.objects.update_or_create(
            audit=audit,
            template_question=question,
            defaults={
                "question": question.question,
                "score": score,
                "is_na": is_na,
                "comment": comment,
            },
        )

    @classmethod
    @transaction.atomic
    def save_answer(
        cls,
        audit_id: int,
        question_id: int,
        answer_value: str,
        comment: str = "",
        evidence_url: str = "",
    ) -> AuditAnswer:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        question = AuditTemplateQuestion.objects.filter(id=question_id).first()
        if not question:
            raise AuditServiceError(
                field="questionId", code="QUESTION_NOT_FOUND",
                message=f"Template question {question_id} not found",
            )
        answer, _ = AuditAnswer.objects.update_or_create(
            audit=audit,
            template_question=question,
            defaults={
                "answer_value": answer_value,
                "comment": comment,
                "evidence_url": evidence_url,
            },
        )
        cls._sync_answer_to_checklist_item(audit, question, answer_value, comment)
        return answer

    @classmethod
    @transaction.atomic
    def create_finding_from_answer(
        cls,
        audit_id: int,
        answer_id: int,
        description: str,
        severity: str = Severity.MEDIUM,
        owner: str = "",
        due_date: Optional[str] = None,
    ) -> AuditFinding:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        answer = AuditAnswer.objects.filter(id=answer_id, audit=audit).first()
        if not answer:
            raise AuditServiceError(
                field="answerId", code="ANSWER_NOT_FOUND",
                message=f"Answer {answer_id} not found for audit {audit_id}",
            )
        if severity not in Severity.values:
            raise AuditServiceError(
                field="severity", code="INVALID_SEVERITY",
                message=f"Invalid severity '{severity}'. Allowed: {', '.join(Severity.values)}",
            )
        parsed_date = date.fromisoformat(due_date) if due_date else None
        answer.finding_required = True
        answer.save(update_fields=["finding_required"])
        finding = AuditFinding.objects.create(
            audit=audit,
            answer=answer,
            description=description,
            severity=severity,
            owner=owner,
            due_date=parsed_date,
        )
        return finding

    @classmethod
    @transaction.atomic
    def save_answers_bulk(cls, audit_id: int, answers: list[dict]) -> Audit:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        for item in answers:
            question = AuditTemplateQuestion.objects.filter(id=item["question_id"]).first()
            if not question:
                continue
            answer_value = item.get("answer_value", "")
            comment = item.get("comment", "")
            AuditAnswer.objects.update_or_create(
                audit=audit,
                template_question=question,
                defaults={"answer_value": answer_value, "comment": comment},
            )
            cls._sync_answer_to_checklist_item(audit, question, answer_value, comment)
        return audit

    @classmethod
    @transaction.atomic
    def add_finding(
        cls,
        audit_id: int,
        description: str,
        severity: str,
        owner: str = "",
        due_date: Optional[str] = None,
    ) -> AuditFinding:
        try:
            audit = Audit.objects.select_for_update().get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="auditId", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        if severity not in Severity.values:
            raise AuditServiceError(
                field="severity", code="INVALID_SEVERITY",
                message=f"Invalid severity '{severity}'. Allowed: {', '.join(Severity.values)}",
            )
        parsed_date = date.fromisoformat(due_date) if due_date else None
        finding = AuditFinding.objects.create(
            audit=audit,
            description=description,
            severity=severity,
            owner=owner,
            due_date=parsed_date,
        )
        return finding

    @classmethod
    @transaction.atomic
    def update_finding(
        cls,
        finding_id: int,
        description: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        owner: Optional[str] = None,
        due_date: Optional[str] = None,
    ) -> AuditFinding:
        try:
            finding = AuditFinding.objects.select_for_update().get(id=finding_id)
        except AuditFinding.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Finding {finding_id} not found"
            )
        if description is not None:
            finding.description = description
        if severity is not None:
            if severity not in Severity.values:
                raise AuditServiceError(
                    field="severity", code="INVALID_SEVERITY",
                    message=f"Invalid severity '{severity}'. Allowed: {', '.join(Severity.values)}",
                )
            finding.severity = severity
        if status is not None:
            if status not in FindingStatus.values:
                raise AuditServiceError(
                    field="status", code="INVALID_FINDING_STATUS",
                    message=f"Invalid finding status '{status}'. Allowed: {', '.join(FindingStatus.values)}",
                )
            finding.status = status
        if owner is not None:
            finding.owner = owner
        if due_date is not None:
            finding.due_date = date.fromisoformat(due_date) if due_date else None
        finding.save()
        return finding

    @classmethod
    @transaction.atomic
    def close_finding(cls, finding_id: int) -> AuditFinding:
        try:
            finding = AuditFinding.objects.select_for_update().get(id=finding_id)
        except AuditFinding.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Finding {finding_id} not found"
            )
        finding.status = FindingStatus.CLOSED
        finding.save()
        return finding

    @classmethod
    def calculate_score(cls, audit_id: int) -> Optional[float]:
        try:
            Audit.objects.get(id=audit_id)
        except Audit.DoesNotExist:
            raise AuditServiceError(
                field="id", code="NOT_FOUND", message=f"Audit {audit_id} not found"
            )
        return cls._calculate_score(audit_id)
