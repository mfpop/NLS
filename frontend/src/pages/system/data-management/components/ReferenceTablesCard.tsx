import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Factory, Package } from "lucide-react";
import { theme } from "../../../../styles/themeTokens";
import { REFERENCE_TABLES_QUERY } from "@/graphql/manufacturingQueries";

interface ReferenceTableRow { id: string; name: string; entryCount: number; }

export function ReferenceTablesCard({ onSelectCompany }: { onSelectCompany?: () => void }) {
  const navigate = useNavigate();
  const { data } = useQuery<{ referenceTables: ReferenceTableRow[] }>(REFERENCE_TABLES_QUERY, {
    fetchPolicy: "cache-and-network", errorPolicy: "all",
  });
  const tables = data?.referenceTables ?? [];

  return (
    <div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${theme.card}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-emerald-500 stroke-current shrink-0" />
          <div className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">Reference Tables</div>
        </div>
        <span className={`text-[10px] ${theme.textMuted}`}>{tables.length + 1}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          <button type="button" onClick={onSelectCompany}
            className="flex w-full items-center gap-2 h-9 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <Factory className="h-3.5 w-3.5 text-emerald-500 stroke-current shrink-0" />
            <span className={`flex-1 text-left text-xs truncate font-medium ${theme.textPrimary}`}>Company</span>
            <span className={`text-[10px] ${theme.textMuted}`}>setup</span>
          </button>
          {tables.map((table) => (
            <button key={table.id} type="button"
              onClick={() => navigate(`/system/data-management/references/${table.id}`)}
              className="flex w-full items-center gap-2 h-9 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <Package className="h-3 w-3 text-slate-400 stroke-current shrink-0" />
              <span className={`flex-1 text-left text-xs truncate ${theme.textPrimary}`}>{table.name}</span>
              <span className={`text-[10px] ${theme.textMuted}`}>{table.entryCount}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
