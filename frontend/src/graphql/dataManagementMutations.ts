import { gql } from "@apollo/client";

export const RG_FRAGMENT = `
  id code name description status statusId departmentId departmentName
  members leader supervisor groupTypeId capabilityType
  shiftPatternId capacityModel
  oeeTarget assignedResourceCount isBottleneck isConstraint resourceCount resourceType
  resolvedSchedule {
    source
    calendarName
    shiftName
    timezone
    weekStart
    isConfigured
  }
  createdAt updatedAt
`;

export const UPDATE_RESOURCE_GROUP = gql`
  mutation UpdateResourceGroup($id: String!, $input: ResourceGroupInput!) {
    updateResourceGroup(id: $id, input: $input) {
      ok
      resourceGroup { ${RG_FRAGMENT} }
      errors { field code message }
    }
  }
`;

export const CREATE_RESOURCE_GROUP = gql`
  mutation CreateResourceGroup($input: ResourceGroupInput!) {
    createResourceGroup(input: $input) {
      ok
      resourceGroup { ${RG_FRAGMENT} }
      errors { field code message }
    }
  }
`;

export const DELETE_RESOURCE_GROUP = gql`
  mutation ArchiveResourceGroup($id: String!) {
    archiveResourceGroup(id: $id) {
      ok
      resourceGroup {
        id
        status
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const RESOURCE_FRAGMENT = `
  id code name description status statusId resourceGroupId resourceGroupName
  departmentId departmentName plantId plantName resourceTypeId utilization
  opStatus lastActivity shiftPattern createdAt updatedAt
`;

export const CREATE_RESOURCE = gql`
  mutation CreateResource($input: ResourceInput!) {
    createResource(input: $input) {
      ok
      resource { ${RESOURCE_FRAGMENT} }
      errors { field code message }
    }
  }
`;

export const UPDATE_RESOURCE = gql`
  mutation UpdateResource($id: String!, $input: ResourceInput!) {
    updateResource(id: $id, input: $input) {
      ok
      resource { ${RESOURCE_FRAGMENT} }
      errors { field code message }
    }
  }
`;

export const DELETE_RESOURCE = gql`
  mutation ArchiveResource($id: String!) {
    archiveResource(id: $id) {
      ok
      resource {
        id
        status
        updatedAt
      }
      errors { field code message }
    }
  }
`;

export const MATERIAL_BIN_FRAGMENT = `
  id plantId plantName resourceGroupId resourceGroupName code name binType
  materialId materialCode materialName capacity uomId uomName locationCode
  isActive createdAt updatedAt
`;

export const CREATE_MATERIAL_BIN = gql`
  mutation CreateMaterialBin($input: MaterialBinInput!) {
    createMaterialBin(input: $input) {
      ok
      materialBin { ${MATERIAL_BIN_FRAGMENT} }
      errors { field code message }
    }
  }
`;

export const UPDATE_MATERIAL_BIN = gql`
  mutation UpdateMaterialBin($id: String!, $input: MaterialBinInput!) {
    updateMaterialBin(id: $id, input: $input) {
      ok
      materialBin { ${MATERIAL_BIN_FRAGMENT} }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_MATERIAL_BIN = gql`
  mutation ArchiveMaterialBin($id: String!) {
    archiveMaterialBin(id: $id) {
      ok
      materialBin { id isActive updatedAt }
      errors { field code message }
    }
  }
`;

export const RECALCULATE_RESOURCE_GROUP_CAPACITY = gql`
  mutation RecalculateResourceGroupCapacity($resourceGroupId: String!, $fromDatetime: String!, $toDatetime: String!) {
    recalculateResourceGroupCapacity(resourceGroupId: $resourceGroupId, fromDatetime: $fromDatetime, toDatetime: $toDatetime) {
      availableMinutes
      theoreticalCapacity
      effectiveCapacity
      bottleneckCapacity
      capacityUom
      fromDatetime
      toDatetime
      calculatedAt
    }
  }
`;
