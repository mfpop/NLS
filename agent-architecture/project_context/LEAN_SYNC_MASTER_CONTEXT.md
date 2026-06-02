# LeanSync Master Context

## System Overview

LeanSync is a manufacturing operations management platform built with a modular multi-agent architecture. The system uses six specialized Nexus agents to manage governance, manufacturing structure, architecture auditing, backend/GraphQL development, and frontend/UI implementation.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Apollo GraphQL
- **Backend**: Django, GraphQL (Ariadne), MySQL
- **Agent System**: Python-based Nexus multi-agent framework

## Core Domains

1. **Governance** — Rules, policies, architecture laws, domain boundaries
2. **Manufacturing Structure** — Company, Plant, ProductionLine, Department, ResourceGroup, Resource hierarchy
3. **Architecture Audit** — Implementation verification against governance and architecture rules
4. **Backend/GraphQL** — Clean Architecture, Django services, GraphQL resolvers
5. **Frontend/UI** — React components, Tailwind styling, GraphQL consumption

## Source of Truth Hierarchy

1. `project_context/` — Official permanent source of truth
2. Agent `agent.yaml` files — Agent-specific configuration and boundaries
3. `config/` — System configuration
4. `memory/` — Runtime-only memory, never authoritative
