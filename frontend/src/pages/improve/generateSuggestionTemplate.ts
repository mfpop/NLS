/**
 * Lean Manufacturing Kaizen Suggestion Template (A3-Inspired)
 *
 * Based on the Toyota Production System A3 Problem-Solving methodology —
 * the most widely adopted standard for structured continuous improvement
 * in manufacturing worldwide.
 *
 * The A3 report condenses the entire PDCA cycle onto a single sheet:
 * 1. Background (Why this matters)
 * 2. Current Condition (Where we are — with data)
 * 3. Target / Goal (Where we want to be — SMART)
 * 4. Root Cause Analysis (5 Whys / Fishbone)
 * 5. Proposed Countermeasures (Actions to eliminate root cause)
 * 6. Implementation Plan (Who does what, by when)
 * 7. Expected Results (Before vs. After metrics)
 * 8. Follow-up & Sustainment (How to hold the gains)
 */
export function generateSuggestionTemplate(): string {
  return `
<h1>Kaizen Suggestion — A3 Problem-Solving Report</h1>
<hr>

<h2>1. Background &amp; Business Case</h2>
<blockquote>
  <p><em>[Describe the problem or opportunity. Why is this important? Link to business goals — safety, quality, delivery, cost, morale.]</em></p>
  <p><strong>Example:</strong> "Station 12 on Line 3 has an average changeover time of 42 minutes against a target of 25 minutes. This causes overtime, late deliveries to downstream processes, and reduces OEE by 8%. Aligned with plant SMED reduction initiative Q3."</p>
</blockquote>
<hr>

<h2>2. Current Condition</h2>
<p><em>Describe the current state with data. Use metrics, sketches, or photos to show reality.</em></p>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Current Value</th>
      <th>Data Source</th>
      <th>Period</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Metric 1 — e.g. Changeover time]</td>
      <td>[value — e.g. 42 min]</td>
      <td>[e.g. Time studies week 20–22]</td>
      <td>[e.g. Last 3 weeks]</td>
    </tr>
    <tr>
      <td>[Metric 2 — e.g. Defect rate]</td>
      <td>[value — e.g. 3.2%]</td>
      <td>[e.g. Quality system report]</td>
      <td>[e.g. Month of May]</td>
    </tr>
    <tr>
      <td>[Metric 3 — e.g. Walking distance]</td>
      <td>[value — e.g. 18 m/cycle]</td>
      <td>[e.g. Spaghetti chart]</td>
      <td>[e.g. Observed 10 cycles]</td>
    </tr>
  </tbody>
</table>

<h3>Waste Identification (Muda)</h3>
<ul>
  <li>⏱️ <strong>Waiting:</strong> [Describe waiting waste — e.g. "Operator waits 12 sec for machine cycle"]</li>
  <li>🚶 <strong>Motion:</strong> [Describe motion waste — e.g. "Walking 8 m to get tools each changeover"]</li>
  <li>📦 <strong>Inventory:</strong> [Describe inventory waste — e.g. "3 days of WIP between stations 11 and 12"]</li>
  <li>🔁 <strong>Overprocessing:</strong> [Describe overprocessing waste]</li>
  <li>🚚 <strong>Transportation:</strong> [Describe transport waste]</li>
  <li>❌ <strong>Defects:</strong> [Describe defect waste — e.g. "3.2% rework rate at inspection point B"]</li>
  <li>📈 <strong>Overproduction:</strong> [Describe overproduction waste]</li>
  <li>🧠 <strong>Unused Talent:</strong> [Describe underutilized people]</li>
</ul>
<hr>

<h2>3. Target / Goal (SMART)</h2>
<table>
  <thead>
    <tr>
      <th>Criteria</th>
      <th>Target</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>S</strong>pecific</td>
      <td>[What exactly will improve? — e.g. "Reduce changeover time at Station 12"]</td>
    </tr>
    <tr>
      <td><strong>M</strong>easurable</td>
      <td>[How will you measure? — e.g. "From 42 min to ≤ 25 min"]</td>
    </tr>
    <tr>
      <td><strong>A</strong>chievable</td>
      <td>[Why is this realistic? — e.g. "Similar lines achieved 22 min using SMED"]</td>
    </tr>
    <tr>
      <td><strong>R</strong>elevant</td>
      <td>[How does this align? — e.g. "Supports plant OEE target of 85%"]</td>
    </tr>
    <tr>
      <td><strong>T</strong>ime-bound</td>
      <td>[By when? — e.g. "August 30, 2026"]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>4. Root Cause Analysis</h2>
<h3>4.1 Fishbone (Ishikawa) Diagram — Cause Categories</h3>
<ul>
  <li><strong>Man / People:</strong> [e.g. "Operator not trained on SMED method"]</li>
  <li><strong>Machine / Equipment:</strong> [e.g. "Bolts require 14 turns to remove"]</li>
  <li><strong>Method / Process:</strong> [e.g. "No standardized changeover sequence documented"]</li>
  <li><strong>Material:</strong> [e.g. "Tools stored 15 m from station"]</li>
  <li><strong>Measurement:</strong> [e.g. "No tracking of changeover time per shift"]</li>
  <li><strong>Mother Nature / Environment:</strong> [e.g. "Poor lighting inside machine cabinet"]</li>
</ul>

<h3>4.2 5 Whys — Deep Dive on Primary Cause</h3>
<table>
  <thead>
    <tr>
      <th>Why?</th>
      <th>Answer</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Why 1:</strong> [Problem symptom]</td>
      <td>[Because ...]</td>
    </tr>
    <tr>
      <td><strong>Why 2:</strong> [First answer]</td>
      <td>[Because ...]</td>
    </tr>
    <tr>
      <td><strong>Why 3:</strong> [Second answer]</td>
      <td>[Because ...]</td>
    </tr>
    <tr>
      <td><strong>Why 4:</strong> [Third answer]</td>
      <td>[Because ...]</td>
    </tr>
    <tr>
      <td><strong>Why 5:</strong> [Fourth answer]</td>
      <td><strong>[Root cause identified]</strong></td>
    </tr>
  </tbody>
</table>

<p><strong>🔍 Root Cause:</strong> <em>[One sentence summary of the true root cause]</em></p>
<hr>

<h2>5. Proposed Countermeasures</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Countermeasure</th>
      <th>Targets Root Cause</th>
      <th>Waste Eliminated</th>
      <th>Estimated Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>[Countermeasure 1 — e.g. "Create shadow board for changeover tools at point-of-use"]</td>
      <td>Yes — motion waste</td>
      <td>Motion, Waiting</td>
      <td>−8 min</td>
    </tr>
    <tr>
      <td>2</td>
      <td>[Countermeasure 2 — e.g. "Replace bolts with quick-release clamps"]</td>
      <td>Yes — method waste</td>
      <td>Motion, Waiting</td>
      <td>−5 min</td>
    </tr>
    <tr>
      <td>3</td>
      <td>[Countermeasure 3 — e.g. "Create standardized changeover checklist with photos"]</td>
      <td>Yes — method waste</td>
      <td>Defects, Waiting</td>
      <td>−4 min</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>6. Implementation Plan</h2>
<table>
  <thead>
    <tr>
      <th>Action</th>
      <th>Owner</th>
      <th>Due Date</th>
      <th>Status</th>
      <th>Dependencies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Action 1 — e.g. Design and build tool shadow board]</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>⏳ Pending</td>
      <td>Materials ordered</td>
    </tr>
    <tr>
      <td>[Action 2 — e.g. Purchase quick-release clamps]</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>⏳ Pending</td>
      <td>Approval from maintenance budget</td>
    </tr>
    <tr>
      <td>[Action 3 — e.g. Write new changeover standard work]</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>⏳ Pending</td>
      <td>After clamps installed</td>
    </tr>
    <tr>
      <td>[Action 4 — e.g. Train operators on new method]</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>⏳ Pending</td>
      <td>After standard work written</td>
    </tr>
    <tr>
      <td>[Action 5 — e.g. Pilot and measure 10 changeovers]</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>⏳ Pending</td>
      <td>After training completed</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>7. Expected Results</h2>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Before</th>
      <th>Target (After)</th>
      <th>Improvement</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Metric 1 — e.g. Changeover time]</td>
      <td>[value]</td>
      <td>[target]</td>
      <td>[% reduction]</td>
    </tr>
    <tr>
      <td>[Metric 2 — e.g. Defect rate]</td>
      <td>[value]</td>
      <td>[target]</td>
      <td>[% reduction]</td>
    </tr>
    <tr>
      <td>[Metric 3 — e.g. Walking distance]</td>
      <td>[value]</td>
      <td>[target]</td>
      <td>[% reduction]</td>
    </tr>
  </tbody>
</table>

<h3>Estimated Financial Impact</h3>
<blockquote>
  <p><strong>Cost savings:</strong> $[estimated annual savings]</p>
  <p><strong>ROI timeframe:</strong> [e.g. "Payback within 3 months"]</p>
  <p><strong>Non-financial benefits:</strong> [e.g. "Improved ergonomics, reduced operator fatigue, standardized work"]</p>
</blockquote>
<hr>

<h2>8. Follow-up &amp; Sustainment</h2>
<h3>Verification Plan</h3>
<ul>
  <li>📊 <strong>Measure:</strong> [What metrics will be tracked and how often? — e.g. "Daily changeover time logged by operator in ERP"]</li>
  <li>👀 <strong>Visual control:</strong> [How will results be visible? — e.g. "Changeover performance board at station, updated every shift"]</li>
  <li>✅ <strong>Audit:</strong> [How will compliance be checked? — e.g. "Weekly layered process audit (LPA) of new standard work"]</li>
  <li>📋 <strong>Standardize:</strong> [How will the new method be documented? — e.g. "Update work instruction WI-012 and standard work SW-012"]</li>
  <li>🔄 <strong>Review:</strong> [When will effectiveness be reviewed? — e.g. "30/60/90 day reviews with team"]</li>
</ul>

<h3>Sustainment Checklist</h3>
<ul>
  <li>⬜ Standard work updated and posted at station</li>
  <li>⬜ All operators trained and signed off</li>
  <li>⬜ Tools / equipment in place (shadow board, fixtures, etc.)</li>
  <li>⬜ Visual controls installed (scoreboard, andon, etc.)</li>
  <li>⬜ Metrics baseline captured and displayed</li>
  <li>⬜ Audit schedule defined</li>
  <li>⬜ Escalation path defined if results regress</li>
</ul>
<hr>

<h2>9. Approval &amp; Sign-off</h2>
<table>
  <thead>
    <tr>
      <th>Role</th>
      <th>Name</th>
      <th>Date</th>
      <th>Signature</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Submitted By</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>—</td>
    </tr>
    <tr>
      <td>Team Leader / Supervisor</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>—</td>
    </tr>
    <tr>
      <td>Manager Review</td>
      <td>[Name]</td>
      <td>[Date]</td>
      <td>—</td>
    </tr>
  </tbody>
</table>

<p><em>This template follows the Toyota Production System A3 Problem-Solving methodology (PDCA: Plan-Do-Check-Act).</em></p>
`.trim();
}

