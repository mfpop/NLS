import React from 'react';
import { theme } from "@/styles/themeTokens";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={`block font-medium ${theme.textPrimary} mb-1 text-sm`}>
      {children}
    </label>
  );
}
