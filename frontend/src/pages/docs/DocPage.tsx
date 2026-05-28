import { useQuery } from "@apollo/client/react";
import { DOCUMENTATION_FILE_QUERY } from "@/graphql";
import { MarkdownReader } from "@/pages/DocumentationCenter/MarkdownReader";
import type { DocumentationFileQueryData, DocumentationFileQueryVars } from "@/pages/DocumentationCenter/documentationTypes";

export function DocPage({ name }: { name: string }) {
  const { data, loading, error } = useQuery<DocumentationFileQueryData, DocumentationFileQueryVars>(
    DOCUMENTATION_FILE_QUERY,
    { variables: { name }, fetchPolicy: "cache-first" }
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error || !data?.documentationFile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-danger">Failed to load document.</p>
      </div>
    );
  }

  return <MarkdownReader document={data.documentationFile} />;
}
