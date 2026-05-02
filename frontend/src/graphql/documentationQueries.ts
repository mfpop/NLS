import { gql } from "@apollo/client";

export const DOCUMENTATION_FILES_QUERY = gql`
  query DocumentationFiles {
    documentationFiles {
      name
      path
      category
      status
      sizeKb
      lastModified
      purpose
      relatedDocs
    }
  }
`;

export const DOCUMENTATION_FILE_QUERY = gql`
  query DocumentationFile($name: String!) {
    documentationFile(name: $name) {
      name
      path
      category
      status
      content
      headings
      relatedDocs
      sizeKb
      lastModified
      purpose
    }
  }
`;
