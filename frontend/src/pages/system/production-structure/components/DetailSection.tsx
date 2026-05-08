import type { ReactNode } from "react";
import { theme } from "@/styles/themeTokens";

export function DetailSectionHeader({ icon, label, children }: { icon?: ReactNode; label: string; children?: ReactNode }) {
  return (
    <div className={`h-8 px-3 flex items-center gap-2 text-[13px] font-semibold ${theme.textMuted} mt-2 first:mt-0 ${theme.subHeader}`}>
      {icon && <span className="flex items-center">{icon}</span>}
      <span className="flex-1">{label}</span>
      {children}
    </div>
  );
}

export function DetailSectionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-3 py-2 ${className}`}><div className="max-w-[1000px] w-full">{children}</div></div>;
}

export function DetailSection({ title, icon, children, headerChildren, bodyClass }: {
  title: string; icon?: ReactNode; children: ReactNode; headerChildren?: ReactNode; bodyClass?: string;
}) {
  return (
    <div className="w-full">
      <DetailSectionHeader icon={icon} label={title}>{headerChildren}</DetailSectionHeader>
      <DetailSectionBody className={bodyClass}>{children}</DetailSectionBody>
    </div>
  );
}
