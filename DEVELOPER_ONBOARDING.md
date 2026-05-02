# DEVELOPER ONBOARDING

## Goal
Get productive fast without breaking architecture.

## Step 1 — Read Order
1. README.md
2. DOMAIN_CONSTITUTION.md
3. DOMAIN_HANDBOOK.md
4. DOMAIN_SPEC.md

## Step 2 — Understand Layers
UI → Application → Domain → Infrastructure

## Step 3 — Rules
- No logic outside Domain
- No KPI outside Domain
- No mutation of history

## Step 4 — First Task
- Add feature via Application layer
- Use Domain services
- Persist via Infrastructure

## Done when:
- No invariant broken
- Events used correctly
