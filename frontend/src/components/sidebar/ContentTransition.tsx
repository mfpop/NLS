import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export function ContentTransition() {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeoutId = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  return (
    <div className={"content-transition " + (loading ? "content-transition--loading" : "content-transition--ready")}>
      <Outlet />
    </div>
  );
}
