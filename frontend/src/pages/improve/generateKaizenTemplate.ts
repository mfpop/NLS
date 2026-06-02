/**
 * Kaizen Event Template — Structured form field templates
 *
 * Kaizen model fields that can be pre-filled:
 * - problemStatement  (rich text)
 * - currentCondition  (rich text)
 * - targetCondition   (rich text)
 *
 * Two template variants:
 * - A3-style: Toyota Problem-Solving approach
 * - PDCA-style: Plan-Do-Check-Act cycle approach
 */

export interface KaizenTemplateFields {
  title: string;
  problemStatement: string;
  currentCondition: string;
  targetCondition: string;
}

/**
 * A3-style Kaizen template — Toyota Problem-Solving Report approach
 * Focuses on root cause analysis, current vs target, and structured countermeasures.
 */
export function applyKaizenA3Template(): KaizenTemplateFields {
  return {
    title: "Kaizen — A3 Problem-Solving",
    problemStatement: `<h2>Problem Statement</h2>
<p><em>Clearly define the problem — what, where, when, and how much. Use specific data and facts.</em></p>
<ul>
  <li><strong>Symptom:</strong> <em>describe observable issue</em></li>
  <li><strong>Impact:</strong> <em>safety, quality, delivery, cost, or morale</em></li>
  <li><strong>Location:</strong> <em>specific area, line, or process</em></li>
  <li><strong>Magnitude:</strong> <em>frequency, severity, trend data</em></li>
</ul>
<h3>Scope</h3>
<ul>
  <li>✅ <strong>In scope:</strong> <em>what will be addressed</em></li>
  <li>❌ <strong>Out of scope:</strong> <em>what will not be addressed</em></li>
</ul>`,

    currentCondition: `<h2>Current Condition</h2>
<p><em>Describe the current situation with measurable data. Include baseline metrics and observations.</em></p>
<h3>Baseline Metrics</h3>
<table>
  <thead><tr><th>Metric</th><th>Current Value</th><th>Measurement Method</th></tr></thead>
  <tbody>
    <tr><td>Metric 1</td><td>—</td><td>—</td></tr>
    <tr><td>Metric 2</td><td>—</td><td>—</td></tr>
    <tr><td>Metric 3</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<h3>Identified Waste (Muda)</h3>
<ul>
  <li>⏱️ <strong>Waiting:</strong> <em>describe</em></li>
  <li>🚶 <strong>Motion:</strong> <em>describe</em></li>
  <li>📦 <strong>Inventory:</strong> <em>describe</em></li>
  <li>🔁 <strong>Overprocessing:</strong> <em>describe</em></li>
  <li>❌ <strong>Defects:</strong> <em>describe</em></li>
  <li>🧠 <strong>Unused Talent:</strong> <em>describe</em></li>
</ul>`,

    targetCondition: `<h2>Target Condition (SMART Goals)</h2>
<table>
  <thead><tr><th>Metric</th><th>Current</th><th>Target</th><th>Improvement</th><th>Deadline</th></tr></thead>
  <tbody>
    <tr><td>Metric 1</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>Metric 2</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<p><strong>Strategic Alignment:</strong> <em>How this supports plant/business goals</em></p>
<h3>Expected Results</h3>
<ul>
  <li><strong>💰 Cost savings:</strong> $<em>estimated</em></li>
  <li><strong>⏱️ Time savings:</strong> <em>hours per week</em></li>
  <li><strong>✅ Quality improvement:</strong> <em>describe</em></li>
  <li><strong>📈 Capacity gain:</strong> <em>describe</em></li>
</ul>`,
  };
}

/**
 * PDCA-style Kaizen template — Plan-Do-Check-Act cycle approach
 * Focuses on iterative improvement cycles with clear phase structure.
 */
