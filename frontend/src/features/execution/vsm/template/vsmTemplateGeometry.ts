// ── Pure layout geometry — no business logic ──

// Internal coordinate system (used for all layout calculations)
export const CANVAS_W = 2400;

// Tight VSM content viewBox (used for Fit mode — crops empty space around actual content)
export const VSM_VIEW_X = 4;
export const VSM_VIEW_Y = 25;
export const VSM_VIEW_W = 2396;

// ── Vertical spacing balance constants ──
// All Y positions below are derived from these equalized gaps.
//
// Rules:
//   TOP_OUTER_GAP === TIMELINE_TO_FOOTER_GAP
//   PC_TO_PROCESS_GAP === PROCESS_TO_TIMELINE_GAP
export const TOP_OUTER_GAP = 25;
export const PC_TO_PROCESS_GAP = 318;   // +70%→+145% over original 130 (was 265, now another +20%)
export const PROCESS_TO_TIMELINE_GAP = 210;  // +100%→0% over previous 140, then −25% = 210
export const TIMELINE_TO_FOOTER_GAP = 25;

// Supplier / Customer
export const FAC_W = 155;
export const FAC_H = 90;
export const FAC_X = 24;
export const FAC_Y = 55;
export const FAC_CUST_X = CANVAS_W - FAC_W - 24;
export const FAC_CUST_Y = 55;
export const SUP_RIGHT = FAC_X + FAC_W;
export const SUP_CX = FAC_X + FAC_W / 2;
export const SUP_BOTTOM = FAC_Y + FAC_H;
export const CUST_LEFT = FAC_CUST_X;
export const CUST_CX = FAC_CUST_X + FAC_W / 2;
export const CUST_BOTTOM = FAC_CUST_Y + FAC_H;

// Production Control — Y derived from TOP_OUTER_GAP
export const PC_W = 300;           // +15% from 260 for better text fit
export const PC_H = 120;           // +14% from 105 for body rows + anchor zone
export const PC_X = (CANVAS_W - PC_W) / 2;  // (2400 - 300) / 2 = 1050
export const PC_Y = VSM_VIEW_Y + TOP_OUTER_GAP;  // 25 + 25 = 50

// Process boxes — Y derived from PC bottom + PC_TO_PROCESS_GAP
export const PROC_W = 155;
export const PROC_H = 85;           // increased from 78 for larger text
export const PROC_Y = PC_Y + PC_H + PC_TO_PROCESS_GAP;  // 50 + 120 + 130 = 300

// Material flow Y
export const MAT_Y = PROC_Y + PROC_H / 2;

// Data boxes — Y derived below process box
export const DATA_Y = PROC_Y + PROC_H + 12;
export const DATA_ROW_H = 26;

// Inventory triangles — aligned on material flow centerline with process boxes
export const INV_SIZE = 48;
export const INV_HALF = INV_SIZE / 2;
export const INV_Y = MAT_Y;

// ── Inventory Clearance Zone ──
export const INV_CLEARANCE_LR = 16;
export const INV_CLEARANCE_TOP = 10;
export const INV_CLEARANCE_BTM = 18;

// ── Material Arrow gaps around inventory ──
export const MAT_ARROW_GAP_BEFORE = 10;
export const MAT_ARROW_GAP_AFTER = 10;

// ── Material Flow Label placement (relative to MAT_Y) ──
export const FLOW_LABEL_Y_OFFSET = -20;
export const FLOW_ICON_Y_OFFSET = -48;
export const TRANSPORT_ANNOTATION_Y = 14;

// ── Inventory Label stacking (relative to INV_Y + INV_HALF) ──
export const INV_QTY_INSET = -6;
export const INV_DAYS_Y = 22;
export const INV_WIP_LABEL_Y = 38;
export const INV_CODE_Y = 53;
export const INV_ICON_Y = 74;

export const MIN_COMBINED_LABEL_WIDTH = 80;

// ── Protected Zones ──
export const PROC_CLEARANCE = 10;
export const DATA_CLEARANCE = 10;
export const INV_CLEARANCE_PX = 8;
export const SHIP_CLEARANCE_PX = 8;
export const LEGEND_CLEARANCE = 12;

// ── Information Flow Lane Constants ──
export const INFO_LANE_Y = 250;
export const INFO_LANE_SUPPLIER_Y = 265;
export const SCHEDULE_LANE_Y = 395;
export const BOX_CLEARANCE = 12;

// Timeline — Y derived from data box bottom + PROCESS_TO_TIMELINE_GAP
export const TIMELINE_Y = DATA_Y + DATA_ROW_H + PROCESS_TO_TIMELINE_GAP;  // 397 + 26 + 130 = 553
export const VA_SEG_W = PROC_W;
export const VA_HALF = VA_SEG_W / 2;
export const TIMELINE_TOP_Y = 0;
export const TIMELINE_DROP = 24;
export const TIMELINE_BTM_Y = TIMELINE_TOP_Y + TIMELINE_DROP;

// ── Canvas height ──
// Content spans from PC_Y (50) down to TIMELINE_Y + TIMELINE_DROP = 587,
// with the TotalsBox extending to TIMELINE_Y - 18 + 68 = 613.
// The viewBox must include ALL visible content — no clipping.
export const CANVAS_PAD = 0;
// Highest Y among rendered elements (excludes invisible groups)
export const CONTENT_MIN_X = FAC_X;  // 24
export const CONTENT_MAX_X = FAC_CUST_X + FAC_W;  // 2376
export const CONTENT_MIN_Y = Math.min(FAC_Y, PC_Y);  // 50
export const CONTENT_MAX_Y = Math.max(
  TIMELINE_Y + TIMELINE_DROP,             // 587 — ladder bottom
  TIMELINE_Y - 18 + 68                    // 613 — totals box bottom (y=-18, h=68)
);  // = 613
export const CONTENT_W = CONTENT_MAX_X - CONTENT_MIN_X;  // 2352
export const CONTENT_H = CONTENT_MAX_Y - CONTENT_MIN_Y;  // 563
export const VSM_VIEW_H = CONTENT_MAX_Y - VSM_VIEW_Y + 4;  // 613 - 25 + 4 = 592
export const CANVAS_H = VSM_VIEW_H + VSM_VIEW_Y;  // 592 + 25 = 617

