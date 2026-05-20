# Nexus LeanSync — User Manual

## 1. Application Purpose
Nexus LeanSync is a **lean manufacturing dashboard for documenting, monitoring, analysis, and improvement of production lines**. It integrates real-time execution tracking, value stream mapping (VSM), capacity planning, problem logging, and structured continuous improvement workflows into a single Control Tower.

Ground in **physical flow truth**, the application integrates four core elements:
* **Execution (MES)**: Monitors batch execution, cycle signals, and live production output directly on the shop floor.
* **Flow (VSM)**: Visualizes how material (Raw Materials, WIP, Finished Goods) and information move through process steps.
* **Decision (Control Tower)**: Aggregates key metrics and alerts supervisors to bottleneck constraints and output gaps.
* **Interaction (Gemba/Improvement)**: Facilitates hands-on floor observations, suggestion boxes, audits, and Kaizen events.

---

## 2. Core Operational Workflow
The continuous improvement loop of Nexus LeanSync operates in a cyclical flow:

```
[System Setup] ──> [ERP Work Orders] ──> [Shop Floor Execution] 
      ▲                                            │
      │                                            ▼
[Kaizen / Standard Work] <── [Gemba Walk] <── [KPI & VSM Analysis]
```

1. **System Modeling**: Define your Plant hierarchy (Plants, Departments, Resource Groups, and Resources) and Product Master Data (Families, Models, versioned Routings/Process Flows).
2. **ERP Integration**: Import scheduled demands (Work Orders) from the ERP system, mapping them to specific production lines.
3. **Live Execution**: Operators start Batches and log Production Cycles. The system collects real-time event logs (starts, completions, downtimes, defects).
4. **Monitoring & Analysis**: The Control Tower and Line Performance pages compute OEE, Availability, Performance, and Quality KPIs. The VSM page shows live bottlenecks and WIP buildup.
5. **Observation (Gemba)**: Supervisors conduct Gemba Walks, note variances, audit Standard Work, and log problems.
6. **Improvement (Kaizen)**: Teams initiate Kaizen events, implement new methods, update versioned Standard Work, adjust Kanban/material flow standards, and close the loop to establish a new performance baseline.

---

## 3. Page-by-Page Instructions

### 3.1. Main Dashboards & Workspaces

#### Control Tower (`/control-tower` or `/`)
* **Purpose**: The live command center for shift supervisors and operations managers.
* **Key Sections**:
  * **Situation Summary**: Displays high-level alerts (e.g. output gaps, critical stoppages, next actions).
  * **Primary Actions**: Highlights immediate corrective actions needed to resolve flow interruptions.
  * **KPIs Grid**: Real-time tiles showing Flow (WIP, Lead Time), Performance (Output vs Plan, Takt vs Cycle), and Quality metrics. Each tile allows drill-down views (Trend Charts, Breakdown Panels, Root-Cause Views).
  * **Priority Actions**: A list of owner-assigned tasks categorized by severity.
  * **Problems Log**: Open operational, data, or system problems with their corresponding cause-and-effect chains.
  * **My Work Panel**: Split into "Do Now", "Next", and "Later" task categories to manage the user's immediate tasks.
* **Operator Instructions**: Use this page at start-of-shift and during hourly reviews. Click any KPI tile or priority item to drill down into root causes.

#### My Workspace (`/myworkspace/dashboard` & `/myworkspace/tasks`)
* **Purpose**: A personalized portal for operators and supervisors to manage their specific work.
* **My Dashboard**: Tailored view of KPIs and performance metrics relevant only to the logged-in user's assigned area.
* **My Tasks**: A checkable checklist of pending actions, audits, and suggestions assigned directly to the current user.

---

### 3.2. Execution Monitoring

#### Line Performance (`/execution/line-performance`)
* **Purpose**: Tracks operational efficiency metrics per production line.
* **Instructions**: Select a Production Line and Shift. Monitor the breakdown of Overall Equipment Effectiveness (OEE) into its three sub-metrics: Availability, Performance, and Quality. View historical shift comparisons to identify negative trends.

