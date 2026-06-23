import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator } from "@/auth/PasswordStrengthIndicator";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from "react-router-dom";

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      ok
      message
    }
  }
`;

const SELF_REGISTRATION_QUERY = gql`
  query SelfRegistrationSetting {
    applicationSettings(category: "security") {
      key
      value
    }
  }
`;

type LoginView = "login" | "register";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Login state ──
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── View switching ──
  const [view, setView] = useState<LoginView>("login");

  // ── Self-registration policy ──
  const { data: securitySettings } = useQuery<{ applicationSettings: { key: string; value: unknown }[] }>(SELF_REGISTRATION_QUERY, { fetchPolicy: "cache-first" });
  const selfRegEnabled = (securitySettings?.applicationSettings ?? []).find(
    (s: { key: string; value: unknown }) => s.key === "security.self_registration_enabled"
  )?.value !== false;

  // ── Register state ──
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirm, setRegShowConfirm] = useState(false);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regMessageKind, setRegMessageKind] = useState<"error" | "info" | "success" | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [registerMutation] = useMutation(REGISTER_MUTATION);

  // ── Login submit ──
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

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Register submit ──
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRegMessage(null);
    setRegMessageKind(null);

    if (!regUsername.trim()) {
      setRegMessage("Username is required.");
      setRegMessageKind("error");
      return;
    }
    if (!regEmail.trim() || !EMAIL_REGEX.test(regEmail)) {
      setRegMessage("Please enter a valid email address.");
      setRegMessageKind("error");
      return;
    }
    if (regPassword.length < 8) {
      setRegMessage("Password must be at least 8 characters.");
      setRegMessageKind("error");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegMessage("Passwords do not match.");
      setRegMessageKind("error");
      return;
    }

    setRegSubmitting(true);
    try {
      const { data } = await registerMutation({
        variables: {
          input: {
            username: regUsername,
            email: regEmail,
            password: regPassword,
          },
        },
      });
      const result = data as { register?: { ok: boolean; message: string } } | undefined;
      if (result?.register?.ok) {
        setRegMessage("Account created successfully. You can now sign in.");
        setRegMessageKind("success");
      } else {
        setRegMessage(result?.register?.message || "Registration failed.");
        setRegMessageKind("error");
      }
    } catch {
      setRegMessage("Something went wrong. Please try again.");
      setRegMessageKind("error");
    }
    setRegSubmitting(false);
  };

  // ── Navigate back to login ──
  const goBack = () => {
    setView("login");
    setRegMessage(null);
    setRegMessageKind(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background px-4 relative">
      {/* Soft radial glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/8 blur-[150px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/6 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-orange-500/3 blur-[180px]" />
      </div>

      <div className="w-full max-w-[480px] max-sm:max-w-[90vw] rounded-2xl bg-card/55 backdrop-blur-2xl border border-white/30 shadow-xl shadow-black/8 shadow-2xl shadow-black/4 ring-1 ring-white/15 p-6">
        {/* ── Branding header ── */}
        <div className="flex flex-col items-center mb-2">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden shrink-0">
                <img src="/logo/icon-128.png" alt="" className="h-9 w-9 object-contain" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }} />
              </div>
              <div className="leading-snug">
                <div className="text-[26px] font-bold text-foreground tracking-tight leading-none">LeanSynk</div>
                <div className="mt-[3px] text-[10px] font-semibold text-muted-foreground tracking-[0.08em] leading-none">LEAN MANUFACTURING</div>
              </div>
            </div>
            {view === "login" && (
              <h1 className="text-sm font-medium text-foreground/80 mt-4 mb-1">Sign in to LeanSynk</h1>
            )}
            {view === "register" && (
              <h1 className="text-sm font-medium text-foreground/80 mt-4 mb-1">Create an account</h1>
            )}
          </div>
        </div>

        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60"
                required
                autoFocus
                aria-required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-foreground/85" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-medium text-primary/70 hover:text-primary/90 hover:underline transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 pr-9"
                  required
                  aria-required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className={`w-full h-8 rounded-[10px] px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-black/[0.08] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-success/30 active:scale-[0.98] ${submitting ? "opacity-60 cursor-not-allowed" : "bg-success/95 hover:brightness-[1.02] hover:shadow-md hover:shadow-black/[0.12] active:shadow-inner active:shadow-black/15 active:brightness-90"}`}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setView("register")}
                className="font-medium text-primary/70 hover:text-primary/90 hover:underline transition-colors"
              >
                Create account
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER VIEW ── */}
        {view === "register" && (
          <div className="space-y-3">
            {!selfRegEnabled ? (
              <div className="py-4 text-center">
                <p className="text-sm text-foreground/80">
                  Account creation requires administrator invitation.
                </p>
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="reg-username">
                    Username
                  </label>
                  <input
                    id="reg-username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60"
                    required
                    autoFocus
                    aria-required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="reg-email">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60"
                    required
                    aria-required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="reg-password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={regShowPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 pr-9"
                      required
                      minLength={8}
                      aria-required
                    />
                    <button
                      type="button"
                      onClick={() => setRegShowPassword((s) => !s)}
                      aria-label={regShowPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={regPassword} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="reg-confirm">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm"
                      type={regShowConfirm ? "text" : "password"}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 pr-9"
                      required
                      minLength={8}
                      aria-required
                    />
                    <button
                      type="button"
                      onClick={() => setRegShowConfirm((s) => !s)}
                      aria-label={regShowConfirm ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {regShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div aria-live="polite" className="min-h-10">
                  {regMessage && regMessageKind === "error" && (
                    <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {regMessage}
                    </div>
                  )}
                  {regMessage && regMessageKind === "success" && (
                    <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                      {regMessage}
                    </div>
                  )}
                  {regMessage && regMessageKind === "info" && (
                    <div className="rounded-md border border-border/30 bg-muted/40 px-3 py-2 text-sm text-foreground/80">
                      {regMessage}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className={`w-full h-8 rounded-[10px] px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-black/[0.08] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-success/30 active:scale-[0.98] ${regSubmitting ? "opacity-60 cursor-not-allowed" : "bg-success/95 hover:brightness-[1.02] hover:shadow-md hover:shadow-black/[0.12] active:shadow-inner active:shadow-black/15 active:brightness-90"}`}
                >
                  {regSubmitting ? "Creating account..." : "Create account"}
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
