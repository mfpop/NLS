/**
 * @fileoverview Disallow hardcoded CSS color values in TSX/TS source files.
 *
 * This rule flags:
 *   - String literals containing hex colors (#fff, #ffffff, #aabbccdd)
 *   - String literals containing rgb(), rgba(), hsl(), hsla()
 *   - JSX attributes with hex color strings (stroke, fill, stopColor, etc.)
 *   - Inline style objects with color values
 *
 * Does NOT flag:
 *   - Tailwind utility classes (className="bg-red-500 text-blue-600")
 *   - CSS variable references (var(--color-*))
 *   - Known CSS keywords (currentColor, transparent, inherit, initial, unset)
 *   - Files matching allowGlobs (e.g. theme config, entity colors)
 *   - SVG <defs> and <marker> definitions (required for SVG rendering)
 */

const HEX_COLOR_RE =
  /(?<![a-zA-Z0-9-])(?:#)((?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?))\b/g;
const RGB_RE = /\brgba?\s*\(/gi;
const HSL_RE = /\bhsla?\s*\(/gi;

/**
 * CSS keywords that are never hardcoded raw colors.
 */
const CSS_KEYWORDS = new Set([
  "currentColor",
  "currentcolor",
  "transparent",
  "inherit",
  "initial",
  "unset",
  "none",
]);

/**
 * Check if a value contains a CSS variable reference.
 * If it does, the color is not hardcoded — it references a theme token.
 */
function hasCssVar(value) {
  return /var\s*\(--/.test(value);
}

/**
 * Check if the calling node is inside SVG <defs> or <marker> elements.
 * These must use raw hex values for marker arrowheads and SVG filters.
 */
function isInsideSvgDefsOrMarker(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === "JSXElement" &&
      current.openingElement &&
      current.openingElement.name
    ) {
      const tagName =
        current.openingElement.name.name || "";
      if (tagName === "defs" || tagName === "marker") {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/**
 * Convert a simple glob pattern (with * and ?) to a regex string,
 * properly escaping regex special characters in the non-wildcard parts.
 */
function globToRegex(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow hardcoded CSS color values in source code. Use Tailwind utility classes or CSS variables instead.",
      recommended: false,
    },
    fixable: false,
    schema: [
      {
        type: "object",
        properties: {
          allowGlobs: {
            type: "array",
            items: { type: "string" },
            description:
              "File glob patterns to skip entirely (e.g. themeTokens, entityColors)",
          },
          allowHexPatterns: {
            type: "array",
            items: { type: "string" },
            description:
              "Regex patterns for hex values that are allowed (e.g. data-driven SVG colors)",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hexColor:
        "Hardcoded hex color '{{value}}' found. Use a Tailwind utility class (e.g. text-red-500, bg-blue-600) or a CSS variable (var(--color-*)).",
      rgbColor:
        "Hardcoded rgb/rgba color '{{value}}' found. Use a Tailwind utility class or CSS variable instead.",
      hslColor:
        "Hardcoded hsl/hsla color '{{value}}' found. Use a Tailwind utility class or CSS variable instead.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowGlobs = options.allowGlobs || [];
    const allowHexPatterns = options.allowHexPatterns || [];

    const filename = context.filename || context.getFilename();

    // Skip allowed file globs (e.g. theme config files that need hex values)
    for (const glob of allowGlobs) {
      const pattern = new RegExp(globToRegex(glob));
      if (pattern.test(filename)) {
        return {};
      }
    }

    // Compile allowed hex patterns
    const allowedHexRegexes = allowHexPatterns.map((p) => new RegExp(p));

    /**
     * Test whether a hex value match should be allowed.
     * @param {string} value - The full hex match (e.g. "#ff0000")
     */
    function isHexAllowed(value) {
      if (CSS_KEYWORDS.has(value)) return true;
      if (hasCssVar(value)) return true;
      if (allowedHexRegexes.some((r) => r.test(value))) return true;
      return false;
    }

    /**
     * Test whether an rgb/hsl color string should be allowed.
     * @param {string} value - The full string containing rgb()/hsl()
     */
    function isRgbHslAllowed(value) {
      // If the string also references a CSS variable, it's not hardcoded
      if (hasCssVar(value)) return true;
      return false;
    }

    /**
     * Report a hardcoded color found in a string literal.
     */
    function checkStringLiteral(node, value) {
      if (!value || typeof value !== "string") return;
      if (!value.trim()) return;

      // Check hex colors
      let match;
      HEX_COLOR_RE.lastIndex = 0;
      while ((match = HEX_COLOR_RE.exec(value)) !== null) {
        const fullMatch = match[0];
        const hexDigits = match[1];
        if (
          hexDigits &&
          (hexDigits.length === 3 ||
            hexDigits.length === 6 ||
            hexDigits.length === 8)
        ) {
          if (!isHexAllowed(fullMatch)) {
            if (isInsideSvgDefsOrMarker(node)) continue;
            context.report({
              node,
              messageId: "hexColor",
              data: { value: fullMatch },
            });
          }
        }
      }

      // Check rgb/rgba (skip if value uses CSS variables)
      RGB_RE.lastIndex = 0;
      if (RGB_RE.test(value) && !isRgbHslAllowed(value)) {
        context.report({
          node,
          messageId: "rgbColor",
          data: {
            value:
              value.slice(0, 30) + (value.length > 30 ? "..." : ""),
          },
        });
      }

      // Check hsl/hsla (skip if value uses CSS variables)
      HSL_RE.lastIndex = 0;
      if (HSL_RE.test(value) && !isRgbHslAllowed(value)) {
        context.report({
          node,
          messageId: "hslColor",
          data: {
            value:
              value.slice(0, 30) + (value.length > 30 ? "..." : ""),
          },
        });
      }
    }

    return {
      // String literal: "some string with #ff0000"
      Literal(node) {
        if (typeof node.value === "string") {
          checkStringLiteral(node, node.value);
        }
      },

      // Template literal: `some string with #ff0000`
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkStringLiteral(node, quasi.value.raw);
        }
      },

      // JSX attribute: stroke="#ff0000" or fill="#00ff00"
      JSXAttribute(node) {
        if (
          node.value &&
          node.value.type === "Literal" &&
          typeof node.value.value === "string"
        ) {
          checkStringLiteral(node.value, node.value.value);
        }
      },
    };
  },
};
