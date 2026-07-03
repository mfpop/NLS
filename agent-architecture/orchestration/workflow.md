# OpenCode Workflow

For every task:

1. Classify task
- general coordination
- governance
- backend
- frontend
- audit
- deployment

2. Select correct agent
Use routing.md.

3. Use MCP only when useful
Use MCP to reduce tokens, inspect files, verify diffs, run checks, or search docs.

4. Inspect first
Do not propose changes before checking relevant files.

5. Read minimal files
Use targeted search before opening large files.

6. Preserve architecture
Do not violate project rules.

7. Implement with small patches
Prefer focused changes over broad rewrites.

8. Verify
Use tests/typecheck/lint/git diff when relevant.

9. Report concisely
Return:
- files changed
- summary
- verification
- risks
- next step
