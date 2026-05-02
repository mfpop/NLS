# VSM ADVANCED DIAGRAMS

## Full VSM
```mermaid
graph TD
Supplier --> ProductionControl --> Process1 --> WIP --> Process2 --> FG --> Customer
```

## Information Flow
```mermaid
graph TD
Customer --> ProductionControl --> Process
Supplier --> ProductionControl
```
