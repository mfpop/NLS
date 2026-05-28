import { useCallback, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { BookOpen, Copy, Check } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Toolbar, ToolbarSearch, ToolbarButton } from "@/components/shared/Toolbar";
import { MarkdownReader } from "@/pages/DocumentationCenter/MarkdownReader";
import { DOCUMENTATION_FILE_QUERY } from "@/graphql";
import type { DocumentationFileQueryData, DocumentationFileQueryVars } from "@/pages/DocumentationCenter/documentationTypes";

export function UserManualPage() {
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const { data, loading, error } = useQuery<DocumentationFileQueryData, DocumentationFileQueryVars>(
    DOCUMENTATION_FILE_QUERY,
    { variables: { name: "USER_MANUAL.md" }, fetchPolicy: "cache-first" }
  );

  const handleCopy = useCallback(() => {
    const text = data?.documentationFile?.content;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

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
        title="User Manual"
        subtitle="Lean manufacturing documentation and reference."
      />
      <Toolbar
        left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search in manual..." />}
        right={<ToolbarButton icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} onClick={handleCopy} />}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <MarkdownReader document={data.documentationFile} findQuery={search || undefined} onFindQueryChange={setSearch} />
      </div>
      <div className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span>User Manual</span>
        <span className="text-muted-foreground/80">LeanSynk Documentation</span>
      </div>
    </div>
  );
}
