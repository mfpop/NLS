import { theme } from "@/styles/themeTokens";

const variants = {
  primary: `${theme.buttonPrimary} h-10 px-4 rounded-xl inline-flex items-center gap-2 font-medium`,
  secondary: `${theme.buttonSecondary} h-10 px-4 rounded-xl inline-flex items-center gap-2 font-medium`,
  ghost: `${theme.buttonGhost} h-10 px-3 rounded-xl inline-flex items-center gap-2 font-medium`,
  danger: `${theme.buttonDanger} h-10 px-4 rounded-xl inline-flex items-center gap-2 font-medium`,
  icon: `${theme.buttonSecondary} w-10 h-10 rounded-xl inline-flex items-center justify-center`,
  compact: `${theme.buttonGhost} h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-medium`,
};

export function AppButton({ variant = "secondary", children, className = "", ...props }) {
  const base = variants[variant] || variants.secondary;
  return (
    <button type="button" className={`${base} transition-colors active:scale-[0.97] ${className}`} {...props}>
      {children}
    </button>
  );
}
