import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Smart redirect: suggest the right place based on URL pattern
  const getSuggestedRoute = (): string | null => {
    const path = location.pathname;
    if (path.includes("plant")) return "/system/production-structure/plant";
    if (path.includes("lines")) return "/system/production-structure/production-lines";
    if (path.includes("resources")) return "/system/production-structure/resources";
    if (path.includes("departments")) return "/system/production-structure/departments";
    if (path.includes("groups")) return "/system/production-structure/resource-groups";
    if (path.includes("references") || path.includes("tables")) return "/system/production-structure/references";
    if (path.includes("data-management")) return "/system/production-structure";
    return null;
  };

  const suggestedRoute = getSuggestedRoute();

  // Auto-redirect to Control Tower after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/control-tower", { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-muted">
      <div className="w-[520px] bg-card border border-border rounded-2xl shadow-md p-8 text-center">
        {/* Status Badge */}
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-warning text-warning">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
          Route gap detected
        </span>

        {/* Title */}
        <h1 className="text-4xl font-bold text-foreground mt-3">404</h1>
        <h2 className="text-lg font-semibold text-foreground">Flow interrupted</h2>
        <p className="text-sm text-muted-foreground mt-2">
          This route is not mapped to any workspace, plant, or operational flow.
        </p>

        {/* Flow Visual */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <div className="px-4 py-2 rounded-lg border border-success bg-success text-success text-sm font-medium">
            Known Flow
          </div>
          <span className="text-muted-foreground text-sm">→</span>
          <div className="px-4 py-2 rounded-lg border border-danger bg-danger text-danger text-sm font-medium">
            Missing Route
          </div>
          <span className="text-muted-foreground text-sm">→</span>
          <div className="px-4 py-2 rounded-lg border border-primary bg-accent text-primary text-sm font-medium">
            Recovery Point
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6">
          <button
            onClick={() => navigate("/control-tower")}
            className="px-5 h-10 bg-card text-primary-foreground rounded-lg hover:bg-muted transition-all duration-150 text-sm font-semibold"
          >
            Return to Control Tower
          </button>
          <button
            onClick={() => window.history.back()}
            className="ml-2 px-4 h-10 border border-border text-muted-foreground rounded-lg hover:bg-muted transition-all duration-150 text-sm font-medium"
          >
            Go back
          </button>
        </div>

        {/* Contextual redirect based on URL */}
        {suggestedRoute && (
          <button
            onClick={() => navigate(suggestedRoute)}
            className="mt-3 text-sm text-success hover:underline font-medium"
          >
            Go to {suggestedRoute.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        )}

        {/* Debug info */}
        <div className="mt-6 text-xs text-muted-foreground border border-border rounded-lg p-2">
          Requested path not found in route map
        </div>
      </div>
    </div>
  );
}

