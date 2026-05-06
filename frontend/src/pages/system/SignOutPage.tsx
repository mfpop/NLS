import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { ModulePage } from "@/pages/shared/ModulePage";
import { useAuth } from "@/auth/AuthContext";

export function SignOutPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    const timer = setTimeout(() => navigate("/login", { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [logout, navigate]);

  return (
    <ModulePage
      title="Sign Out"
      description="You have been signed out. Redirecting to login..."
      icon={<LogOut className="h-5 w-5" />}
    />
  );
}
