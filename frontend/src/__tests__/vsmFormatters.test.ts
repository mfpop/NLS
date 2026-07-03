import { describe, it, expect } from "vitest";
import { fmtSeconds, fmtCO, fmtMinutes, v, CANVAS_W, CANVAS_H, PROC_W, PROC_H, INV_SIZE, DATA_ROW_H, TIMELINE_Y } from "@/components/vsm/vsmFormatters";

// ── fmtSeconds ──

describe("fmtSeconds", () => {
  it("returns '0s' for zero", () => {
    expect(fmtSeconds(0)).toBe("0s");
  });

  it("returns em-dash for null", () => {
    expect(fmtSeconds(null as unknown as number)).toBe("\u2014");
  });

  it("returns em-dash for undefined", () => {
    expect(fmtSeconds(undefined as unknown as number)).toBe("\u2014");
  });

  it("returns seconds as-is for < 60", () => {
    expect(fmtSeconds(45)).toBe("45s");
    expect(fmtSeconds(1)).toBe("1s");
    expect(fmtSeconds(59)).toBe("59s");
  });

  it("returns minutes for 60-3599 seconds", () => {
    expect(fmtSeconds(60)).toBe("1min");
    expect(fmtSeconds(600)).toBe("10min");
    expect(fmtSeconds(1800)).toBe("30min");
    expect(fmtSeconds(3540)).toBe("59min");
  });

  it("returns hours for 3600+ seconds", () => {
    expect(fmtSeconds(3600)).toBe("1.0h");
    expect(fmtSeconds(7200)).toBe("2.0h");
    expect(fmtSeconds(5400)).toBe("1.5h");
  });

  it("rounds minutes correctly", () => {
    expect(fmtSeconds(90)).toBe("2min");
    expect(fmtSeconds(150)).toBe("3min");
  });
});

// ── fmtCO ──

describe("fmtCO", () => {
  it("returns '0' for zero changeover", () => {
    expect(fmtCO(0)).toBe("0");
  });

  it("returns em-dash for null", () => {
    expect(fmtCO(null as unknown as number)).toBe("\u2014");
  });

  it("returns em-dash for undefined", () => {
    expect(fmtCO(undefined as unknown as number)).toBe("\u2014");
  });

  it("returns seconds for < 60", () => {
    expect(fmtCO(45)).toBe("45s");
    expect(fmtCO(5)).toBe("5s");
  });

  it("returns minutes for 60-3599", () => {
    expect(fmtCO(600)).toBe("10min");
    expect(fmtCO(1800)).toBe("30min");
  });

  it("returns hours for 3600+", () => {
    expect(fmtCO(3600)).toBe("1.0h");
    expect(fmtCO(7200)).toBe("2.0h");
  });

  it("never produces 'min/C/O' compressed format", () => {
    const result = fmtCO(600);
    expect(result).not.toContain("/");
    expect(result).toBe("10min");
  });
});

// ── fmtMinutes ──

describe("fmtMinutes", () => {
  it("returns em-dash for null", () => {
    expect(fmtMinutes(null as unknown as number)).toBe("\u2014");
  });

  it("returns em-dash for undefined", () => {
    expect(fmtMinutes(undefined as unknown as number)).toBe("\u2014");
  });

  it("returns seconds for < 1 minute", () => {
    expect(fmtMinutes(0.5)).toBe("30s");
    expect(fmtMinutes(0.25)).toBe("15s");
  });

  it("returns minutes for 1-59", () => {
    expect(fmtMinutes(1)).toBe("1m");
    expect(fmtMinutes(30)).toBe("30m");
    expect(fmtMinutes(59)).toBe("59m");
  });

  it("returns hours and minutes for 60-1439", () => {
    expect(fmtMinutes(60)).toBe("1h");
    expect(fmtMinutes(90)).toBe("1h 30m");
    expect(fmtMinutes(120)).toBe("2h");
    expect(fmtMinutes(150)).toBe("2h 30m");
    expect(fmtMinutes(480)).toBe("8h");
  });

  it("returns days for 1440+", () => {
    expect(fmtMinutes(1440)).toBe("1.0d");
    expect(fmtMinutes(2880)).toBe("2.0d");
    expect(fmtMinutes(2160)).toBe("1.5d");
  });

  it("handles whole hours without showing minutes", () => {
    expect(fmtMinutes(180)).toBe("3h");
    expect(fmtMinutes(360)).toBe("6h");
  });

  it("rounds partial minutes", () => {
    expect(fmtMinutes(1.7)).toBe("2m");
    expect(fmtMinutes(30.3)).toBe("30m");
  });
});

// ── v() val formatter ──

describe("v()", () => {
  it("returns em-dash for null", () => {
    expect(v(null)).toBe("\u2014");
  });

  it("returns em-dash for undefined", () => {
    expect(v(undefined)).toBe("\u2014");
  });

  it("returns em-dash for empty string", () => {
    expect(v("")).toBe("\u2014");
  });

  it("returns em-dash for string 'undefined'", () => {
    expect(v("undefined")).toBe("\u2014");
  });

  it("returns the value as a string for valid numbers", () => {
    expect(v(42)).toBe("42");
    expect(v(0)).toBe("0");
    expect(v(-1)).toBe("-1");
  });

  it("appends suffix when provided", () => {
    expect(v(95, "%")).toBe("95%");
    expect(v(2, "ops")).toBe("2ops");
  });

  it("appends suffix for zero", () => {
    expect(v(0, "%")).toBe("0%");
  });

  it("handles string values", () => {
    expect(v("hello")).toBe("hello");
  });

  it("handles boolean values", () => {
    expect(v(true)).toBe("true");
    expect(v(false)).toBe("false");
  });
});

// ── Exported constants ──

describe("VSM layout constants", () => {
  it("exports canvas dimensions", () => {
    expect(CANVAS_W).toBeGreaterThan(0);
    expect(CANVAS_H).toBeGreaterThan(0);
    expect(PROC_W).toBeGreaterThan(0);
    expect(PROC_H).toBeGreaterThan(0);
    expect(INV_SIZE).toBeGreaterThan(0);
    expect(DATA_ROW_H).toBeGreaterThan(0);
    expect(TIMELINE_Y).toBeGreaterThan(0);
  });
});
