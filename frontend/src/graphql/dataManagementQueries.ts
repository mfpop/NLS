import { gql } from "@apollo/client";

export const DATA_MANAGEMENT_OVERVIEW_FULL_QUERY = gql`
  query DataManagementOverviewFull($plantId: String, $search: String, $status: String, $includeTree: Boolean) {
    dataManagementOverview(plantId: $plantId, search: $search, status: $status, includeTree: $includeTree) {
      selectedPlant {
        id
        name
        code
        status
      }
      plants {
        id
        name
        code
        status
      }
      kpis {
        productionLines
        departments
        resourceGroups
        resources
        plantStatus
      }
      tree {
        id
        type
        name
        code
        status
        childCount
        children {
          id
          type
          name
          code
          status
          childCount
          children {
            id
            type
            name
            code
            status
            childCount
            children {
              id
              type
              name
              code
              status
              childCount
              children {
                id
                type
                name
                code
                status
                childCount
                  children {
                    id
                    type
                    name
                    code
                    status
                    childCount
                  }
              }
            }
          }
        }
      }
      navigationCounts {
        plants
        productionLines
        departments
        resourceGroups
        resources
        referenceTables
      }
      systemHealth {
        runningLines
        resourcesDown
        highUtilizationResources
      }
    }
  }
`;

export const DATA_MANAGEMENT_OVERVIEW_SUMMARY_QUERY = gql`
  query DataManagementOverviewSummary($plantId: String, $search: String, $status: String, $includeTree: Boolean) {
    dataManagementOverview(plantId: $plantId, search: $search, status: $status, includeTree: $includeTree) {
      selectedPlant {
        id
        name
        code
        status
      }
      plants {
        id
        name
        code
        status
      }
      kpis {
        productionLines
        departments
        resourceGroups
        resources
        plantStatus
      }
      navigationCounts {
        plants
        productionLines
        departments
        resourceGroups
        resources
        referenceTables
      }
      systemHealth {
        runningLines
        resourcesDown
        highUtilizationResources
      }
    }
  }
`;
