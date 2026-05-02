# CONTRIBUTING

## Purpose
Guide developers on how to work inside Nexus LeanSync architecture.

## Core Rules
- Do NOT violate DOMAIN_CONSTITUTION
- Do NOT add business logic outside Domain
- Do NOT compute KPIs outside Domain
- Do NOT mutate historical data

## Workflow
1. Read README.md
2. Read DOMAIN_CONSTITUTION.md
3. Implement using DOMAIN_SPEC.md

## Code Guidelines
- Domain: pure logic
- Application: orchestration only
- Infrastructure: persistence only
- UI: rendering only

## Pull Request Checklist
- No invariant broken
- No logic outside Domain
- Events used correctly
- VSM integrity preserved
