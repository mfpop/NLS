import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Image, ListOrdered, Shield, FileCheck, User, GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/pages/shared/PageHeader";
import { Toolbar, ToolbarSearch, ToolbarSelect } from "@/components/shared/Toolbar";
import { theme } from "@/styles/themeTokens";
import type { DocumentRevisionStatus, KnowledgeDocument, KnowledgeModuleConfig } from "./types";

const STATUS_STYLES: Record<DocumentRevisionStatus, string> = {
  active: "bg-success/12 text-success border-success/25",
  draft: "bg-warning/12 text-warning border-warning/25",
  pending: "bg-info/12 text-info border-info/25",
  obsolete: "bg-muted text-muted-foreground border-border/40",
};

type StatusFilter = "all" | DocumentRevisionStatus | "pending";

interface KnowledgeModulePageProps {
  icon: ReactNode;
  documents: KnowledgeDocument[];
  config: KnowledgeModuleConfig;
  controlMode?: boolean;
}

const PAGE_SIZE = 20;
const ICON_CLASS = `${theme.iconBoxEmerald}`;

export function KnowledgeModulePage({ icon, documents, config, controlMode = false }: KnowledgeModulePageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(controlMode ? "all" : "active");
  const [selectedId, setSelectedId] = useState<string | null>(documents[0]?.id ?? null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (category !== "all" && doc.category !== category) return false;
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q)
        || doc.category.toLowerCase().includes(q)
        || doc.owner.toLowerCase().includes(q)
        || doc.revision.toLowerCase().includes(q)
        || doc.links.some((l) => l.label.toLowerCase().includes(q))
      );
    });
  }, [documents, search, category, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filtered.length]);

  const selected = paginated.find((d) => d.id === selectedId) ?? paginated[0] ?? null;

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PageHeader icon={icon} iconClass={ICON_CLASS} title={config.title} subtitle={config.subtitle} />
      <Toolbar
        left={<ToolbarSearch value={search} onChange={setSearch} placeholder="Search documents, links, owner..." />}
        right={
          <>
            <ToolbarSelect
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: "All categories" },
                ...config.categories.map((c) => ({ value: c, label: c })),
              ]}
              className="w-50"
            />
            {(controlMode || statusFilter !== "active") && (
              <ToolbarSelect
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { value: "all", label: "All status" },
                  { value: "active", label: "Active" },
                  { value: "draft", label: "Drafts" },
                  { value: "pending", label: "Approvals" },
                  { value: "obsolete", label: "Obsolete" },
                ]}
              />
            )}
          </>
        }
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full min-h-0">
          <aside className="flex w-1/5 shrink-0 flex-col border-r border-border/30 bg-muted/30">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No documents match your search.</p>
              ) : (
                paginated.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      selected?.id === doc.id
                        ? "border-border/50 bg-card shadow-sm"
                        : "border-transparent hover:border-border/30 hover:bg-card/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground line-clamp-2">{doc.title}</span>
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold border ${STATUS_STYLES[doc.status]}`}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{doc.category} · {doc.revision}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {doc.links.slice(0, 2).map((link) => (
                        <span key={link.id} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {link.type}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
            {pageCount > 1 && (
              <div className="shrink-0 flex items-center justify-between border-t border-border/30 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">{page} / {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </aside>

          <main className="flex min-w-0 flex-[4] flex-col overflow-hidden bg-card">
            {selected ? (
              <DocumentDetail doc={selected} showYamazumiLink={config.showOperationalYamazumiLink} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileCheck className="h-8 w-8 stroke-current opacity-50" />
                <p className="text-sm font-medium">Select a document</p>
              </div>
            )}
          </main>
        </div>
      </div>
      <div className="shrink-0 flex h-10 items-center gap-5 border-t border-border bg-muted px-4 text-xs font-medium text-muted-foreground">
        <span>{filtered.length} document{filtered.length === 1 ? "" : "s"}{pageCount > 1 && <> · Page {page} of {pageCount}</>}</span>
        <span className="text-muted-foreground/80">Linked to manufacturing flow · one active revision per document</span>
      </div>
    </div>
  );
}

function DocumentDetail({ doc, showYamazumiLink }: { doc: KnowledgeDocument; showYamazumiLink?: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border/25 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{doc.category}</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{doc.title}</h2>
          </div>
          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-semibold border ${STATUS_STYLES[doc.status]}`}>
            {doc.status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> Owner: <strong className="font-medium text-foreground">{doc.owner}</strong></span>
          <span className="inline-flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> {doc.revision}</span>
          <span>Effective: {doc.effectiveDate}</span>
        </div>
      </header>

      <section className="border-b border-border/20 px-5 py-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" /> Linked process & resources
        </h3>
        <div className="flex flex-wrap gap-2">
          {doc.links.map((link) => (
            <Link
              key={`${link.type}-${link.id}`}
              to={link.href}
              className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-muted/50 px-2 py-1 text-xs font-medium text-foreground hover:border-info/30 hover:bg-info/10 hover:text-info"
            >
              <span className="text-muted-foreground">{link.type}</span>
              {link.label}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          ))}
        </div>
        {doc.links.length === 0 && (
          <p className="text-xs text-danger">Orphan document — link to manufacturing flow before approval.</p>
        )}
      </section>

      {showYamazumiLink && doc.category === "Yamazumi Standards" && (
        <section className="border-b border-border/20 bg-info/5 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Operational line balancing and live Yamazumi charts belong in{" "}
            <Link to="/plan/capacity/yamazumi" className="font-semibold text-info hover:underline">
              Plan → Capacity Planning → Yamazumi
            </Link>
            . This module keeps methodology and reference standards only.
          </p>
        </section>
      )}

      <section className="border-b border-border/20 px-5 py-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Image className="h-3.5 w-3.5" /> Visual section
        </h3>
        <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border/40 bg-muted/40 px-4 py-6 text-center">
          <p className="max-w-lg text-sm text-muted-foreground">{doc.visualSummary}</p>
        </div>
      </section>

      <section className="border-b border-border/20 px-5 py-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ListOrdered className="h-3.5 w-3.5" /> Work sequence
        </h3>
        <ol className="space-y-1.5">
          {doc.workSequence.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="px-5 py-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-3.5 w-3.5" /> Safety & quality notes
        </h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {doc.safetyQualityNotes.length > 0 ? (
            doc.safetyQualityNotes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                {note}
              </li>
            ))
          ) : (
            <li className="italic">None specified</li>
          )}
        </ul>
      </section>
    </div>
  );
}
