import { gql } from "@apollo/client";
import { PRODUCT_IDENTITY_FIELDS } from "./productIdentityQueries";

const PRODUCT_FAMILY_FIELDS = `
  id
  code
  name
  description
  status
  isActive
`;

const PRODUCT_MODEL_FIELDS = `
  id
  familyId
  familyName
  code
  name
  description
  status
  isActive
`;

const PRODUCT_VARIANT_FIELDS = `
  id
  modelId
  modelName
  code
  name
  configurationSummary
  status
  isActive
`;

export const CREATE_PRODUCT_FAMILY = gql`
  mutation CreateProductFamily($input: ProductFamilyInput!) {
    createProductFamily(input: $input) {
      ok
      family { ${PRODUCT_FAMILY_FIELDS} }
      errors { field code message }
    }
  }
`;

export const UPDATE_PRODUCT_FAMILY = gql`
  mutation UpdateProductFamily($id: String!, $input: ProductFamilyInput!) {
    updateProductFamily(id: $id, input: $input) {
      ok
      family { ${PRODUCT_FAMILY_FIELDS} }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_PRODUCT_FAMILY = gql`
  mutation ArchiveProductFamily($id: String!) {
    archiveProductFamily(id: $id) {
      ok
      family { ${PRODUCT_FAMILY_FIELDS} }
      errors { field code message }
    }
  }
`;

export const CREATE_PRODUCT_MODEL = gql`
  mutation CreateProductModel($input: ProductModelInput!) {
    createProductModel(input: $input) {
      ok
      model { ${PRODUCT_MODEL_FIELDS} }
      errors { field code message }
    }
  }
`;

export const UPDATE_PRODUCT_MODEL = gql`
  mutation UpdateProductModel($id: String!, $input: ProductModelInput!) {
    updateProductModel(id: $id, input: $input) {
      ok
      model { ${PRODUCT_MODEL_FIELDS} }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_PRODUCT_MODEL = gql`
  mutation ArchiveProductModel($id: String!) {
    archiveProductModel(id: $id) {
      ok
      model { ${PRODUCT_MODEL_FIELDS} }
      errors { field code message }
    }
  }
`;

export const CREATE_PRODUCT_VARIANT = gql`
  mutation CreateProductVariant($input: ProductVariantInput!) {
    createProductVariant(input: $input) {
      ok
      variant { ${PRODUCT_VARIANT_FIELDS} }
      errors { field code message }
    }
  }
`;

export const UPDATE_PRODUCT_VARIANT = gql`
  mutation UpdateProductVariant($id: String!, $input: ProductVariantInput!) {
    updateProductVariant(id: $id, input: $input) {
      ok
      variant { ${PRODUCT_VARIANT_FIELDS} }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_PRODUCT_VARIANT = gql`
  mutation ArchiveProductVariant($id: String!) {
    archiveProductVariant(id: $id) {
      ok
      variant { ${PRODUCT_VARIANT_FIELDS} }
      errors { field code message }
    }
  }
`;

export const CREATE_PART_NUMBER = gql`
  mutation CreatePartNumber($input: PartNumberInput!) {
    createPartNumber(input: $input) {
      ok
      partNumber {
        ${PRODUCT_IDENTITY_FIELDS}
      }
      errors { field code message }
    }
  }
`;

export const UPDATE_PART_NUMBER = gql`
  mutation UpdatePartNumber($id: String!, $input: PartNumberInput!) {
    updatePartNumber(id: $id, input: $input) {
      ok
      partNumber {
        ${PRODUCT_IDENTITY_FIELDS}
      }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_PART_NUMBER = gql`
  mutation ArchivePartNumber($id: String!) {
    archivePartNumber(id: $id) {
      ok
      partNumber {
        ${PRODUCT_IDENTITY_FIELDS}
      }
      errors { field code message }
    }
  }
`;

const BOM_FIELDS = `
  id
  partNumberId
  partNumber
  version
  status
  notes
  createdAt
  updatedAt
`;

export const CREATE_BOM = gql`
  mutation CreateBom($input: BomInput!) {
    createBom(input: $input) {
      ok
      bom { ${BOM_FIELDS} }
      errors { field code message }
    }
  }
`;

export const UPDATE_BOM = gql`
  mutation UpdateBom($id: String!, $input: BomInput!) {
    updateBom(id: $id, input: $input) {
      ok
      bom { ${BOM_FIELDS} }
      errors { field code message }
    }
  }
`;

export const ARCHIVE_BOM = gql`
  mutation ArchiveBom($id: String!) {
    archiveBom(id: $id) {
      ok
      bom { id status }
      errors { field code message }
    }
  }
`;
