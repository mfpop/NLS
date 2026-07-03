// ── VSM material flow symbol components ──
// Pure SVG — no business logic, no dependencies on template types

interface IconProps {
  x: number;
  y: number;
  label?: string | null;
  size?: number;
}

/**
 * Shipment truck icon — used at Supplier→RM and FG→Customer endpoints.
 */
export function VsmTruckIcon({ x, y, label, size = 28 }: IconProps) {
  const cabW = size * 0.55;
  const bedW = size * 0.55;
  const bedH = size * 0.45;
  const cabH = size * 0.55;
  const wheelR = size * 0.14;
  const bedX = x;
  const bedY = y + size - bedH;
  const cabX = bedX + bedW - cabW * 0.3;
  const cabY = y + size - cabH;

  return (
    <g>
      {/* Truck bed */}
      <rect x={bedX} y={bedY} width={bedW} height={bedH}
        fill="#f8fafc" stroke="#334155" strokeWidth={1.5} rx={2} />
      {/* Cab */}
      <rect x={cabX} y={cabY} width={cabW} height={cabH}
        fill="#f8fafc" stroke="#334155" strokeWidth={1.5} rx={2} />
      {/* Cab roof */}
      <line x1={cabX + 2} y1={cabY} x2={cabX + cabW - 2} y2={cabY}
        stroke="#334155" strokeWidth={1.5} />
      {/* Windshield */}
      <rect x={cabX + 3} y={cabY + 4} width={cabW - 6} height={cabH * 0.4}
        fill="#dbeafe" stroke="#93c5fd" strokeWidth={0.5} rx={1} />
      {/* Wheels */}
      <circle cx={bedX + bedW * 0.3} cy={y + size} r={wheelR}
        fill="#1e293b" />
      <circle cx={cabX + cabW * 0.6} cy={y + size} r={wheelR}
        fill="#1e293b" />
      {/* Delivery label */}
      {label && (
        <text x={x + size * 0.5} y={y - 4}
          textAnchor="middle" className="text-[12px] font-bold" fill="#475569">
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Supermarket symbol — open shelving unit with three shelves.
 * Placed on the material flow line where a pull system exists.
 */
export function VsmSupermarketSymbol({ x, y, size = 32 }: IconProps) {
  const shelfY1 = y - size / 2;
  const shelfY2 = y + size / 2;
  const shelfX1 = x - size / 2;
  const shelfX2 = x + size / 2;
  const shelfCount = 3;
  const shelfGap = (shelfY2 - shelfY1) / shelfCount;

  return (
    <g>
      {/* Outer frame (open top — no top line) */}
      <rect x={shelfX1} y={shelfY1} width={size} height={size}
        fill="#fffbeb" stroke="#d97706" strokeWidth={1.8}
        rx={3} />
      {/* Shelf lines */}
      {Array.from({ length: shelfCount - 1 }, (_, i) => {
        const sy = shelfY1 + (i + 1) * shelfGap;
        return (
          <line key={`sh-${i}`}
            x1={shelfX1 + 4} y1={sy}
            x2={shelfX2 - 4} y2={sy}
            stroke="#d97706" strokeWidth={1.2} />
        );
      })}
      {/* "S" label */}
      <text x={x} y={y + 4}
        textAnchor="middle" className="text-[17px] font-extrabold" fill="#d97706">
        S
      </text>
    </g>
  );
}

/**
 * FIFO lane symbol — a box with arrow-through and "FIFO" label.
 * Placed on the material flow line where FIFO sequencing applies.
 */
export function VsmFifoLaneSymbol({ x, y, size = 28 }: IconProps) {
  const half = size / 2;
  const x1 = x - half;
  const x2 = x + half;
  const y1 = y - half;

  return (
    <g>
      <rect x={x1} y={y1} width={size} height={size}
        fill="#f0fdf4" stroke="#16a34a" strokeWidth={1.8} rx={3} />
      {/* Arrow through the box */}
      <line x1={x1 + 4} y1={y} x2={x2 - 4} y2={y}
        stroke="#16a34a" strokeWidth={1.5}
        markerEnd="url(#arr-fifo-sym)" />
      <text x={x} y={y + 4}
        textAnchor="middle" className="text-[13px] font-extrabold" fill="#16a34a">
        FIFO
      </text>
    </g>
  );
}

/**
 * Kanban signal symbol — a card/rectangle with a signal triangle.
 * Placed on the material flow line where kanban pull signals operate.
 */
export function VsmKanbanSymbol({ x, y, size = 26 }: IconProps) {
  const half = size / 2;
  const x1 = x - half;
  const y1 = y - half;
  const y2 = y + half;

  return (
    <g>
      <rect x={x1} y={y1} width={size} height={size * 0.7}
        fill="#fffbeb" stroke="#d97706" strokeWidth={1.5} rx={2} />
      {/* Kanban signal triangle */}
      <polygon
        points={`${x},${y2 - 2} ${x - 5},${y2 - 10} ${x + 5},${y2 - 10}`}
        fill="#f59e0b" />
      {/* "K" label */}
      <text x={x} y={y1 + size * 0.42}
        textAnchor="middle" className="text-[14px] font-extrabold" fill="#d97706">
        K
      </text>
    </g>
  );
}
