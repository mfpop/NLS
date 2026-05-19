import type { KnowledgeDocument } from "./types";

const line = (id: string, label: string) => ({
  type: "ProductionLine" as const,
  id,
  label,
  href: `/system/production-structure/flow/line?productionLineId=${id}`,
});

const rg = (id: string, label: string) => ({
  type: "ResourceGroup" as const,
  id,
  label,
  href: `/system/production-structure/flow/rg?resourceGroupId=${id}`,
});

const resource = (id: string, label: string) => ({
  type: "Resource" as const,
  id,
  label,
  href: `/system/production-structure/flow/resource?resourceId=${id}`,
});

const routing = (lineId: string, step: string) => ({
  type: "RoutingStep" as const,
  id: `${lineId}-${step}`,
  label: `Step ${step}`,
  href: `/system/production-structure/flow/routing/${lineId}`,
});

const bin = (id: string, label: string) => ({
  type: "MaterialBin" as const,
  id,
  label,
  href: `/system/reference-tables`,
});

const plant = (id: string, label: string) => ({
  type: "Plant" as const,
  id,
  label,
  href: `/system/production-structure/components/plants`,
});

const dept = (id: string, label: string) => ({
  type: "Department" as const,
  id,
  label,
  href: `/system/production-structure/flow/dept?departmentId=${id}`,
});

export const WORK_INSTRUCTIONS: KnowledgeDocument[] = [
  {
    id: "wi-001",
    category: "Routing Instructions",
    title: "Final Assembly — Torque Sequence",
    owner: "M. Ionescu",
    revision: "Rev 4",
    status: "active",
    effectiveDate: "2026-04-01",
    visualSummary: "Illustrated torque pattern and fixture orientation for station FA-02.",
    workSequence: ["Verify part presence at nest A/B", "Apply sequence 1→5 torque per diagram", "Run leak test", "Scan completion label"],
    safetyQualityNotes: ["PPE: cut gloves", "Torque audit every 50 units"],
    links: [line("pl-01", "Line A — Assembly"), routing("pl-01", "40"), rg("rg-12", "Cell FA-02")],
  },
  {
    id: "wi-002",
    category: "Changeover Instructions",
    title: "Press 3 — Die Change SMED",
    owner: "A. Pop",
    revision: "Rev 2",
    status: "active",
    effectiveDate: "2026-03-15",
    visualSummary: "External vs internal work split with color-coded tooling cart layout.",
    workSequence: ["Lockout/tagout", "Remove die set (external)", "Install next die", "First-piece check"],
    safetyQualityNotes: ["Two-person lift > 25 kg", "First piece holds until QA release"],
    links: [resource("res-press-3", "Press 3"), routing("pl-02", "10")],
  },
];

export const STANDARD_WORK_DOCS: KnowledgeDocument[] = [
  {
    id: "sw-001",
    category: "Takt Standards",
    title: "Line A — Takt & Cycle Standard",
    owner: "L. Marin",
    revision: "Rev 6",
    status: "active",
    effectiveDate: "2026-04-10",
    visualSummary: "Combination sheet layout with operator walk path and machine wait points.",
    workSequence: ["Takt 58 s", "Cycle 54 s target", "WIP max 6 between OP20–OP30"],
    safetyQualityNotes: ["No inventory ownership in sheet — refer to material standards"],
    links: [line("pl-01", "Line A — Assembly"), rg("rg-10", "Assembly Cell")],
  },
  {
    id: "sw-yamazumi",
    category: "Yamazumi Standards",
    title: "Yamazumi Chart — Methodology Standard",
    owner: "Industrial Engineering",
    revision: "Rev 3",
    status: "active",
    effectiveDate: "2026-01-20",
    visualSummary: "Defines work content categories, VA/NVA tagging, and chart layout rules.",
    workSequence: ["Classify steps", "Plot work content vs takt", "Identify imbalance > 5%", "Document countermeasures in standard work"],
    safetyQualityNotes: ["Operational balancing runs in Plan → Capacity Planning → Yamazumi"],
    links: [line("pl-01", "Line A — Assembly")],
  },
];

