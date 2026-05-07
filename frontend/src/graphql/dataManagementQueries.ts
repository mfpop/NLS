import { gql } from "@apollo/client";

export const DATA_MANAGEMENT_OVERVIEW_QUERY = gql`
  query DataManagementOverview($plantId: String, $search: String, $status: String) {
    dataManagementOverview(plantId: $plantId, search: $search, status: $status) {
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