#### Live Shopfloor (`/execution/live-shopfloor`)
* **Purpose**: Real-time tracking of active station statuses on the assembly floor.
* **Instructions**: Shows a visual mimic of stations. Green indicates normal cycle execution, yellow indicates setup or changeover, red indicates active downtime, and gray represents idle status. Monitor cycle countdowns and active batch progress.

#### VSM (`/execution/vsm`)
* **Purpose**: Interactive Value Stream Map visualizing flow and lead times.
* **Instructions**: Displays a visual flow of Process Nodes (processing stations), Inventory Nodes (triangles indicating WIP, RM, or FG buffers), and Flow Links (FIFO lanes, supermarket rules, push/pull indicators). Use this screen to locate where material queue buildup is exceeding standard limits.

#### Daily Gemba Walk (`/execution/daily-gemba-walk`)
* **Purpose**: Capturing on-the-floor observation notes at the point of action.
* **Instructions**: Start a walk, select the department or workstation, and type observations. Log positive highlights or flag problems. Directly link issues to physical resources to ensure traceability.

---

### 3.3. Planning & Capacity

#### Production Plan (`/plan/production-plan`)
* **Purpose**: Define and manage production schedules, batch sizes, and sequencing.
* **Instructions**: Create production plans. Input target batch sizes and select the routing version to sequence orders across production lines.

#### Capacity Planning (`/plan/capacity/*`)
* **Purpose**: Heavy-duty calculation tool to balance workloads, analyze bottlenecks, and test scenario options.
* **Tabs & Sub-views**:
  * **Overview**: Planning context, horizon dates, planned quantity, takt time, and net available capacity.
  * **Capacity Load**: Grid detailing Available vs Required capacity, utilization percentages, gaps, and status indicators per area.
  * **Yamazumi**: Graphic stacked-bar chart showing operator work content (manual, auto, setup) compared against the takt time line.
  * **Line Balancing**: Balancing calculations to distribute work content evenly among operator stations.
  * **Bottleneck Analysis**: PIN-points the physical constraint or process step limiting total system throughput.
  * **Operator Allocation**: Recommends the optimal number of operators required to meet demand.
  * **Takt vs Cycle**: Direct comparisons highlighting stations running slower than takt.
  * **Capacity Loss**: Detailed loss waterfall (downtime, setup, speed losses).
  * **Workload Distribution**: Visual loading bar graph for resources.
  * **Constraints**: Critical issues where process requirements violate physical capacity.
  * **Scenarios**: What-if modeler allowing you to adjust planned volumes and save alternative scenarios without altering live baseline plans.

---

### 3.4. Check & Audit

#### Problems (`/check/problems`)
* **Purpose**: Log, categorize, and track operational issues.
* **Instructions**: View open issues, their severity, owner, and status. Drill down to inspect the problem history, notes, and resolution actions.

#### Actions (`/check/actions`)
* **Purpose**: Centralized action item list.
* **Instructions**: Manage corrective actions. Sort by due dates, update progress status (Open, In Progress, Complete), and reassign owners.

#### Audits (`/check/audits`)
* **Purpose**: Schedule and perform quality, safety, 5S, and process audits.
* **Instructions**: Select an audit template, perform checks at the designated workstation, log compliance scores, and automatically generate corrective action tickets for failed questions.

#### Quality (`/check/quality`)
* **Purpose**: Log and analyze quality defects.
* **Instructions**: Log scrap quantities and defects (e.g. porosity, dimensions) mapped to specific resources and active batches. Monitor overall yield rates.

---

### 3.5. Continuous Improvement (Improve)

#### Kaizen (`/improve/kaizen`)
* **Purpose**: Track structured continuous improvement projects.
* **Instructions**: Manage Kaizen projects through their lifecycle phases: **Idea → Plan → Do → Check → Standardize → Closed**. Attach A3 problem-solving templates and track performance before and after project execution.

