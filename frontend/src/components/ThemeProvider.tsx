import type { ReactNode } from "react";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Set data-theme for CSS variable approach (legacy)
    document.documentElement.setAttribute("data-theme", theme);
    // Set class for Tailwind dark mode (primary)
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return <>{children}</>;
}
