import { useState, type FormEvent } from "react";
import { CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator } from "@/auth/PasswordStrengthIndicator";
import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useParams, useNavigate, Link } from "react-router-dom";

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      ok
      message
    }
  }
`;

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [resetPassword] = useMutation(RESET_PASSWORD_MUTATION);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid reset link. No token found.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await resetPassword({
        variables: {
          input: { token, new_password: newPassword },
        },
      });
      const result = data as { resetPassword?: { ok: boolean; message: string } } | undefined;
      if (result?.resetPassword?.ok) {
        setSuccess(true);
      } else {
        setError(result?.resetPassword?.message || "Failed to reset password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background px-4 relative">
      {/* Soft radial glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/8 blur-[150px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/6 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-orange-500/3 blur-[180px]" />                  <PasswordStrengthIndicator password={newPassword} />
                </div>

      <div className="w-full max-w-[480px] max-sm:max-w-[90vw] rounded-2xl bg-card/55 backdrop-blur-2xl border border-white/30 shadow-xl shadow-black/8 shadow-2xl shadow-black/4 ring-1 ring-white/15 p-6">
        {/* ── Branding header ── */}
        <div className="flex flex-col items-center mb-2">
          <div className="flex flex-col items-center">
            <Link to="/login" className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden shrink-0">
                <img src="/logo/icon-128.png" alt="" className="h-9 w-9 object-contain" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }} />
              </div>
              <div className="leading-snug">
                <div className="text-[26px] font-bold text-foreground tracking-tight leading-none">LeanSynk</div>
                <div className="mt-[3px] text-[10px] font-semibold text-muted-foreground tracking-[0.08em] leading-none">LEAN MANUFACTURING</div>
              </div>
            </Link>
            <h1 className="text-sm font-medium text-foreground/80 mt-4 mb-1">
              {success ? "Password reset" : "Set new password"}
            </h1>
          </div>
        </div>

        {/* ── SUCCESS VIEW ── */}
        {success ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-10 w-10 text-success" />
              <p className="text-sm text-foreground/80 text-center">
                Your password has been reset successfully.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full h-8 rounded-[10px] px-4 text-sm font-semibold text-primary-foreground bg-success/95 hover:brightness-[1.02] hover:shadow-md hover:shadow-black/[0.12] active:shadow-inner active:shadow-black/15 active:brightness-90 shadow-sm shadow-black/[0.08] transition-all duration-150 active:scale-[0.98]"
            >
              Sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* ── Error banner for invalid/missing token ── */}
            {!token && (
              <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Invalid reset link. No reset token found in the URL.</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="reset-password">
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 pr-9"
                  required
                  minLength={8}
                  autoFocus
                  aria-required
                  autoComplete="new-password"
                  disabled={!token}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  tabIndex={-1}
                  disabled={!token}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Minimum 8 characters
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="reset-confirm">
                Confirm new password
              </label>
              <input
                id="reset-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60"
                required
                minLength={8}
                aria-required
                disabled={!token}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !token}
              aria-busy={submitting}
              className={`w-full h-8 rounded-[10px] px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-black/[0.08] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-success/30 active:scale-[0.98] ${
                submitting || !token ? "opacity-60 cursor-not-allowed" : "bg-success/95 hover:brightness-[1.02] hover:shadow-md hover:shadow-black/[0.12] active:shadow-inner active:shadow-black/15 active:brightness-90"
              }`}
            >
              {submitting ? "Resetting..." : "Reset password"}
            </button>

            <div className="text-center pt-1">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}                  <PasswordStrengthIndicator password={newPassword} />
                </div>
    </div>
  );
}
