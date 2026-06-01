/**
 * Lean Manufacturing Work Instruction Template
 *
 * Based on the Toyota Production System (TPS) Standardized Work model and
 * TWI (Training Within Industry) Job Instruction method — the most widely
 * accepted standards for lean work instructions in manufacturing.
 *
 * Key components:
 * - Operation header (name, number, station, product)
 * - Safety & Quality cues (PPE, quality checkpoints)
 * - Required tools, materials, fixtures
 * - Step-by-step sequence with Key Points (the "tricks of the trade")
 * - Takt time / cycle time reference
 * - Revision / change log
 */

export function generateWorkInstructionTemplate(): string {
  return `
<h1>Work Instruction</h1>
<hr>

<h2>1. Operation Information</h2>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Operation Name</strong></td>
      <td>[Enter operation name]</td>
    </tr>
    <tr>
      <td><strong>Operation Number</strong></td>
      <td>[Enter operation number]</td>
    </tr>
    <tr>
      <td><strong>Station / Work Area</strong></td>
      <td>[Enter station or cell]</td>
    </tr>
    <tr>
      <td><strong>Product / Model</strong></td>
      <td>[Enter product or model]</td>
    </tr>
    <tr>
      <td><strong>Takt Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Cycle Time (target)</strong></td>
      <td>[seconds]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>2. Safety &amp; Quality</h2>
<h3>Required PPE</h3>
<ul>
  <li>[PPE item 1]</li>
  <li>[PPE item 2]</li>
  <li>[PPE item 3]</li>
</ul>
<h3>Quality Checkpoints</h3>
<ul>
  <li>[Checkpoint 1 — e.g. visual inspection before step 3]</li>
  <li>[Checkpoint 2]</li>
</ul>
<h3>⚠️ Critical Safety Notes</h3>
<blockquote>
  <p>[Important safety warning — e.g. machine must be locked out before cleaning]</p>
</blockquote>
<hr>

<h2>3. Required Items</h2>
<h3>Tools &amp; Fixtures</h3>
<ul>
  <li>[Tool / fixture 1]</li>
  <li>[Tool / fixture 2]</li>
  <li>[Tool / fixture 3]</li>
</ul>
<h3>Materials &amp; Parts</h3>
<ul>
  <li>[Material / part number 1]</li>
  <li>[Material / part number 2]</li>
</ul>
<hr>

<h2>4. Step-by-Step Sequence</h2>
<ol>
  <li>
    <p><strong>[Step 1 — Action]</strong></p>
    <p><em>Key Point:</em> [Tip for quality, safety, or ease]</p>
    <p><em>Why:</em> [Reason — why this matters]</p>
  </li>
  <li>
    <p><strong>[Step 2 — Action]</strong></p>
    <p><em>Key Point:</em> [Tip for quality, safety, or ease]</p>
    <p><em>Why:</em> [Reason — why this matters]</p>
  </li>
  <li>
    <p><strong>[Step 3 — Action]</strong></p>
    <p><em>Key Point:</em> [Tip for quality, safety, or ease]</p>
    <p><em>Why:</em> [Reason — why this matters]</p>
  </li>
  <li>
    <p><strong>[Step 4 — Action]</strong></p>
    <p><em>Key Point:</em> [Tip for quality, safety, or ease]</p>
    <p><em>Why:</em> [Reason — why this matters]</p>
  </li>
  <li>
    <p><strong>[Step 5 — Action]</strong></p>
    <p><em>Key Point:</em> [Tip for quality, safety, or ease]</p>
    <p><em>Why:</em> [Reason — why this matters]</p>
  </li>
</ol>
<hr>

<h2>5. Standards Reference</h2>
<table>
  <thead>
    <tr>
      <th>Standard</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Standard Work Combination Sheet</td>
      <td>[SWCS reference]</td>
    </tr>
    <tr>
      <td>Process Capacity Sheet</td>
      <td>[PCS reference]</td>
    </tr>
    <tr>
      <td>Job Element Sheet</td>
      <td>[JES reference]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>6. Revision History</h2>
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
