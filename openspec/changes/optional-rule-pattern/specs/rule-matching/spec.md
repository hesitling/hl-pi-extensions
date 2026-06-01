## MODIFIED Requirements

### Requirement: Rule schema
Each rule SHALL have the following fields:
- `tool`: string or array of strings — tool name(s) to match
- `param`: string (optional for built-in tools) — input field to match against
- `pattern`: string (optional) — pattern with `r:` (regex) or `g:` (glob) prefix. When omitted, the rule matches all calls to the specified tool(s).
- `flags`: string (optional) — regex flags (e.g., `"i"` for case-insensitive). Only valid with `r:` patterns.
- `action`: `"allow"`, `"deny"`, or `"ask"` — decision when rule matches
- `reason`: string (optional) — explanation shown to user or LLM

The `matchType` field SHALL NOT be present. Rules containing `matchType` SHALL be rejected with a validation error.

#### Scenario: Complete rule definition
- **WHEN** a rule specifies `tool: bash`, `param: command`, `pattern: "r:\\bsudo\\b"`, `action: deny`, `reason: "No sudo"`
- **THEN** the rule SHALL be valid and match bash tool calls where the command contains the word "sudo"

#### Scenario: Tool as array
- **WHEN** a rule specifies `tool: [write, edit]`
- **THEN** the rule SHALL match calls to both the `write` and `edit` tools

#### Scenario: Missing required fields
- **WHEN** a rule is missing the `tool` or `action` field
- **THEN** the rule SHALL be rejected with a validation error and skipped

#### Scenario: matchType field present
- **WHEN** a rule contains a `matchType` field
- **THEN** the rule SHALL be rejected with a validation error message: "matchType removed, use r:/g: prefix in pattern"

#### Scenario: Patternless rule
- **WHEN** a rule specifies `tool: read` and `action: allow` without a `pattern` field
- **THEN** the rule SHALL be valid and match all calls to the `read` tool regardless of input parameters

### Requirement: Auto-detection of param field
For built-in tools, if `param` is omitted, the system SHALL auto-detect the parameter field based on tool name:
- `bash` → `command`
- `read` → `path`
- `write` → `path`
- `edit` → `path`
- `grep` → `pattern`
- `find` → `query`

#### Scenario: Bash rule without explicit param
- **WHEN** a rule specifies `tool: bash` and `pattern: "\\bsudo\\b"` without `param`
- **THEN** the system SHALL match against the `command` input field

#### Scenario: Custom tool requires explicit param
- **WHEN** a rule targets a custom tool (not in the built-in list) and `param` is omitted
- **THEN** the rule SHALL be rejected with a validation error

#### Scenario: Patternless rule with custom tool
- **WHEN** a rule specifies `tool: my-custom-tool` and `action: allow` without `param` or `pattern`
- **THEN** the rule SHALL be valid and match all calls to `my-custom-tool`

## ADDED Requirements

### Requirement: Patternless matching
When a rule has no `pattern` field, the system SHALL match the rule against any call to the specified tool(s) without evaluating input parameters.

#### Scenario: Patternless rule matches any input
- **WHEN** a rule specifies `tool: write`, `action: allow` with no `pattern`
- **THEN** a call to `write` with any path SHALL match this rule

#### Scenario: Patternless rule with tool array
- **WHEN** a rule specifies `tool: [read, write]`, `action: allow` with no `pattern`
- **THEN** calls to either `read` or `write` with any input SHALL match this rule

#### Scenario: Patternless rule evaluated before patterned rules
- **WHEN** rule 1 specifies `tool: write`, `action: allow` with no `pattern`, and rule 2 specifies `tool: write`, `pattern: "g:**/.env*"`, `action: deny`
- **THEN** a call to `write` with path `.env` SHALL be allowed (rule 1 matches first)

#### Scenario: Patternless rule in bash command splitting
- **WHEN** a rule specifies `tool: bash`, `action: allow` with no `pattern`
- **THEN** any bash command (including compound commands) SHALL match this rule
