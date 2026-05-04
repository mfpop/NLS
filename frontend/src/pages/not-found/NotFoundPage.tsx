import { Link } from "react-router-dom";
import { theme } from "../../styles/themeTokens";

export function NotFoundPage() {
  return (
    <main className={`flex h-full items-center justify-center p-6 ${theme.page}`} style={{ minHeight: 0 }}>
      <section className={`w-full max-w-3xl rounded-2xl border p-8 shadow-sm ${theme.card}`}>
        {/* Route gap badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          Route gap detected
        </div>

        {/* 404 Heading */}
        <div className="mt-5">
          <h1 className={`text-5xl font-black tracking-tight ${theme.textPrimary}`}>404</h1>
          <h2 className={`mt-2 text-2xl font-bold ${theme.textPrimary}`}>Flow interrupted</h2>
          <p className={`mt-3 max-w-xl text-sm leading-6 ${theme.textSecondary}`}>
            This route is not mapped to any LeanSynk workspace, control board, or production flow.
            Return to Control Tower to restore the operational path.
          </p>
        </div>

        {/* Flow Visual — Known Flow → Missing Route → Recovery Point */}
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="text-xs font-bold uppercase text-emerald-700">Known flow</div>
            <div className={`text-sm font-semibold ${theme.textPrimary}`}>LeanSynk</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px w-10 bg-slate-200 dark:bg-slate-700" />
            <div className="route-gap rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              Missing route
            </div>
            <div className="h-px w-10 bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
            <div className="text-xs font-bold uppercase text-blue-700">Recovery point</div>
            <div className={`text-sm font-semibold ${theme.textPrimary}`}>Control Tower</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/control-tower"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
          >
            Return to Control Tower
          </Link>
          <button
            onClick={() => window.history.back()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 transition-colors"
          >
            Go back
          </button>
        </div>

        {/* Diagnostic footer */}
        <div className={`mt-6 rounded-xl p-3 text-xs ${theme.card} ${theme.textSecondary}`}>
          Requested path could not be matched in the application route map.
        </div>
      </section>
    </main>
  );
}

