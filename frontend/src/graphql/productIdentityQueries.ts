import { gql } from "@apollo/client";

export const PRODUCT_IDENTITY_FIELDS = `
  id
  partNumber
  description
  revision
  uom
  status
  isActive
  familyId
  familyName
  modelId
  modelName
  variantId
  variantName
`;

export const PRODUCT_FAMILIES_QUERY = gql`
  query ProductFamilies($status: String, $limit: Int, $offset: Int) {
    productFamilies(status: $status, limit: $limit, offset: $offset) {
      items {
        id
        code
        name
        description
        status
        isActive
      }
      total
      hasMore
    }
  }
`;

export const PRODUCT_FAMILY_QUERY = gql`
  query ProductFamily($id: String!) {
    productFamily(id: $id) {
      id
      code
      name
      description
      status
      isActive
    }
  }
`;

export const PRODUCT_MODELS_QUERY = gql`
  query ProductModels($familyId: String, $limit: Int, $offset: Int) {
    productModels(familyId: $familyId, limit: $limit, offset: $offset) {
      items {
        id
        familyId
        familyName
        code
        name
        description
        status
        isActive
      }
      total
      hasMore
    }
  }
`;

export const PRODUCT_MODEL_QUERY = gql`
  query ProductModel($id: String!) {
    productModel(id: $id) {
      id
      familyId
      familyName
      code
      name
      description
      status
      isActive
    }
  }
`;

export const PRODUCT_VARIANTS_QUERY = gql`
  query ProductVariants($modelId: String, $limit: Int, $offset: Int) {
    productVariants(modelId: $modelId, limit: $limit, offset: $offset) {
      items {
        id
        modelId
        modelName
        code
        name
        configurationSummary
        status
        isActive
      }
      total
      hasMore
    }
  }
`;

export const PRODUCT_VARIANT_QUERY = gql`
  query ProductVariant($id: String!) {
    productVariant(id: $id) {
      id
      modelId
      modelName
      code
      name
      configurationSummary
      status
      isActive
    }
  }
`;

export const PART_NUMBERS_QUERY = gql`
  query PartNumbers($familyId: String, $modelId: String, $variantId: String, $search: String, $limit: Int, $offset: Int) {
    partNumbers(familyId: $familyId, modelId: $modelId, variantId: $variantId, search: $search, limit: $limit, offset: $offset) {
      items {
        ${PRODUCT_IDENTITY_FIELDS}
      }
      total
      hasMore
    }
  }
`;

export const PART_NUMBER_QUERY = gql`
  query PartNumber($id: String!) {
    partNumber(id: $id) {
      ${PRODUCT_IDENTITY_FIELDS}
    }
  }
`;

export const BOMS_QUERY = gql`
  query Boms($partNumberId: String, $limit: Int, $offset: Int) {
    boms(partNumberId: $partNumberId, limit: $limit, offset: $offset) {
      items {
        id
        partNumberId
        partNumber
        version
        status
        notes
        itemCount
        createdAt
        updatedAt
      }
      total
      hasMore
    }
  }
`;

export const BOM_QUERY = gql`
  query Bom($id: String!) {
    bom(id: $id) {
      id
      partNumberId
      partNumber
      version
      status
      notes
      items {
        id
        materialId
        materialCode
        materialName
        quantity
        scrapFactor
      }
      createdAt
      updatedAt
    }
  }
`;

export const ROUTING_ASSIGNMENTS_QUERY = gql`
  query RoutingAssignments($partNumberId: String, $limit: Int, $offset: Int) {
    routings(partNumberId: $partNumberId, limit: $limit, offset: $offset) {
      id
      productionLineId
      productionLineName
      productModelId
      productModelName
      partNumberId
      partNumber
      partDescription
      version
      status
      effectiveFrom
      effectiveTo
      notes
      createdAt
      updatedAt
    }
  }
`;

export const ROUTING_ASSIGNMENT_QUERY = gql`
  query RoutingAssignment($id: String!) {
    routing(id: $id) {
      id
      productionLineId
      productionLineName
      productModelId
      productModelName
      partNumberId
      partNumber
      partDescription
      version
      status
      effectiveFrom
      effectiveTo
      notes
      stepCount
      steps {
        id
        sequence
        departmentId
        departmentName
        resourceGroupId
        resourceGroupName
        resourceId
        resourceName
        cycleTimeSec
        setupTimeSec
        changeoverTimeSec
        requiredOperators
        scheduleSource
        bufferType
        wipMin
        wipMax
        qualityCheckpoint
        reworkAllowed
        notes
      }
      createdAt
      updatedAt
    }
  }
`;
