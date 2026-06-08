# Chat Response Skill

## Description
Responds to general conversation and casual queries from the user, and triages unclear or ambiguous requests that don't fit other specialized skills. Acts as the default handler for the Nexus General Chat agent.

**Skill ID:** `chat_response`
**Domain:** `general`
**Risk Level:** Low
**Side Effects:** None

## Input Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task.input` | `string` | Yes | The user's message or query text (truncated to 200 chars in reply) |
| `context_documents` | `Document[]` | No | Supporting context documents (counted but not processed) |

The skill accepts any free-form text input. It does not validate or interpret structured parameters.

## Output Format

```json
{
  "reply": "Acknowledged: <first 200 chars of input>",
  "type": "general_chat",
  "context_loaded": <count of context documents>
}
```

## Dependencies

- **Shared Types:** `shared.types` (`SkillInput`, `SkillOutput`, `SkillStatus`)
- **Shared Interfaces:** `shared.interfaces` (`Skill`)

## Example Usage

**Input:**
```
task.input = "What is the weather like today?"
```

**Output:**
```json
{
  "reply": "Acknowledged: What is the weather like today?",
  "type": "general_chat",
  "context_loaded": 0
}
```

## Error Handling

If an exception occurs during execution, the skill returns:
```json
{
  "status": "FAILED",
  "error": "<exception message>"
}
```

## Configuration

| Property | Value | Notes |
|----------|-------|-------|
| `allowed_agents` | `["0.Nexus - General Chat"]` | Only the General Chat agent may invoke this skill |
| `forbidden_agents` | Governance, Manufacturing, Audit, Backend, Frontend agents | All specialized agents are excluded |
| `side_effects` | `false` | Read-only; no files or state are modified |
| `risk_level` | `"low"` | Safe to call on any input |
