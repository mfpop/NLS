/**
 * Lean Manufacturing Procedure Template
 *
 * Based on the ISO 9001:2015 documented information requirements (clause 7.5)
 * combined with the TWI (Training Within Industry) Job Instruction method —
 * the most widely adopted standard for procedure writing in lean manufacturing.
 *
 * This template follows the "TWI Job Breakdown Sheet" structure:
 * - Important Steps (What to do)
 * - Key Points (How to do it well — quality, safety, ease)
 * - Reasons (Why it matters)
 *
 * Additional ISO 9001 elements:
 * - Purpose, Scope, Definitions
 * - Responsibilities
 * - Reference documents
 * - Records management
 */

export function generateProcedureTemplate(): string {
  return `
<h1>Procedure</h1>
<hr>

<h2>1. Purpose</h2>
<blockquote>
  <p>[State the purpose of this procedure — what it accomplishes and why it exists]</p>
  <p><em>Example: "This procedure defines the standard method for performing preventative maintenance on hydraulic presses to ensure equipment reliability and operator safety."</em></p>
</blockquote>
<hr>

<h2>2. Scope</h2>
<p>This procedure applies to:</p>
<ul>
  <li>[Area / department / process where this procedure applies]</li>
  <li>[Personnel roles covered by this procedure]</li>
  <li>[Equipment / systems within scope]</li>
  <li>[Explicit exclusions, if any]</li>
</ul>
<hr>

<h2>3. Definitions &amp; Abbreviations</h2>
<table>
  <thead>
    <tr>
      <th>Term</th>
      <th>Definition</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Term 1]</td>
      <td>[Definition]</td>
    </tr>
    <tr>
      <td>[Term 2]</td>
      <td>[Definition]</td>
    </tr>
    <tr>
      <td>[Abbreviation]</td>
      <td>[Full name / meaning]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>4. Responsibilities</h2>
<table>
  <thead>
    <tr>
      <th>Role</th>
      <th>Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Operator</strong></td>
      <td>Perform procedure steps as defined; report abnormalities; maintain training currency</td>
    </tr>
    <tr>
      <td><strong>Team Leader / Supervisor</strong></td>
      <td>Verify execution; provide resources; ensure compliance</td>
    </tr>
    <tr>
      <td><strong>Maintenance Technician</strong></td>
      <td>[If applicable — e.g. perform calibration, repairs]</td>
    </tr>
    <tr>
      <td><strong>Quality Inspector</strong></td>
      <td>[If applicable — verify quality checkpoints]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>5. Prerequisites &amp; Safety</h2>
<h3>Required Items Before Starting</h3>
<ul>
  <li>[Required training / certification]</li>
  <li>[Required PPE]</li>
  <li>[Required tools / equipment]</li>
  <li>[Required forms / systems access]</li>
  <li>[Lockout / Tagout required? ⚠️]</li>
</ul>

<h3>Safety &amp; Environmental Precautions</h3>
<blockquote>
  <p>⚠️ <strong>[Critical safety warning — e.g. "Lockout/Tagout must be verified before opening guards"]</strong></p>
</blockquote>
<ul>
  <li>[Precaution 1]</li>
  <li>[Precaution 2]</li>
  <li>[Emergency stop location]</li>
  <li>[Spill / waste containment procedure]</li>
</ul>
<hr>

<h2>6. Procedure Steps</h2>
<p><em>Each step follows the TWI method: <strong>Important Step</strong> → <strong>Key Point</strong> → <strong>Reason</strong></em></p>

<h3>6.1 Preparation</h3>
<table>
  <thead>
    <tr>
      <th style="width:40px">Step</th>
      <th>Action</th>
      <th>Key Point</th>
      <th>Reason</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>[Action — e.g. Verify machine is in safe state]</td>
      <td>[Key point — e.g. Check maintenance tag is current]</td>
      <td>[Reason — e.g. Prevents unexpected startup]</td>
    </tr>
    <tr>
      <td>2</td>
      <td>[Action — e.g. Gather required materials]</td>
      <td>[Key point — e.g. Confirm against BOM]</td>
      <td>[Reason — e.g. Ensures correct materials used]</td>
    </tr>
  </tbody>
</table>

<h3>6.2 Execution</h3>
<table>
  <thead>
    <tr>
      <th style="width:40px">Step</th>
      <th>Action</th>
      <th>Key Point</th>
      <th>Reason</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>3</td>
      <td>[Action — e.g. Load part into fixture]</td>
      <td>[Key point — e.g. Align to datum pins]</td>
      <td>[Reason — e.g. Ensures repeatable positioning ±0.1mm]</td>
    </tr>
    <tr>
      <td>4</td>
      <td>[Action — e.g. Start cycle]</td>
      <td>[Key point — e.g. Both hands on start buttons]</td>
      <td>[Reason — e.g. Keeps hands clear of pinch point]</td>
    </tr>
    <tr>
      <td>5</td>
      <td>[Action — e.g. Inspect after cycle]</td>
      <td>[Key point — e.g. Check surface finish against limit sample]</td>
      <td>[Reason — e.g. Catches tool wear early]</td>
    </tr>
    <tr>
      <td>6</td>
      <td>[Action — e.g. Record inspection result]</td>
      <td>[Key point — e.g. Use correct control plan format]</td>
      <td>[Reason — e.g. Provides traceability per ISO 9001]</td>
    </tr>
  </tbody>
</table>

<h3>6.3 Completion &amp; Handoff</h3>
<table>
  <thead>
    <tr>
      <th style="width:40px">Step</th>
      <th>Action</th>
      <th>Key Point</th>
      <th>Reason</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>7</td>
      <td>[Action — e.g. Label and segregate completed parts]</td>
      <td>[Key point — e.g. Use correct lot number]</td>
      <td>[Reason — e.g. Enables full traceability]</td>
    </tr>
    <tr>
      <td>8</td>
      <td>[Action — e.g. Complete production log]</td>
      <td>[Key point — e.g. Record downtime reason if any]</td>
      <td>[Reason — e.g. Supports OEE tracking]</td>
    </tr>
    <tr>
      <td>9</td>
      <td>[Action — e.g. Clean workstation]</td>
      <td>[Key point — e.g. Return tools to shadow board]</td>
      <td>[Reason — e.g. 5S standard, ready for next shift]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>7. Quality &amp; Acceptance Criteria</h2>
<h3>7.1 Critical Characteristics</h3>
<ul>
  <li>[Characteristic 1 — tolerance / specification]</li>
  <li>[Characteristic 2 — tolerance / specification]</li>
  <li>[Characteristic 3 — tolerance / specification]</li>
</ul>

<h3>7.2 Inspection &amp; Testing</h3>
<table>
  <thead>
    <tr>
      <th>Checkpoint</th>
      <th>Frequency</th>
      <th>Method / Tool</th>
      <th>Acceptance Criteria</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Checkpoint 1]</td>
      <td>[Every cycle / every nth]</td>
      <td>[Visual / gauge / CMM]</td>
      <td>[Specification]</td>
    </tr>
    <tr>
      <td>[Checkpoint 2]</td>
      <td>[First-off / patrol]</td>
      <td>[Tool]</td>
      <td>[Specification]</td>
    </tr>
    <tr>
      <td>[Checkpoint 3]</td>
      <td>[Last-off]</td>
      <td>[Tool]</td>
      <td>[Specification]</td>
    </tr>
  </tbody>
</table>

<h3>7.3 Non-Conformance Handling</h3>
<blockquote>
  <p>[Procedure for handling non-conforming output — e.g. "Tag with red NCR tag, segregate in designated area, notify supervisor"]</p>
</blockquote>
<hr>

<h2>8. Records &amp; Documentation</h2>
<table>
  <thead>
    <tr>
      <th>Record</th>
      <th>Format</th>
      <th>Retention</th>
      <th>Location</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Production log]</td>
      <td>[Paper / digital / ERP]</td>
      <td>[Duration]</td>
      <td>[File location / system]</td>
    </tr>
    <tr>
      <td>[Inspection report]</td>
      <td>[Format]</td>
      <td>[Duration]</td>
      <td>[File location / system]</td>
    </tr>
    <tr>
      <td>[Maintenance record]</td>
      <td>[Format]</td>
      <td>[Duration]</td>
      <td>[File location / system]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>9. Reference Documents</h2>
<ul>
  <li>[Referenced standard / work instruction / drawing]</li>
  <li>[Related procedure number]</li>
  <li>[Regulatory or ISO clause reference]</li>
  <li>[Training material reference]</li>
</ul>
<hr>

<h2>10. Revision History</h2>
<table>
  <thead>
    <tr>
      <th>Rev</th>
      <th>Date</th>
      <th>Change Description</th>
      <th>Author</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1.0</td>
      <td>[Date]</td>
      <td>Initial release</td>
      <td>[Author]</td>
    </tr>
  </tbody>
</table>
`.trim();
}
