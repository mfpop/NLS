/**
 * Lean Manufacturing Material Flow Standard Template
 *
 * Based on the Toyota Production System Material & Information Flow standard
 * and widely adopted lean logistics principles:
 * - Material flow diagrams (spaghetti charts)
 * - Pull system / kanban circuit design
 * - FIFO lane and supermarket sizing
 * - Delivery route and pitch calculation
 * - Material presentation standards (point-of-use)
 *
 * Key components:
 * - Header: product, line, region, flow type (push / pull / FIFO)
 * - Material flow diagram description
 * - Kanban circuit specifications
 * - FIFO lane sizing
 * - Supermarket / buffer sizing
 * - Delivery route with pitch
 * - Material presentation standards
 */

export function generateMaterialFlowStandardTemplate(): string {
  return `
<h1>Material Flow Standard</h1>
<hr>

<h2>1. General Information</h2>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Part / Product Family</strong></td>
      <td>[Enter part number or product family]</td>
    </tr>
    <tr>
      <td><strong>Production Line / Cell</strong></td>
      <td>[Enter line or cell name]</td>
    </tr>
    <tr>
      <td><strong>Flow Zone / Area</strong></td>
      <td>[Receiving / WIP / Shipping / Point-of-Use]</td>
    </tr>
    <tr>
      <td><strong>Flow Control Type</strong></td>
      <td>[Pull (Kanban) / Push / FIFO Lane / Supermarket]</td>
    </tr>
    <tr>
      <td><strong>Customer (downstream)</strong></td>
      <td>[Next process / external customer]</td>
    </tr>
    <tr>
      <td><strong>Supplier (upstream)</strong></td>
      <td>[Previous process / external supplier]</td>
    </tr>
    <tr>
      <td><strong>Document Ref.</strong></td>
      <td>[Material flow standard reference]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>2. Demand &amp; Consumption Data</h2>
<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Daily Customer Demand</strong></td>
      <td>[units/day]</td>
    </tr>
    <tr>
      <td><strong>Takt Time</strong></td>
      <td>[seconds]</td>
    </tr>
    <tr>
      <td><strong>Container Quantity</strong></td>
      <td>[units per container]</td>
    </tr>
    <tr>
      <td><strong>Pitch (replenishment interval)</strong></td>
      <td>[minutes]</td>
    </tr>
    <tr>
      <td><strong>Consumption Rate</strong></td>
      <td>[containers / hour]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>3. Material Flow Path</h2>
<h3>3.1 Route Description</h3>
<blockquote>
  <p><strong>Flow Path Diagram Description</strong></p>
  <p>[Describe the material flow path — e.g. "Material arrives at receiving dock A, moves to bulk storage in aisle B05, then to supermarket C in zone 3, then via milkrun route R7 to point-of-use at line 4, station 12."]</p>
  <p>Total travel distance: [meters]</p>
  <p>Number of hand-offs: [n]</p>
</blockquote>

<h3>3.2 Transport Method</h3>
<table>
  <thead>
    <tr>
      <th>Segment</th>
      <th>From</th>
      <th>To</th>
      <th>Method</th>
      <th>Frequency</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>[Receiving]</td>
      <td>[Bulk storage]</td>
      <td>[Forklift / pallet jack]</td>
      <td>[Per shipment]</td>
    </tr>
    <tr>
      <td>2</td>
      <td>[Bulk storage]</td>
      <td>[Supermarket]</td>
      <td>[Forklift / tugger]</td>
      <td>[Every X hours]</td>
    </tr>
    <tr>
      <td>3</td>
      <td>[Supermarket]</td>
      <td>[Point-of-use]</td>
      <td>[Milkrun / tugger train]</td>
      <td>[Every Y minutes]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>4. Pull System &amp; Kanban Specification</h2>
<h3>4.1 Kanban Circuit</h3>
<table>
  <thead>
    <tr>
      <th>Element</th>
      <th>Specification</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Kanban Type</strong></td>
      <td>[Production / Withdrawal / Signal / e-Kanban]</td>
    </tr>
    <tr>
      <td><strong>Card / Signal Format</strong></td>
      <td>[Physical card / barcode / RFID / electronic]</td>
    </tr>
    <tr>
      <td><strong>Number of Cards in Circuit</strong></td>
      <td>[n cards]</td>
    </tr>
    <tr>
      <td><strong>Replenishment Lead Time</strong></td>
      <td>[minutes]</td>
    </tr>
    <tr>
      <td><strong>Safety Factor</strong></td>
      <td>[% or quantity]</td>
    </tr>
    <tr>
      <td><strong>Container Capacity</strong></td>
      <td>[units]</td>
    </tr>
  </tbody>
</table>

<h3>4.2 Signal / Withdrawal Kanban Detail</h3>
<table>
  <thead>
    <tr>
      <th>Part #</th>
      <th>Card Qty</th>
      <th>Container Qty</th>
      <th>Min Stock</th>
      <th>Max Stock</th>
      <th>Reorder Point</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Part #1]</td>
      <td>[cards]</td>
      <td>[units]</td>
      <td>[qty]</td>
      <td>[qty]</td>
      <td>[qty]</td>
    </tr>
    <tr>
      <td>[Part #2]</td>
      <td>[cards]</td>
      <td>[units]</td>
      <td>[qty]</td>
      <td>[qty]</td>
      <td>[qty]</td>
    </tr>
    <tr>
      <td>[Part #3]</td>
      <td>[cards]</td>
      <td>[units]</td>
      <td>[qty]</td>
      <td>[qty]</td>
      <td>[qty]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>5. FIFO Lane Specification</h2>
<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Location</strong></td>
      <td>[Between which processes]</td>
    </tr>
    <tr>
      <td><strong>Lane Type</strong></td>
      <td>[Physical lane / gravity rack / floor-marked / WIP cart]</td>
    </tr>
    <tr>
      <td><strong>Max Capacity</strong></td>
      <td>[containers]</td>
    </tr>
    <tr>
      <td><strong>Trigger (FIFO full)</strong></td>
      <td>[Action when full — e.g. upstream stops]</td>
    </tr>
    <tr>
      <td><strong>Trigger (FIFO empty)</strong></td>
      <td>[Action when empty — e.g. no downstream starts]</td>
    </tr>
    <tr>
      <td><strong>Andon / Visual Alert</strong></td>
      <td>[Type of visual signal when limits reached]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>6. Supermarket / Buffer Sizing</h2>
<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Supermarket Location</strong></td>
      <td>[Zone / aisle]</td>
    </tr>
    <tr>
      <td><strong>Storage Method</strong></td>
      <td>[Flow rack / shelving / pallet rack]</td>
    </tr>
    <tr>
      <td><strong>Total Stock (max)</strong></td>
      <td>[units or containers]</td>
    </tr>
    <tr>
      <td><strong>Total Stock (min)</strong></td>
      <td>[units or containers]</td>
    </tr>
    <tr>
      <td><strong>Replenishment Lead Time</strong></td>
      <td>[minutes]</td>
    </tr>
    <tr>
      <td><strong>Pitch Quantity</strong></td>
      <td>[containers per pitch interval]</td>
    </tr>
    <tr>
      <td><strong>Floor Space</strong></td>
      <td>[m²]</td>
    </tr>
  </tbody>
</table>
<hr>

<h2>7. Material Presentation Standard</h2>
<h3>7.1 Point-of-Use Requirements</h3>
<ul>
  <li><strong>Container type:</strong> [e.g. standard returnable, cardboard, wire basket]</li>
  <li><strong>Container orientation:</strong> [e.g. label facing out, same side up]</li>
  <li><strong>Presentation height:</strong> [e.g. between knee and shoulder — ergonomic zone]</li>
  <li><strong>Label position:</strong> [e.g. left front corner, 1200 mm from floor]</li>
  <li><strong>Min / Max stock levels marked:</strong> [Yes / No — with color-coded lines]</li>
  <li><strong>Empty container return flow:</strong> [e.g. return chute below workstation]</li>
</ul>

<h3>7.2 Waste Reduction</h3>
<ul>
  <li>✅ Operator does not reach more than [cm] for material</li>
  <li>✅ No bending below knee or reaching above shoulder for heavy items</li>
  <li>✅ Material presentation matches pick sequence (first-used = closest)</li>
  <li>✅ No double handling — material placed once at point-of-use</li>
</ul>
<hr>

<h2>8. Delivery Route / Milkrun Standard</h2>
<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Route Name / Number</strong></td>
      <td>[Route ID]</td>
    </tr>
    <tr>
      <td><strong>Vehicle Type</strong></td>
      <td>[Tugger train / forklift / hand cart]</td>
    </tr>
    <tr>
      <td><strong>Route Length</strong></td>
      <td>[meters]</td>
    </tr>
    <tr>
      <td><strong>Stops</strong></td>
      <td>[List all stops in sequence]</td>
    </tr>
    <tr>
      <td><strong>Pitch Interval</strong></td>
      <td>[every X minutes]</td>
    </tr>
    <tr>
      <td><strong>Number of Pitches per Route</strong></td>
      <td>[n]</td>
    </tr>
    <tr>
      <td><strong>Cycle Time (full loop)</strong></td>
      <td>[minutes]</td>
    </tr>
    <tr>
      <td><strong>Driver / Operator</strong></td>
      <td>[Role]</td>
    </tr>
  </tbody>
</table>

<h3>8.1 Route Sequence</h3>
<ol>
  <li><strong>Stop 1</strong> — [Supermarket — pick set]</li>
  <li><strong>Stop 2</strong> — [Line 1, Station A — deliver, pick up empties]</li>
  <li><strong>Stop 3</strong> — [Line 1, Station C — deliver, pick up empties]</li>
  <li><strong>Stop 4</strong> — [Line 2, Station B — deliver, pick up empties]</li>
  <li><strong>Stop 5</strong> — [Return to supermarket with empties]</li>
</ol>
<hr>

<h2>9. Visual Controls &amp; Andon</h2>
<ul>
  <li><strong>Stock level indicators:</strong> [Min / max floor marks, color zones on rack]</li>
  <li><strong>Kanban post / board:</strong> [Location and type]</li>
  <li><strong>First-in-first-out signals:</strong> [Arrow markers, load/unload sides marked]</li>
  <li><strong>Abnormal conditions trigger:</strong> [What happens at min/max limits — andon light, buzzer, email alert]</li>
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
