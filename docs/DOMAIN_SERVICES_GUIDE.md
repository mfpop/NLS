# DOMAIN SERVICES GUIDE

## Purpose
Encapsulate business logic inside Domain.

## Rules
- Stateless
- Pure logic
- No framework dependency

## Examples

### KPI Service
computeOEE(events)

### Flow Service
generateVSM(flow, events)

## Anti-patterns
- Logic in controllers
- Logic in GraphQL resolvers
- Logic in models (ORM heavy)
