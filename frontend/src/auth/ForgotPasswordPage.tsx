import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Link } from "react-router-dom";

const FORGOT_PASSWORD_MUTATION = gql`
  mutation RequestPasswordReset($usernameOrEmail: String!) {
    requestPasswordReset(usernameOrEmail: $usernameOrEmail) {
      message
    }
  }
`;

export function ForgotPasswordPage() {
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotMessageKind, setForgotMessageKind] = useState<"success" | "error" | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const [requestPasswordReset] = useMutation(FORGOT_PASSWORD_MUTATION);

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    setForgotMessageKind(null);
    setForgotSubmitting(true);
    try {
      await requestPasswordReset({ variables: { usernameOrEmail: forgotEmail } });
      setForgotMessage("If an account exists, reset instructions were sent.");
      setForgotMessageKind("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("rate") || msg.includes("too many") || msg.includes("429")) {
        setForgotMessage("Too many attempts. Try again later.");
        setForgotMessageKind("error");
      } else {
        setForgotMessage("Too many attempts. Try again later.");
        setForgotMessageKind("error");
      }
    }
    setForgotSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background px-4 relative">
      {/* Soft radial glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-success/100/8 blur-[150px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-warning/100/3 blur-[180px]" />
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
            <h1 className="text-sm font-medium text-foreground/80 mt-4 mb-1">Reset your password</h1>
            <p className="text-xs text-muted-foreground text-center max-w-[28ch] leading-snug">
              Enter your username or email and we&apos;ll send reset instructions.
            </p>
          </div>
        </div>

        <form onSubmit={handleForgotSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/85" htmlFor="forgot-email">
              Username or email
            </label>
            <input
              id="forgot-email"
              type="text"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full rounded-[10px] border border-input/85 px-3 py-1.5 text-sm bg-background/65 backdrop-blur-md text-foreground shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60"
              required
              autoFocus
              aria-required
            />
          </div>

          <div aria-live="polite" className="min-h-9 rounded-md px-3 py-2 text-sm">
            {forgotMessage && forgotMessageKind === "success" && (
              <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-success">
                {forgotMessage}
              </div>
            )}
            {forgotMessage && forgotMessageKind === "error" && (
              <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-danger">
                {forgotMessage}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={forgotSubmitting}
            aria-busy={forgotSubmitting}
            className={`w-full h-8 rounded-[10px] px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-black/[0.08] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-success/30 active:scale-[0.98] ${
              forgotSubmitting
                ? "opacity-60 cursor-not-allowed"
                : "bg-success/95 hover:brightness-[1.02] hover:shadow-md hover:shadow-black/[0.12] active:shadow-inner active:shadow-black/15 active:brightness-90"
            }`}
          >
            {forgotSubmitting ? "Sending..." : "Send reset instructions"}
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
      </div>
    </div>
  );
}
