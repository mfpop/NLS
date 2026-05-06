import { gql } from "@apollo/client";

export const PRODUCTION_STRUCTURE_TREE_QUERY = gql`
  query ProductionStructureTree($plantId: ID!, $search: String, $status: String) {
    productionStructureTree(plantId: $plantId, search: $search, status: $status) {
      id
      name
      code
      status
      productionLines {
        id
        name
        code
        status
        plantId
        plantName
        departments {
          id
          name
          code
          status
          resourceGroups {
            id
            name
            code
            status
            resources {
              id
              name
              code
              status
            }
          }
        }
      }
      departments {
        id
        name
        code
        status
        resourceGroups {
          id
          name
          code
          status
          resources {
            id
            name
            code
            status
          }
        }
      }
    }
  }
`;