/**
 * A shorter, simpler template for quick Kaizen suggestions
 * — ideal for front-line operators submitting daily ideas.
 */
export function generateQuickSuggestionTemplate(): string {
  return `
<h1>Kaizen Suggestion — Quick Idea</h1>
<hr>

<h2>1. The Problem / Pain Point</h2>
<blockquote>
  <p><em>[In one or two sentences, describe what is broken, frustrating, or wasteful. Which of the 8 wastes does it relate to?]</em></p>
  <p><strong>Example:</strong> "I spend 3 minutes every shift walking to the tool crib to get a hex key because there is no set at my station."</p>
</blockquote>
<hr>

<h2>2. The Proposed Solution</h2>
<blockquote>
  <p><em>[Describe your suggestion — what should change? Keep it simple and actionable.]</em></p>
  <p><strong>Example:</strong> "Create a shadow board at Station 12 with the 5 most commonly used tools so operators don't have to leave the line."</p>
</blockquote>
<hr>

<h2>3. Expected Benefit</h2>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>⏱️ Time saved</strong></td>
      <td>[e.g. 6 min/shift]</td>
    </tr>
    <tr>
      <td><strong>💰 Cost impact</strong></td>
      <td>[e.g. Low — shadow board materials ~$50]</td>
    </tr>
    <tr>
      <td><strong>🛡️ Safety improvement</strong></td>
      <td>[e.g. Reduces walking on wet floor area]</td>
    </tr>
    <tr>
      <td><strong>✅ Quality improvement</strong></td>
      <td>[e.g. Ensures correct torque every time]</td>
    </tr>
    <tr>
      <td><strong>📦 Waste eliminated</strong></td>
      <td>[Motion, Waiting]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>4. Implementation</h2>
<p><strong>What is needed:</strong> [e.g. "Pegboard, tool holders, labels — available from maintenance stores"]</p>
<p><strong>Who can do it:</strong> [e.g. "Maintenance team can install in 30 min"]</p>
<p><strong>Estimated effort:</strong> [e.g. "30 minutes + $50 materials"]</p>
<hr>

<h2>5. Before vs. After</h2>
<table>
  <thead>
    <tr>
      <th>Before</th>
      <th>After (Expected)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Describe current situation]</td>
      <td>[Describe improved situation]</td>
    </tr>
  </tbody>
</table>

<p><em>Submitted as a quick Kaizen idea — ready for rapid implementation.</em></p>
`.trim();
}
