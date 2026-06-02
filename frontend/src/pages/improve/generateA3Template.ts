/**
 * Structured template functions for A3 / PDCA problem-solving.
 *
 * Returns objects with all form fields pre-populated with structured headings
 * so the user can fill in each section individually.
 *
 * A3: Toyota-style A3 Problem-Solving Report (9 sections)
 * PDCA: Plan-Do-Check-Act cycle (4 phases)
 */

export interface A3TemplateFields {
  title: string;
  background: string;
  problemStatement: string;
  currentCondition: string;
  targetCondition: string;
  rootCauseAnalysis: string;
  countermeasures: string;
  implementationPlan: string;
}

/**
 * Toyota-style A3 Problem-Solving Report template
 * Populates ALL PLAN fields with structured section headings.
 */
export function applyA3Template(): A3TemplateFields {
  return {
    title: "A3 Problem-Solving Report",
    background: `<h2>1. Background</h2>
<p><em>Why is this issue important? How does it align with business goals, customer requirements, or strategic objectives?</em></p>
<ul>
  <li>Business impact: <em>describe effect on safety, quality, delivery, cost, or morale</em></li>
  <li>Strategic alignment: <em>link to plant/business goals</em></li>
  <li>History: <em>how long has this been an issue?</em></li>
</ul>`,
    problemStatement: `<h2>2. Problem Statement</h2>
<p><em>Clearly define the problem — what, where, when, and how much. Use specific data and facts.</em></p>
<ul>
  <li>Symptom: <em>describe observable issue</em></li>
  <li>Impact: <em>safety, quality, delivery, cost, morale</em></li>
  <li>Location: <em>specific area, line, or process</em></li>
  <li>Magnitude: <em>frequency, severity, trend data</em></li>
</ul>`,
    currentCondition: `<h2>3. Current Condition</h2>
<p><em>Describe the current situation with measurable data. Include baseline metrics, observations, and waste identification.</em></p>
<table>
  <thead><tr><th>Metric</th><th>Current Value</th><th>Target</th><th>Gap</th></tr></thead>
  <tbody>
    <tr><td>Metric 1</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Metric 2</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Metric 3</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<h3>Identified Waste (Muda)</h3>
<ul>
  <li>⏱️ Waiting: <em>describe</em></li>
  <li>🚶 Motion: <em>describe</em></li>
  <li>📦 Inventory: <em>describe</em></li>
  <li>🔁 Overprocessing: <em>describe</em></li>
  <li>❌ Defects: <em>describe</em></li>
</ul>`,
    targetCondition: `<h2>4. Target Condition (SMART Goals)</h2>
<table>
  <thead><tr><th>Metric</th><th>Current</th><th>Target</th><th>Deadline</th></tr></thead>
  <tbody>
    <tr><td>Metric 1</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Metric 2</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<p><strong>Strategic Alignment:</strong> <em>How this supports plant/business goals</em></p>`,
    rootCauseAnalysis: `<h2>5. Root Cause Analysis</h2>
<h3>Fishbone (Ishikawa) Categories</h3>
<ul>
  <li><strong>Man / People:</strong> <em>describe</em></li>
  <li><strong>Machine / Equipment:</strong> <em>describe</em></li>
  <li><strong>Method / Process:</strong> <em>describe</em></li>
  <li><strong>Material:</strong> <em>describe</em></li>
  <li><strong>Measurement:</strong> <em>describe</em></li>
  <li><strong>Environment:</strong> <em>describe</em></li>
</ul>
<h3>5 Whys</h3>
<ol>
  <li>Why? — <em>answer</em></li>
  <li>Why? — <em>answer</em></li>
  <li>Why? — <em>answer</em></li>
  <li>Why? — <em>answer</em></li>
  <li><strong>Root Cause:</strong> <em>answer</em></li>
</ol>`,
    countermeasures: `<h2>6. Countermeasures</h2>
<table>
  <thead><tr><th>#</th><th>Countermeasure</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>—</td><td>—</td><td>—</td><td>⏳</td></tr>
    <tr><td>2</td><td>—</td><td>—</td><td>—</td><td>⏳</td></tr>
    <tr><td>3</td><td>—</td><td>—</td><td>—</td><td>⏳</td></tr>
  </tbody>
</table>`,
    implementationPlan: `<h2>7. Implementation Plan</h2>
<table>
  <thead><tr><th>Phase</th><th>Activities</th><th>Deliverables</th><th>Timeline</th></tr></thead>
  <tbody>
    <tr><td>Prepare</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Analyze</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Implement</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Standardize</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Verify</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>`,
  };
}

