import { gql } from "@apollo/client";

const PLANT_FIELDS = `
  id
  code
  name
  description
  status
  statusId
  statusRef {
    id
    name
    code
    isActive
  }
  building
  address
  city
  state
  country
  countryId
  zipcode
  timezone
  timezoneId
  latitude
  longitude
  plantType
  plantTypeId
  operatingSince
  managerPhone
  defaultCalendar
  defaultCalendarId
  defaultShiftModel
  defaultShiftModelId
  weekStartDay
  weekStartDayId
  defaultSchedule
  defaultScheduleId
  manufacturingFocus
  manufacturingFocusRefs {
    id
    name
    code
    isActive
  }
  managerName
  managerEmail
  lineCount
  departmentCount
  groupCount
  resourceCount
  createdAt
  updatedAt
`;

export const PLANTS_QUERY = gql`
  query Plants($status: String, $limit: Int, $offset: Int) {
    plants(status: $status, limit: $limit, offset: $offset) {
      ${PLANT_FIELDS}
    }
  }
`;

export const PLANT_QUERY = gql`
  query Plant($id: String!) {
    plant(id: $id) {
      ${PLANT_FIELDS}
    }
  }
`;

export const CREATE_PLANT_MUTATION = gql`
  mutation CreatePlant($input: PlantInput!) {
    createPlant(input: $input) {
      ok
      plant {
        ${PLANT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_PLANT_MUTATION = gql`
  mutation UpdatePlant($id: String!, $input: PlantInput!) {
    updatePlant(id: $id, input: $input) {
      ok
      plant {
        ${PLANT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const ARCHIVE_PLANT_MUTATION = gql`
  mutation ArchivePlant($id: String!) {
    archivePlant(id: $id) {
      ok
      plant {
        ${PLANT_FIELDS}
      }
      errors {
        field
        code
        message
      }
    }
  }
`;
