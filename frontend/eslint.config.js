import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import noHardcodedColors from "./eslint-rules/no-hardcoded-colors.js";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "no-hardcoded-colors": {
        rules: {
          "disallow": noHardcodedColors,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-hardcoded-colors/disallow": ["error", {
        allowGlobs: [
          // Theme configuration files that intentionally define color values
          "styles/themeTokens",
          "styles/themeTokens.js",
          "styles/themeTokens.ts",
          "styles/theme.css",
          // Entity color mapping for data visualization
          "production-structure/config/entityColors",
          // Quality status style definitions
          "check/quality-control/QualityStatusStyles",
          "maintenance/breakdowns/BreakdownStatusStyles",
          // VSM template marker definitions (SVG <marker> elements need raw hex)
          "execution/vsm/template/StandardVsmTemplate.tsx",
          "execution/vsm/template/VsmInformationArrow.tsx",
        ],
        allowHexPatterns: [
          // SVG <marker> definitions inside StandardVsmTemplate
          "^#334155$",
          "^#3b82f6$",
          "^#f59e0b$",
          "^#16a34a$",
          "^#ea580c$",
          "^#1e293b$",
          "^#64748b$",
          "^#2563eb$",
          "^#7c3aed$",
          "^#475569$",
          "^#e2e8f0$",
          "^#cbd5e1$",
          "^#94a3b8$",
          "^#dc2626$",
          "^#d97706$",
          "^#047857$",
          "^#0f172a$",
          "^#f8fafc$",
          "^#ffffff$",
          "^#10b981$",
        ],
      }],
    },
  }
);