export function applyKaizenPDCATemplate(): KaizenTemplateFields {
  return {
    title: "Kaizen — PDCA Improvement Cycle",
    problemStatement: `<h2>PLAN — Problem Statement</h2>
<p><em>Clearly define the problem with data and facts.</em></p>
<ul>
  <li><strong>What:</strong> <em>describe the issue</em></li>
  <li><strong>Where:</strong> <em>location / area / process</em></li>
  <li><strong>Magnitude:</strong> <em>current vs desired performance</em></li>
  <li><strong>Evidence:</strong> <em>data source / observation</em></li>
  <li><strong>Impact area:</strong> <em>safety / quality / delivery / cost / morale</em></li>
</ul>
<h3>Scope</h3>
<ul>
  <li>✅ <strong>In scope:</strong> <em>what will be addressed</em></li>
  <li>❌ <strong>Out of scope:</strong> <em>what will not be addressed</em></li>
</ul>`,

    currentCondition: `<h2>PLAN — Current Condition</h2>
<p><em>Describe the current state with baseline data and observations.</em></p>
<h3>Baseline Metrics</h3>
<table>
  <thead><tr><th>KPI</th><th>Current Value</th><th>Target</th><th>Gap</th></tr></thead>
  <tbody>
    <tr><td>KPI 1</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>KPI 2</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<h3>Pain Points</h3>
<ul>
  <li><em>Operator feedback</em></li>
  <li><em>Process observations from Gemba walk</em></li>
  <li><em>Historical trend data</em></li>
</ul>`,

    targetCondition: `<h2>PLAN — Target Condition (SMART)</h2>
<ul>
  <li><strong>Specific:</strong> <em>what exactly will improve</em></li>
  <li><strong>Measurable:</strong> <em>KPI and target value</em></li>
  <li><strong>Achievable:</strong> <em>why realistic within timeframe</em></li>
  <li><strong>Relevant:</strong> <em>alignment with goals</em></li>
  <li><strong>Time-bound:</strong> <em>deadline for achievement</em></li>
</ul>
<table>
  <thead><tr><th>KPI</th><th>Current</th><th>Target</th><th>By When</th></tr></thead>
  <tbody>
    <tr><td>KPI 1</td><td>—</td><td>—</td><td>—</td></tr>
    <tr><td>KPI 2</td><td>—</td><td>—</td><td>—</td></tr>
  </tbody>
</table>
<h3>Sustainment Plan</h3>
<ul>
  <li>📊 <strong>Daily tracking:</strong> <em>method</em></li>
  <li>✅ <strong>Audit schedule:</strong> <em>frequency</em></li>
  <li>🔄 <strong>Review cadence:</strong> <em>30/60/90 day follow-up</em></li>
</ul>`,
  };
}

/**
 * Full Kaizen Event template (legacy — single HTML blob for problemStatement)
 * Used when user clicks the old-style Kaizen Template button.
 * Includes all sections in one rich text block.
 */
