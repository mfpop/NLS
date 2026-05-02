# API GUIDE (GraphQL)

## Endpoint
/graphql/

## Principles
- GraphQL only
- No business logic in resolvers
- Resolvers call Application layer

## Queries
- health
- manufacturingSnapshot
- processSnapshot
- executionSnapshot
- kpiSnapshot

## Mutations
- createJobOrder
- startBatch
- completeBatch
- recordQuality
- startDowntime
- endDowntime

## Pattern
Resolver → Application → Domain → Infrastructure
