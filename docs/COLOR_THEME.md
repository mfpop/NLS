# Theme Governance & Design System Freeze

**Product:** LeanSynk

**Scope:** UI Theme, Color Usage, Layout Discipline

**Status:** Enforced

**Audience:** Designers, Front‑End Engineers, Product Owners

---

## 1. Purpose

This document defines the **finalized theme rules** for LeanSynk.

The goal is to:

- Lock the current visual theme
- Prevent design drift over time
- Ensure consistency across operational and administrative screens
- Enable safe scaling and future extensions (including Dark Mode)

LeanSynk is an **enterprise manufacturing operations platform**, not a marketing product.

Clarity, trust, and operational priority take precedence over stylistic expression.

---

## 2. Theme Freeze Declaration

The current theme is **officially frozen**.

### Freeze Conditions

All of the following conditions are met and must remain true:

- 80–90% of UI surfaces use neutral colors
- Brand color is restrained and non‑decorative
- Semantic colors (red, amber, green) carry meaning
- Control Tower and Admin screens feel like a single product
- Alerts visually dominate branding
- Cards are separated by spacing and elevation, not color

Once frozen:

- ❌ No ad‑hoc color changes
- ❌ No local overrides
- ✅ Only governed, system‑level updates are allowed

---

## 3. Brand Color Governance

### Allowed Usage

Brand color may only be used for:

- App header and shell
- Active navigation state
- Primary non‑destructive actions
- Key icons where emphasis is required

### Forbidden Usage

Brand color must **not** be used for:

- KPI backgrounds or fills
- Alerts, warnings, or risks
- Card backgrounds
- Decorative highlights

> Brand color must never compete with semantic colors.

---

## 4. Semantic Color Rules (Locked)

Semantic colors communicate meaning and urgency and must never be repurposed.

| Semantic Meaning | Color Usage |

|-----------------|------------|

| Critical / Blocker | Red |

| Warning / Risk | Amber / Orange |

| Healthy / Active | Green |

| Informational | Muted blue‑gray |

Rules:

- No decorative use of semantic colors
- No recoloring semantics to match brand
- If color is used, it must convey meaning

---

## 5. Layout & Density Discipline

### Structure Rules

- Neutral backgrounds dominate
- Cards use spacing and elevation for separation
- Identical content uses identical layout patterns

### Density Rules

- Do **not** compress spacing to fit more content
- Avoid visual noise accumulation vertically
- Long forms must remain calm and readable in extended sessions

---

## 6. Action Hierarchy (Non‑Negotiable)

- **Primary action**

  - Strongest visual weight
  - Brand color allowed
- **Secondary actions**

  - Neutral outline or text
- **Destructive actions**

  - Red only
  - Visually separated
  - Never styled as primary

Primary actions must always be visually dominant.

---

## 7. Design Governance — What Must NOT Change

### Prohibited Changes

- Introducing new accent colors
- Using gradients in operational UI
- Page‑specific styling rules
- One‑off visual experiments
- Styling outside the design system

### Allowed Without Review

- Spacing adjustments within the defined scale
- Typography weight tuning (existing levels only)
- Icon swaps using existing tokens
- Micro‑interactions (hover, focus)

All other changes require **design‑system review**.

---

## 8. Dark Mode Extension (Controlled)

Dark mode is an extension, not a redesign.

### Principles

- Same product, different lighting
- Neutral dominance remains mandatory
- No neon, glow, or dramatic contrast

### Rules

- Backgrounds: dark neutral (not pure black)
- Cards: slightly lighter than background
- Brand color usage unchanged
- Semantic colors remain semantic, slightly muted
- Text contrast meets WCAG AA minimum

### Validation Criteria

- Alerts still dominate visually
- KPIs readable without color dependency
- No eye strain during long sessions
- Clear visual relationship to light mode

---

## 9. Enforcement

- Any violation of this document requires rollback
- New visual patterns require system approval
- The theme is not open for interpretation

---

## 10. Final Statement

The LeanSynk theme is a **system**, not a style.

Its value lies in:

- Predictability
- Operational clarity
- Long‑term scalability

Stability is now a feature.

---

``
