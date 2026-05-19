import { useMemo } from "react";

interface Props {
  password: string;
}

type Strength = "empty" | "weak" | "medium" | "strong";

function computeStrength(password: string): Strength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (score <= 1) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const CONFIG: Record<Strength, { label: string; bars: number; className: string }> = {
  empty: { label: "", bars: 0, className: "" },
  weak: { label: "Weak", bars: 1, className: "bg-danger" },
  medium: { label: "Medium", bars: 2, className: "bg-warning" },
  strong: { label: "Strong", bars: 3, className: "bg-success" },
};

export function PasswordStrengthIndicator({ password }: Props) {
  const strength = useMemo(() => computeStrength(password), [password]);
  const config = CONFIG[strength];

  if (strength === "empty") return null;

  return (
    <div className="mt-1.5" role="progressbar" aria-valuenow={config.bars} aria-valuemin={0} aria-valuemax={3} aria-label={`${config.label} password`}>
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < config.bars ? config.className : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${strength === "weak" ? "text-danger" : strength === "medium" ? "text-warning" : "text-success"}`}>
        {config.label}
      </p>
    </div>
  );
}
