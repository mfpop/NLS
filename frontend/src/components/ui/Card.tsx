import React from 'react';
import { theme } from "@/styles/themeTokens";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className={`rounded-lg ${theme.card} p-4`}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {children}
    </div>
  );
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {children}
    </div>
  );
}
