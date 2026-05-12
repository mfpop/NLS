import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";

export const REFERENCE_TABLES_LIST_QUERY = gql`
  query ReferenceTablesList {
    referenceTablesList {
      categoryId
      categoryCode
      categoryName
      values {
        id
        categoryId
        code
        name
        description
        sortOrder
        isActive
        metadata
        status
      }
      totalCount
    }
  }
`;

export const REFERENCE_OPTIONS_QUERY = gql`
  query ReferenceOptions($types: [String!]!) {
    referenceOptions(types: $types) {
      categoryCode
      values {
        id
        code
        name
        isActive
        sortOrder
        metadata
      }
    }
  }
`;

export interface ReferenceValueNode {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, any> | null;
  status: string;
}

export interface ReferenceTableNode {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  values: ReferenceValueNode[];
  totalCount: number;
}

export interface ReferenceTablesListData {
  referenceTablesList: ReferenceTableNode[];
}

export function useReferenceTables() {
  const { data, loading, error } = useQuery<ReferenceTablesListData>(
    REFERENCE_TABLES_LIST_QUERY,
    { fetchPolicy: "network-only" }
  );

  const byCategory = (code: string): ReferenceValueNode[] => {
    if (!data?.referenceTablesList) return [];
    const table = data.referenceTablesList.find((t) => t.categoryCode === code);
    return table?.values ?? [];
  };

  const getLabel = (categoryCode: string, id: string | null | undefined): string => {
    if (!id) return "";
    const values = byCategory(categoryCode);
    const found = values.find((v) => v.id === id);
    return found?.name ?? "";
  };

  const getMetadata = (categoryCode: string, id: string | null | undefined): Record<string, any> | null => {
    if (!id) return null;
    const values = byCategory(categoryCode);
    const found = values.find((v) => v.id === id);
    return found?.metadata ?? null;
  };

  const filterByMeta = (categoryCode: string, metaKey: string, metaValue: string): ReferenceValueNode[] => {
    const values = byCategory(categoryCode);
    return values.filter((v) => {
      const meta = v.metadata;
      if (!meta) return false;
      try {
        const parsed = typeof meta === "string" ? JSON.parse(meta) : meta;
        return parsed[metaKey] === metaValue;
      } catch {
        return false;
      }
    });
  };

  const findIdByText = (categoryCode: string, text: string): string => {
    if (!text) return "";
    const values = byCategory(categoryCode);
    const lower = text.toLowerCase().trim();
    // 1. Exact name or code match
    let found = values.find((v) => v.name === text || v.code === text);
    if (found) return found.id;
    // 2. Case-insensitive name or code
    found = values.find((v) => v.name.toLowerCase() === lower || v.code.toLowerCase() === lower);
    if (found) return found.id;
    // 3. Text CONTAINS the code (e.g. "USA" contains "US")
    found = values.find((v) => v.code && lower.includes(v.code.toLowerCase()));
    if (found) return found.id;
    // 4. Name contains the text (e.g. "United" in "United States")
    found = values.find((v) => v.name.toLowerCase().includes(lower));
    if (found) return found.id;
    // 5. Code contains the text (e.g. "US" in "USA")
    found = values.find((v) => v.code && v.code.toLowerCase().includes(lower));
    if (found) return found.id;
    return "";
  };

  return { data, loading, error, byCategory, getLabel, getMetadata, findIdByText, filterByMeta };
}

export function useReferenceCategory(categoryCode: string) {
  const { byCategory, loading, error } = useReferenceTables();
  return { values: byCategory(categoryCode), loading, error };
}
