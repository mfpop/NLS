/**
 * Lean Manufacturing Standard Work Template
 *
 * Based on the Toyota Production System (TPS) Standardized Work framework —
 * the single most widely accepted standard work methodology in manufacturing.
 *
 * Core documents covered by this template:
 * - Standard Work Combination Sheet (SWCS) — operator + machine time
 * - Standard Operations Routine (SOR) — sequence of manual steps
 * - Takt time / Cycle time / Standard WIP calculation
 * - Yamazumi (workload balancing) elements
 *
 * Key components:
 * - Header: product, station, line, takt time, cycle time, standard WIP
 * - Work sequence with step time (manual + machine + walk)
 * - Cumulative time / takt comparison
 * - Standard WIP specification
 * - Quality checks and safety embedded in sequence
 * - Capacity summary
 */

export function generateStandardWorkTemplate(): string {
  return `
<h1>Standard Work</h1>
<hr>

<h2>1. Process Identification</h2>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Part / Product</strong></td>
      <td>[Enter part number or product name]</td>
    </tr>
    <tr>
      <td><strong>Process / Station</strong></td>
      <td>[Enter process or station name]</td>
    </tr>
    <tr>
      <td><strong>Production Line</strong></td>
      <td>[Enter line or cell name]</td>
    </tr>
    <tr>
      <td><strong>Document Ref.</strong></td>
      <td>[SWCS / SOR reference number]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>2. Time Standards</h2>
<table>
  <thead>
    <tr>
      <th>Standard</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Customer Takt Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Manual Cycle Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Machine Cycle Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Total Cycle Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Walk / Transport Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Standard WIP</strong></td>
      <td>[quantity]</td>
    </tr>
    <tr>
      <td><strong>Shift Duration (net)</strong></td>
      <td>[minutes]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>3. Work Sequence</h2>
<p><em>Numbered steps performed by the operator in sequence, with time breakdowns.</em></p>
<table>
  <thead>
    <tr>
      <th>Step</th>
      <th>Work Element</th>
      <th>Manual (sec)</th>
      <th>Machine (sec)</th>
      <th>Walk (sec)</th>
      <th>Cumulative (sec)</th>
      <th>Quality Check / ⚠️ Safety</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>[Pick raw material from inbound rack]</td>
      <td>3</td>
      <td>—</td>
      <td>2</td>
      <td>5</td>
      <td>—</td>
    </tr>
    <tr>
      <td>2</td>
      <td>[Load part into fixture]</td>
      <td>4</td>
      <td>—</td>
      <td>—</td>
      <td>9</td>
      <td>⚠️ Lockout before loading</td>
    </tr>
    <tr>
      <td>3</td>
      <td>[Start machining cycle]</td>
      <td>1</td>
      <td>15</td>
      <td>—</td>
      <td>10 / 25</td>
      <td>✅ Inspect edge finish</td>
    </tr>
    <tr>
      <td>4</td>
      <td>[Unload and deburr]</td>
      <td>5</td>
      <td>—</td>
      <td>—</td>
      <td>30</td>
      <td>✅ CMM check every 20th</td>
    </tr>
    <tr>
      <td>5</td>
      <td>[Place on outbound FIFO rack]</td>
      <td>2</td>
      <td>—</td>
      <td>2</td>
      <td>34</td>
      <td>—</td>
    </tr>
  </tbody>
</table>
<p><em>Note: Blue cells = machine auto-time. Cumulative shows manual / total.</em></p>
<hr>

<h2>4. Standard WIP (SWIP)</h2>
<table>
  <thead>
    <tr>
      <th>Location</th>
      <th>Description</th>
      <th>Max Qty</th>
      <th>Container Type</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Inbound</td>
      <td>[Inbound buffer — raw material]</td>
      <td>[qty]</td>
      <td>[e.g. pallet, tote]</td>
    </tr>
    <tr>
      <td>In-Process</td>
      <td>[Between stations]</td>
      <td>[qty]</td>
      <td>[e.g. 1-piece flow, small lot]</td>
    </tr>
    <tr>
      <td>Outbound</td>
      <td>[Finished good buffer]</td>
      <td>[qty]</td>
      <td>[e.g. standard container]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>5. Yamazumi (Workload Balance)</h2>
<table>
  <thead>
    <tr>
      <th>Work Element</th>
      <th>Time (sec)</th>
      <th>% of Takt</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Element name]</td>
      <td>[time]</td>
      <td>[%]</td>
    </tr>
    <tr>
      <td>[Element name]</td>
      <td>[time]</td>
      <td>[%]</td>
    </tr>
    <tr>
      <td>[Element name]</td>
      <td>[time]</td>
      <td>[%]</td>
    </tr>
    <tr>
      <td><strong>Total</strong></td>
      <td><strong>[total sec]</strong></td>
      <td><strong>[% of takt]</strong></td>
    </tr>
  </tbody>
</table>
<p><em>Takt time = [seconds]. Target: total cycle ≤ 95% of takt.</em></p>
<hr>

<h2>6. Standard Work In-Process / Layout</h2>
<blockquote>
  <p><strong>Cell Layout Sketch</strong></p>
  <p>[Describe or embed layout sketch — machine positions, operator walk path, material in/out points]</p>
  <p>Operator walk path length: [meters]</p>
  <p>Number of operators in cell: [n]</p>
</blockquote>
<hr>

<h2>7. Skills &amp; Training Matrix</h2>
<table>
  <thead>
    <tr>
      <th>Station / Step</th>
      <th>Skill Level Required</th>
      <th>Certification Needed</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Station / step]</td>
      <td>[Beginner / Intermediate / Expert]</td>
      <td>[Certification name]</td>
    </tr>
    <tr>
      <td>[Station / step]</td>
      <td>[Beginner / Intermediate / Expert]</td>
      <td>[Certification name]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>8. Revision History</h2>
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
