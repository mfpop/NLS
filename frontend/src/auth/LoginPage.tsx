import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await login(username, password);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      navigate("/control-tower", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm border-border bg-card"
      >
        <img src="/leansynk-logo.svg" alt="LeanSynk" className="mx-auto mb-6 h-14 w-auto" />

        {error && (
          <div className="mb-4 rounded-lg border border-danger bg-danger px-3 py-2 text-sm text-danger border-danger bg-danger text-danger">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground text-muted-foreground" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm border-border bg-muted text-foreground"
            required
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-foreground text-muted-foreground" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm border-border bg-muted text-foreground"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-success px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-success disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-6 border-t border-border pt-4 border-border">
          <p className="text-xs text-muted-foreground">Demo accounts: admin / owner / manager / supervisor / guest</p>
          <p className="text-xs text-muted-foreground">Password: <span className="font-mono">{username}123</span></p>
        </div>
      </form>
    </div>
  );
}
