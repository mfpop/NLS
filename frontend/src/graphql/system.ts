import { gql } from "@apollo/client";

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    health
    manufacturingSnapshot {
      plantCount
      departmentCount
      resourceGroupCount
      resourceCount
    }
    processSnapshot {
      productModelCount
      productVariantCount
      processFlowCount
      activeFlowCount
    }
    executionSnapshot {
      openWorkOrders
      activeCycles
      downtimeEventsLast24h
    }
    improvementSnapshot {
      openKaizens
      gembaWalksThisWeek
      observationsThisWeek
    }
    kpiSnapshot {
      oee
      leadTimeMinutes
      bottleneckResourceCode
    }
  }
`;