/**
 * PDCA (Plan-Do-Check-Act) template
 * Populates fields grouped by PDCA phase.
 */
export function applyPDCATemplate(): A3TemplateFields {
  return {
    title: "PDCA Improvement Cycle",
    background: `<h2>PLAN — Background</h2>
<p><em>Why is this improvement needed? What problem or opportunity exists?</em></p>
<ul>
  <li>Current issue: <em>describe</em></li>
  <li>Impact area: <em>safety / quality / delivery / cost / morale</em></li>
  <li>Scope: <em>what is in/out of scope</em></li>
</ul>`,
    problemStatement: `<h2>PLAN — Problem Statement</h2>
<p><em>Clearly define the problem with data and facts.</em></p>
<ul>
  <li>What: <em>describe</em></li>
  <li>Where: <em>location</em></li>
  <li>Magnitude: <em>current vs desired</em></li>
  <li>Evidence: <em>data source</em></li>
</ul>`,
    currentCondition: `<h2>PLAN — Current Condition</h2>
<p><em>Describe the current state with baseline data.</em></p>
<ul>
  <li>Process step: <em>describe</em></li>
  <li>Current KPI values: <em>list with data</em></li>
  <li>Pain points: <em>operator feedback, observations</em></li>
</ul>`,
    targetCondition: `<h2>PLAN — Target Condition</h2>
<p><em>Define SMART goals for this PDCA cycle.</em></p>
<ul>
  <li><strong>Specific:</strong> <em>what exactly will improve</em></li>
  <li><strong>Measurable:</strong> <em>KPI and target value</em></li>
  <li><strong>Achievable:</strong> <em>why realistic</em></li>
  <li><strong>Relevant:</strong> <em>alignment</em></li>
  <li><strong>Time-bound:</strong> <em>deadline</em></li>
</ul>`,
    rootCauseAnalysis: `<h2>PLAN — Root Cause Analysis</h2>
<h3>Fishbone Analysis</h3>
<ul>
  <li><strong>Man:</strong> <em>describe</em></li>
  <li><strong>Machine:</strong> <em>describe</em></li>
  <li><strong>Method:</strong> <em>describe</em></li>
  <li><strong>Material:</strong> <em>describe</em></li>
  <li><strong>Measurement:</strong> <em>describe</em></li>
  <li><strong>Environment:</strong> <em>describe</em></li>
</ul>
<h3>5 Whys</h3>
<ol><li>Why? — <em>answer</em></li><li>Why? — <em>answer</em></li><li>Why? — <em>answer</em></li><li>Why? — <em>answer</em></li><li><strong>Root Cause:</strong> <em>answer</em></li></ol>`,
    countermeasures: `<h2>PLAN — Proposed Countermeasures</h2>
<table>
  <thead><tr><th>#</th><th>Action</th><th>Owner</th><th>Due</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>2</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>`,
    implementationPlan: `<h2>PLAN — Implementation Plan</h2>
<table>
  <thead><tr><th>Action</th><th>Owner</th><th>Due Date</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>Step 1</td><td>—</td><td>—</td><td>⏳</td></tr>
    <tr><td>Step 2</td><td>—</td><td>—</td><td>⏳</td></tr>
    <tr><td>Step 3</td><td>—</td><td>—</td><td>⏳</td></tr>
  </tbody>
</table>
<hr>
<h2>DO — Execution Notes</h2>
<p><em>Document implementation progress, observations, and blockers here after starting.</em></p>
<ul>
  <li>Date started: <em>date</em></li>
  <li>Changes made: <em>describe</em></li>
  <li>Issues encountered: <em>describe</em></li>
</ul>
<h2>CHECK — Results & Validation</h2>
<p><em>Compare before/after results and verify effectiveness.</em></p>
<ul>
  <li>Before/After comparison: <em>data</em></li>
  <li>Effectiveness: <em>achieved target?</em></li>
</ul>
<h2>ACT — Standardize & Sustain</h2>
<p><em>Document standardization actions and lessons learned.</em></p>
<ul>
  <li>Standard work updated: <em>yes/no</em></li>
  <li>Training completed: <em>date</em></li>
  <li>Lessons learned: <em>describe</em></li>
  <li>Follow-up plan: <em>describe</em></li>
</ul>`,
  };
}