export const MATERIAL_FLOW_DOCS: KnowledgeDocument[] = [
  {
    id: "mf-001",
    category: "FIFO Rules",
    title: "WIP Lane FIFO — Line A",
    owner: "Logistics Lead",
    revision: "Rev 2",
    status: "active",
    effectiveDate: "2026-02-28",
    visualSummary: "Lane diagram with entry/exit arrows and max WIP markers.",
    workSequence: ["Oldest container always consumed first", "No bypass without supervisor approval"],
    safetyQualityNotes: ["Quarantine lane separate — see MF-004"],
    links: [line("pl-01", "Line A — Assembly"), bin("bin-wip-a", "WIP-A-01")],
  },
  {
    id: "mf-002",
    category: "Kanban Rules",
    title: "Supermarket Replenishment — Stamping",
    owner: "Materials",
    revision: "Rev 5",
    status: "active",
    effectiveDate: "2026-03-01",
    visualSummary: "Kanban loop sizes and signal card color codes.",
    workSequence: ["Green = replenish", "Red = stop line feed", "Empty return triggers batch pick"],
    safetyQualityNotes: ["Scrap tags route to quarantine bin Q-12"],
    links: [rg("rg-05", "Stamping Cell"), bin("bin-sm-01", "Supermarket SM-01")],
  },
];

export const PROCEDURE_DOCS: KnowledgeDocument[] = [
  {
    id: "pr-001",
    category: "SOP",
    title: "Line Startup — Morning Shift",
    owner: "Production Supervisor",
    revision: "Rev 7",
    status: "active",
    effectiveDate: "2026-03-20",
    visualSummary: "Checklist flow from utilities on to first good piece.",
    workSequence: ["Utilities & air check", "Material availability", "Andon test", "Run at 50% for 10 min"],
    safetyQualityNotes: ["Escalate downtime > 15 min per escalation matrix PR-003"],
    links: [plant("plant-1", "Plant Cluj"), dept("dept-1", "Assembly")],
  },
  {
    id: "pr-002",
    category: "Safety Procedures",
    title: "Emergency Stop & Evacuation",
    owner: "EHS",
    revision: "Rev 4",
    status: "active",
    effectiveDate: "2025-11-01",
    visualSummary: "Zone map with muster points and E-stop locations.",
    workSequence: ["E-stop", "Secure equipment", "Report to muster", "Await all-clear"],
    safetyQualityNotes: ["Drill quarterly — next due June 2026"],
    links: [plant("plant-1", "Plant Cluj")],
  },
];

export const DOCUMENT_CONTROL_INDEX: KnowledgeDocument[] = [
  ...WORK_INSTRUCTIONS,
  ...STANDARD_WORK_DOCS,
  ...MATERIAL_FLOW_DOCS,
  ...PROCEDURE_DOCS,
  {
    id: "pr-pending-01",
    category: "Maintenance Procedures",
    title: "CNC PM — Weekly Lubrication",
    owner: "Maintenance",
    revision: "Rev 1",
    status: "pending",
    effectiveDate: "—",
    visualSummary: "Awaiting production manager approval.",
    workSequence: ["Pending sign-off"],
    safetyQualityNotes: [],
    links: [plant("plant-1", "Plant Cluj"), rg("rg-08", "CNC Cell")],
  },
  {
    id: "wi-draft-01",
    category: "Inspection Instructions",
    title: "OP30 — Vision Check (Draft)",
    owner: "Quality",
    revision: "Rev 0",
    status: "draft",
    effectiveDate: "—",
    visualSummary: "Draft overlay criteria for vision station.",
    workSequence: ["Pending approval"],
    safetyQualityNotes: [],
    links: [routing("pl-01", "30")],
  },
  {
    id: "sw-obsolete-01",
    category: "Line Balance Standards",
    title: "Line B Balance — Legacy",
    owner: "IE",
    revision: "Rev 1",
    status: "obsolete",
    effectiveDate: "2024-06-01",
    visualSummary: "Superseded by Rev 6 combination sheet.",
    workSequence: ["Archived"],
    safetyQualityNotes: [],
    links: [line("pl-02", "Line B")],
  },
];
