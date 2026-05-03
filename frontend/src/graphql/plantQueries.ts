import { gql } from "@apollo/client";

export const PLANTS_QUERY = gql`
  query Plants($search: String, $status: String) {
    plants(search: $search, status: $status) {
      id
      code
      name
      status
      building
      address
      timezone
      defaultCalendarId
      defaultScheduleId
      managerName
      managerEmail
      description
      lineCount
      departmentCount
      groupCount
      resourceCount
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const PLANT_QUERY = gql`
  query Plant($id: ID!) {
    plant(id: $id) {
      id
      code
      name
      status
      building
      address
      timezone
      defaultCalendarId
      defaultScheduleId
      managerName
      managerEmail
      description
      lineCount
      departmentCount
      groupCount
      resourceCount
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PLANT_MUTATION = gql`
  mutation CreatePlant($input: PlantInput!) {
    createPlant(input: $input) {
      plant {
        id
        code
        name
        status
        building
        address
        timezone
        defaultCalendarId
        defaultScheduleId
        managerName
        managerEmail
        description
        lineCount
        departmentCount
        groupCount
        resourceCount
        isActive
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PLANT_MUTATION = gql`
  mutation UpdatePlant($id: ID!, $input: PlantInput!) {
    updatePlant(id: $id, input: $input) {
      plant {
        id
        code
        name
        status
        building
        address
        timezone
        defaultCalendarId
        defaultScheduleId
        managerName
        managerEmail
        description
        lineCount
        departmentCount
        groupCount
        resourceCount
        isActive
        createdAt
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const TOGGLE_PLANT_STATUS_MUTATION = gql`
  mutation TogglePlantStatus($id: ID!) {
    togglePlantStatus(id: $id) {
      plant {
        id
        code
        name
        status
        isActive
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_PLANT_MUTATION = gql`
  mutation DeletePlant($id: ID!) {
    deletePlant(id: $id) {
      success
      inUse
      message
      errors {
        field
        message
      }
    }
  }
`;
