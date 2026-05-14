import { Moon, SlidersHorizontal, Sun } from "lucide-react";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { useThemeStore } from "@/stores/theme";

export function UserPreferencesPage() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <AppPageLayout
      title="Preferences"
      subtitle="Set your personal app preferences, notification options, and interface behavior defaults."
      icon={<SlidersHorizontal />}
    >
      <div className="preferences-grid">
        <section className="preferences-card" aria-labelledby="theme-preference-title">
          <div className="preferences-card__header">
            <div>
              <p className="preferences-card__eyebrow">Appearance</p>
              <h2 id="theme-preference-title" className="preferences-card__title">
                Theme mode
              </h2>
            </div>
            <span className="preferences-card__pill">{theme === "dark" ? "Dark active" : "Light active"}</span>
          </div>

          <p className="preferences-card__description">
            Choose the visual mode that feels best for your workspace. Your selection is saved on this device.
          </p>

          <div className="theme-toggle" role="radiogroup" aria-label="Theme mode">
            <button
              type="button"
              role="radio"
              aria-checked={theme === "light"}
              className={"theme-toggle__option" + (theme === "light" ? " theme-toggle__option--active" : "")}
              onClick={() => setTheme("light")}
            >
              <span className="theme-toggle__icon-wrap">
                <Sun className="theme-toggle__icon" />
              </span>
              <span className="theme-toggle__copy">
                <span className="theme-toggle__label">Light</span>
                <span className="theme-toggle__hint">Bright control-room canvas</span>
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === "dark"}
              className={"theme-toggle__option" + (theme === "dark" ? " theme-toggle__option--active" : "")}
              onClick={() => setTheme("dark")}
            >
              <span className="theme-toggle__icon-wrap">
                <Moon className="theme-toggle__icon" />
              </span>
              <span className="theme-toggle__copy">
                <span className="theme-toggle__label">Dark</span>
                <span className="theme-toggle__hint">Lower-glare command center</span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </AppPageLayout>
  );
}