export function generateKaizenTemplate(): string {
  return `
<h1>Kaizen Event — Structured Improvement Action</h1>
<hr>

<h2>1. Problem Statement &amp; Scope</h2>
<blockquote>
  <p><em>[Describe the problem clearly. What is happening? Where? How often? What is the impact on safety, quality, delivery, cost, or morale?]</em></p>
  <p><strong>Example:</strong> "Changeover time on Press Line 3 has increased from 28 minutes to 47 minutes over the last 6 months due to worn tooling and missing standard work. This has resulted in 22 hours of overtime per month and a 5% decrease in OEE."</p>
</blockquote>

<p><strong>Scope</strong> — What is IN and OUT of scope for this kaizen event:</p>
<ul>
  <li>✅ <strong>In scope:</strong> [e.g. "Press line 3 tool change procedure, tool storage area, operator training"]</li>
  <li>❌ <strong>Out of scope:</strong> [e.g. "Machine maintenance schedule, other press lines, product design changes"]</li>
</ul>
<hr>

<h2>2. Current Condition</h2>
<p><em>Describe the current state with measurable data. Include baseline metrics, observations, and waste identification.</em></p>

<h3>2.1 Baseline Metrics</h3>
<table>
  <thead><tr><th>Metric</th><th>Current Value</th><th>Measurement Method</th><th>Data Period</th></tr></thead>
  <tbody>
    <tr><td>[Metric 1]</td><td>[value]</td><td>[method]</td><td>[period]</td></tr>
    <tr><td>[Metric 2]</td><td>[value]</td><td>[method]</td><td>[period]</td></tr>
    <tr><td>[Metric 3]</td><td>[value]</td><td>[method]</td><td>[period]</td></tr>
  </tbody>
</table>

<h3>2.2 Waste Identification (Muda)</h3>
<ul>
  <li>⏱️ <strong>Waiting:</strong> [e.g. "Operator waits 45s for machine to complete cycle before next step"]</li>
  <li>🚶 <strong>Motion:</strong> [e.g. "Walking 12 meters per cycle to retrieve tools from cabinet"]</li>
  <li>📦 <strong>Inventory:</strong> [e.g. "2.5 days of WIP accumulated between stations 12 and 13"]</li>
  <li>🔁 <strong>Overprocessing:</strong> [e.g. "Parts deburred twice due to inconsistent tool wear"]</li>
  <li>🚚 <strong>Transportation:</strong> [e.g. "Materials moved 3 times before reaching point-of-use"]</li>
  <li>❌ <strong>Defects:</strong> [e.g. "3.2% first-pass yield loss at inspection point C"]</li>
  <li>📈 <strong>Overproduction:</strong> [e.g. "Building 2 days ahead of schedule to compensate for changeover losses"]</li>
  <li>🧠 <strong>Unused Talent:</strong> [e.g. "Operators have ideas but no mechanism to submit them"]</li>
</ul>

<h3>2.3 Process Observations</h3>
<blockquote>
  <p><em>[Describe key observations from Gemba walk — e.g. "Operators frequently search for tools, workbenches cluttered, no visual controls at station, safety glasses not worn consistently."]</em></p>
</blockquote>
<hr>

<h2>3. Target Condition</h2>
<p><em>Define the desired future state using SMART goals. What does success look like?</em></p>

<table>
  <thead><tr><th>Metric</th><th>Current</th><th>Target</th><th>Improvement</th><th>Deadline</th></tr></thead>
  <tbody>
    <tr><td>[Metric 1]</td><td>[current value]</td><td>[target value]</td><td>[% or absolute gain]</td><td>[date]</td></tr>
    <tr><td>[Metric 2]</td><td>[current value]</td><td>[target value]</td><td>[% or absolute gain]</td><td>[date]</td></tr>
    <tr><td>[Metric 3]</td><td>[current value]</td><td>[target value]</td><td>[% or absolute gain]</td><td>[date]</td></tr>
    <tr><td><strong>Strategic Alignment</strong></td><td colspan="4">[How this kaizen supports plant/business goals — e.g. "Supports plant OEE target of 85% for 2026"]</td></tr>
  </tbody>
</table>
<hr>

<h2>4. Root Cause Analysis</h2>

<h3>4.1 Fishbone (Ishikawa) Analysis</h3>
<ul>
  <li><strong>👤 Man / People:</strong> [e.g. "3 operators not trained on SMED method; high turnover on night shift"]</li>
  <li><strong>⚙️ Machine / Equipment:</strong> [e.g. "Tooling worn beyond tolerance; clamps require 14 turns to secure"]</li>
  <li><strong>📋 Method / Process:</strong> [e.g. "No standardized changeover sequence; each operator uses different method"]</li>
  <li><strong>📦 Material:</strong> [e.g. "Tools stored 15m from station; dies not organized by setup group"]</li>
  <li><strong>📏 Measurement:</strong> [e.g. "No changeover tracking system; cannot identify trends"]</li>
  <li><strong>🌿 Environment:</strong> [e.g. "Poor lighting inside machine guarding; hard to see alignment marks"]</li>
</ul>

<h3>4.2 5 Whys — Root Cause Deep Dive</h3>
<table>
  <thead><tr><th>Why?</th><th>Answer</th></tr></thead>
  <tbody>
    <tr><td><strong>Why 1:</strong> [Problem symptom]</td><td>[Because...]</td></tr>
    <tr><td><strong>Why 2:</strong> [First answer]</td><td>[Because...]</td></tr>
    <tr><td><strong>Why 3:</strong> [Second answer]</td><td>[Because...]</td></tr>
    <tr><td><strong>Why 4:</strong> [Third answer]</td><td>[Because...]</td></tr>
    <tr><td><strong>Why 5:</strong> [Fourth answer]</td><td><strong>[Root cause]</strong></td></tr>
  </tbody>
</table>

<p><strong>🔍 Confirmed Root Cause:</strong> <em>[One sentence summary]</em></p>
<hr>

<h2>5. Countermeasure Plan</h2>
<table>
  <thead><tr><th>#</th><th>Countermeasure</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>—</td><td>—</td><td>—</td><td>⏳</td></tr>
    <tr><td>2</td><td>—</td><td>—</td><td>—</td><td>⏳</td></tr>
    <tr><td>3</td><td>—</td><td>—</td><td>—</td><td>⏳</td></tr>
  </tbody>
</table>
<hr>

<h2>6. Implementation Timeline</h2>
<table>
  <thead><tr><th>Phase</th><th>Week</th><th>Activities</th><th>Deliverables</th></tr></thead>
  <tbody>
    <tr><td><strong>Phase 1: Prepare</strong></td><td>Week 1</td><td>Gather baseline data, form team, order materials</td><td>Baseline report</td></tr>
    <tr><td><strong>Phase 2: Analyze</strong></td><td>Week 2</td><td>Gemba walk, time studies, root cause analysis</td><td>Current state VSM</td></tr>
    <tr><td><strong>Phase 3: Implement</strong></td><td>Week 3</td><td>Install countermeasures, test changes, iterate</td><td>Modified process</td></tr>
    <tr><td><strong>Phase 4: Standardize</strong></td><td>Week 4</td><td>Update standard work, train operators, visual controls</td><td>Updated SW</td></tr>
    <tr><td><strong>Phase 5: Verify</strong></td><td>Week 5</td><td>Measure results, audit, report-out</td><td>After-action report</td></tr>
  </tbody>
</table>
<hr>

<h2>7. Expected Results</h2>
<table>
  <thead><tr><th>Metric</th><th>Before</th><th>After (Target)</th><th>Improvement</th></tr></thead>
  <tbody>
    <tr><td>[Metric 1]</td><td>[value]</td><td>[target]</td><td>[%]</td></tr>
    <tr><td>[Metric 2]</td><td>[value]</td><td>[target]</td><td>[%]</td></tr>
  </tbody>
</table>

<h3>Estimated Business Impact</h3>
<ul>
  <li><strong>💰 Cost savings:</strong> $[estimated annual savings]</li>
  <li><strong>⏱️ Time savings:</strong> [hours per week]</li>
  <li><strong>✅ Quality improvement:</strong> [first-pass yield increase]</li>
</ul>
<hr>

<h2>8. Sustainment &amp; Follow-up</h2>
<ul>
  <li>📊 <strong>Daily tracking:</strong> <em>method</em></li>
  <li>✅ <strong>Audit schedule:</strong> <em>frequency</em></li>
  <li>🔄 <strong>Review cadence:</strong> 30/60/90 day follow-up</li>
</ul>

<h3>Sustainment Checklist</h3>
<ul>
  <li>⬜ Standard work updated and posted</li>
  <li>⬜ All operators trained</li>
  <li>⬜ Visual controls installed</li>
  <li>⬜ Metrics baseline captured</li>
  <li>⬜ Audit schedule defined</li>
  <li>⬜ Handoff to area supervisor completed</li>
</ul>
<hr>

<p><em>This template follows the Toyota Production System Kaizen Event methodology (Plan-Do-Check-Act).</em></p>
`.trim();
}