#### Continuous Improvement (`/improve/continuous-improvement`)
* **Purpose**: High-level dashboard for tracking site-wide CI metrics and goals.
* **Instructions**: Review cumulative savings, count of active Kaizen events, and average lead-time reductions over time.

#### Suggestions (`/improve/suggestions`)
* **Purpose**: Digital employee suggestion box.
* **Instructions**: Submit improvement ideas, upvote peer suggestions, and route approved ideas directly into the Kaizen planning funnel.

---

### 3.6. Documentation & Standards (Standardize)

#### Work Instructions (`/standardize/work-instructions`)
* **Purpose**: Manage Standard Operating Procedures (SOPs), visual aids, and tooling guides.
* **Instructions**: View and search instructions. Link document attachments to specific process routing steps or resource groups.

#### Standard Work (`/standardize/standard-work`)
* **Purpose**: Define standard work sheets, cycle time standards, takt benchmarks, and combination sheets.
* **Instructions**: Set baseline standards for operations. This houses standard sequences and WIP rules (for execution comparison, separate from the capacity balancing tool).

#### Material Flow Standards (`/standardize/material-flow-standards`)
* **Purpose**: Document logistics rules.
* **Instructions**: Set kanban limits, FIFO capacities, supermarket sizing, and bin specifications.

#### Procedures (`/standardize/procedures`)
* **Purpose**: Host high-level site SOPs, escalation flows, startup checklists, and safety guides.
* **Instructions**: Browse and read documentation relating to department operations and plant maintenance.

#### Document Control (`/standardize/document-control`)
* **Purpose**: Document lifecycle management and approvals.
* **Instructions**: Track documents across Standardize modules. Review revision history, view drafts awaiting approval, approve/reject changes, and access the obsolete archive.

---

### 3.7. System Administration

#### Manufacturing Structure (`/system/production-structure`)
* **Purpose**: Manage the physical and process hierarchy of the factory.
* **Instructions**: Navigate the interactive tree (Company → Plants → Departments → Resource Groups → Resources). Right-click nodes to add child elements, edit properties, or delete assets. Update node properties like active status, calendars, and timezone constraints.

#### Warehouses & Material Bins (`/system/warehouses` & `/system/material-bins`)
* **Purpose**: Setup inventory stocking points.
* **Instructions**: Define warehouses and line-side material bins. Assign bins to specific process stations to establish flow link connections.

#### Product Master Data (`/system/product-master-data`)
* **Purpose**: Define product models and process routings.
* **Instructions**: Register Product Families and Product Models. Define version-controlled **Process Flows (Routings)**, sequencing Process Steps, standard times, and preferred Resource Group assignments.

#### Reference Tables (`/system/reference-tables`)
* **Purpose**: Manage master lookup tables.
* **Instructions**: Edit system lists, including cities, zipcodes, states, customer entities, and supplier directories.

#### Diagnostics (`/system/diagnostics` or `/status`)
* **Purpose**: System health monitor.
* **Instructions**: Inspect GraphQL endpoint latency, database connections, cache states, and system debug logs.

#### Entity Visual Settings (`/system/entity-visual-settings`)
* **Purpose**: Customize user interface colors and icons.
* **Instructions**: Map custom icons and semantic background colors (emerald, amber, red, etc.) to specific Resource Groups or plant departments.

#### ERP Data (`/system/erp-data/*`)
* **Purpose**: ERP integration dashboard.
* **Key Sub-pages**:
  * **Import Sources**: Manage source systems (CSV, REST API, SFTP).
  * **Import Jobs**: Log of scheduled data import runs.
  * **File History**: History of uploaded files and sizes.
  * **Mapping Rules**: Translate ERP fields into LeanSync database properties.
  * **Validation Errors**: Outlines data type or constraint errors flagged during imports.
  * **Integration Status**: System-to-system sync status logs.
  * **File Preview**: Inspect raw uploaded payload files.
  * **Compare Results**: Side-by-side reconciliation of ERP values against local states.
