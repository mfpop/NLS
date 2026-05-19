import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useAuth } from "@/auth/AuthContext";
import { resetActiveLineState } from "@/stores/activeLineStore";
import { useSidebarStore } from "@/stores/sidebar";

export function SignOutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const collapseForUserNavigation = useSidebarStore((s) => s.collapseForUserNavigation);

  useEffect(() => {
    resetActiveLineState();
    collapseForUserNavigation();
    logout();
    const timer = setTimeout(() => navigate("/login", { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [logout, navigate, collapseForUserNavigation]);

  return (
    <AppPageLayout
      title="Sign Out"
      subtitle="You have been signed out. Redirecting to login..."
      icon={<LogOut />}
    />
  );
}
