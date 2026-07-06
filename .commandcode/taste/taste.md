# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# agents
- Always use the Nexus agent system from the agent-architecture/ directory for task routing and orchestration. Confidence: 0.90

# frontend
- Replace hardcoded CSS color classes (slate, blue, red, green, amber, emerald, orange) with semantic CSS tokens (muted, primary, danger, success, warning, border, background, foreground) across frontend components. Confidence: 0.70
- Use Tailwind font-size/font-weight classes (text-xl font-semibold, etc.) for title, subtitle, and tile styling instead of HTML heading tags (h2, h3, etc.). Confidence: 0.80
- Use the shared PageHeader component/format for page headers across all pages (including preferences). Confidence: 0.65

# git
- Use MMDD HHMM timestamp format (e.g., "0703 2208") as the commit message subject line. Confidence: 0.70

# vsm
See [vsm/taste.md](vsm/taste.md)
