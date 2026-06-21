# Active Decisions

The following are LeanSync active decisions. These are stable and Governance-approved. Do not modify without Governance agent approval.

## Organizational Hierarchy
1. Company -> Plant -> Department -> ResourceGroup -> Resource is the organizational hierarchy.
2. Plant -> ProductionLine -> Assigned Resource Groups is the operational production-line flow.

## Backend Data Model
3. `ProductionLineResourceGroup` is backend-only.
4. UI label must be "Assigned Resource Groups".
5. Routing uses assigned ResourceGroups.
6. Capacity uses active assigned ResourceGroups.
7. `ProductVariant.part_number` is active finished-good part number storage.
8. `PartNumber` is compatibility-only.
9. No standalone PartNumber UI.
10. BOM/Routing use `productVariantId`.
11. `MaterialItem.part_number` is used for BOM materials/components.
12. Application Settings contains settings only, not manufacturing master data.

## UI Rules
13. UI consumes GraphQL/backend state only.
14. No mock operational data.
15. No hardcoded business data.
16. No business rules in UI.
17. Frontend styling must use Tailwind CSS only.

## Backend Architecture
18. Domain services own validation, transactions, and invariants.
19. GraphQL resolvers must stay thin.
20. Clean Architecture must be preserved.

## Document Framework
21. Work Instructions, Standard Work, Procedures, and Material Flow Standards use the shared StructureDocument framework.
22. StructureDocument owns content, target attachment, inheritance, and structure-tree resolution.
23. Document Control owns lifecycle governance, revision history, audit trail, approval/archive transitions, controlled copy state, effective/review dates, owner, and change reason.
24. No separate Document Control tree.
25. No duplicate document framework.
26. No frontend inheritance logic.

## Improve Module
30. Improve submenu order is Suggestions -> Kaizen -> A3/PDCA -> Continuous Improvement.
31. Suggestions are lightweight idea records with statuses NEW, UNDER_REVIEW, ACCEPTED, REJECTED, CONVERTED_TO_KAIZEN.
32. Kaizen is the structured execution layer with statuses PLANNED, IN_PROGRESS, COMPLETED, CANCELLED. Kaizen may have child actions (KaizenAction) and may create an A3/PDCA.
33. A3/PDCA is advanced problem-solving with phases PLAN, DO, CHECK, ACT, COMPLETED, CANCELLED. A3/PDCA may have phase-specific child actions (A3PDCAAction).
34. Continuous Improvement is dashboard/overview only, reading from Suggestions, Kaizen, and A3/PDCA.
35. Suggestions may convert to Kaizen. Converted suggestion status becomes CONVERTED_TO_KAIZEN.
36. Kaizen may create/reference A3/PDCA for deeper problem solving.
37. KaizenAction statuses: OPEN, IN_PROGRESS, DONE, CANCELLED.
38. A3PDCAAction statuses: OPEN, IN_PROGRESS, DONE, CANCELLED.
39. Backend owns validation and status transitions via domain services.
40. Frontend displays backend state only — no mock operational data, no business rules in UI.
41. GraphQL resolvers stay thin — mutations delegate to domain services.
42. Domain services own all transitions.
43. Continuous Improvement is overview only — no data entry, no status transitions.
44. MER belongs under Plan, not Improve.
45. No financial validation engine. No forced MER creation.

## Administration Layer
49. AdministrativeDepartment is separate from manufacturing Department.
50. Manufacturing Department remains production/shopfloor structure only.
51. AdministrativeDepartment is used for user organization, responsibility, roles, and permissions.
52. User access is based on AdministrativeDepartment, Role, and Company/Plant scope.
53. User access must not depend on manufacturing Department.
54. Application Settings contains settings only, not administrative master data.
55. UserProfile must reference AdministrativeDepartment only — never manufacturing Department.
56. Role/Permission logic is service-owned, not in resolvers or frontend.
57. No resource-level permission matrix.

## Safety Compliance Extension
70. Safety Compliance extension is approved as bounded operational record tracking.
71. It is not a legal/regulatory engine. It does not provide medical/legal advice.
72. It does not submit official regulatory reports.
73. It does not replace HR, insurance, medical, legal, or ERP systems.
74. Check = audits/checklists only.
75. Safety = events and safety compliance records.
76. CAPA here is safety-scoped only, not global enterprise CAPA.
77. Injury Claims and Medical Cases are permission-protected — only MANAGER_PLUS roles may edit/view confidential notes.
78. Medical confidential notes must never be exposed to unauthorized users.
79. No mock/hardcoded operational records.
80. Domain services own validation and lifecycle transitions.
81. GraphQL resolvers are thin.
82. No duplicate Check/Audit framework.

## Agent System Rules
58. Memory is runtime-only and must never override `project_context/`.
59. Governance-approved rules belong in `project_context/`.
60. Skills must not define permanent governance rules.
