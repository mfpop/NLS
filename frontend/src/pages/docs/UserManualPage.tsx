import { useQuery } from "@apollo/client/react";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { theme } from "@/styles/themeTokens";
import { MarkdownReader } from "@/pages/DocumentationCenter/MarkdownReader";
import { DOCUMENTATION_FILE_QUERY } from "@/graphql";
import type { DocumentationFileQueryData, DocumentationFileQueryVars } from "@/pages/DocumentationCenter/documentationTypes";

export function UserManualPage() {
  const { data, loading, error } = useQuery<DocumentationFileQueryData, DocumentationFileQueryVars>(
    DOCUMENTATION_FILE_QUERY,
    { variables: { name: "USER_MANUAL.md" }, fetchPolicy: "cache-first" }
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

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader
        icon={<BookOpen className="h-5 w-5 stroke-current" />}
        iconClass={theme.iconBoxBlue}
        title="User Manual"
        subtitle="Lean manufacturing documentation and reference."
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <MarkdownReader document={data.documentationFile} hideHeader />
      </div>
    </div>
  );
}
