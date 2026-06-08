# OpenCode MCP Permission Rules

## Safe By Default
Allowed without extra approval:
- read project files
- search project files
- inspect docs
- inspect git status
- inspect git diff
- inspect git log
- inspect changed files
- inspect local DB schema read-only

## Approval Required
Ask before:
- editing files
- deleting files
- installing packages
- upgrading packages
- running migrations
- writing database
- changing GraphQL contracts
- modifying architecture/governance docs
- committing git changes
- pushing git changes
- deployment actions
- accessing env/secrets

## Forbidden Unless Explicitly Approved
- access outside project root
- unrestricted shell
- production database access
- production deployment
- secrets exposure
- direct business-data mutation through MCP
- bypassing Django domain services
- replacing backend logic with agent logic
- frontend mock operational data
- hardcoded business data
