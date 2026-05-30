## ADDED Requirements

### Requirement: Rule schema
Each rule SHALL have the following fields:
- `tool`: string or array of strings — tool name(s) to match
- `param`: string (optional for built-in tools) — input field to match against
- `pattern`: string — regex or glob pattern
- `matchType`: `"regex"` (default) or `"glob"` — pattern engine to use
- `flags`: string (optional) — regex flags (e.g., `"i"` for case-insensitive)
- `action`: `"allow"`, `"deny"`, or `"ask"` — decision when rule matches
- `reason`: string (optional) — explanation shown to user or LLM

#### Scenario: Complete rule definition
- **WHEN** a rule specifies `tool: bash`, `param: command`, `pattern: "\\bsudo\\b"`, `action: deny`, `reason: "No sudo"`
- **THEN** the rule SHALL be valid and match bash tool calls where the command contains the word "sudo"

#### Scenario: Tool as array
- **WHEN** a rule specifies `tool: [write, edit]`
- **THEN** the rule SHALL match calls to both the `write` and `edit` tools

#### Scenario: Missing required fields
- **WHEN** a rule is missing the `tool` or `action` field
- **THEN** the rule SHALL be rejected with a validation error and skipped

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

### Requirement: Regex pattern matching
When `matchType` is `"regex"` (default), the system SHALL match the rule's `pattern` against the input parameter value using JavaScript `RegExp`.

#### Scenario: Basic regex match
- **WHEN** a rule has `pattern: "\\brm\\s+(-rf?|--recursive)"` with `flags: "i"`
- **THEN** the rule SHALL match `rm -rf /tmp/foo` and `rm --recursive /tmp/foo` (case-insensitive)

#### Scenario: Invalid regex
- **WHEN** a rule has `pattern: "[unclosed"`
- **THEN** the system SHALL log a warning and skip the rule, continuing with remaining rules

### Requirement: Glob pattern matching
When `matchType` is `"glob"`, the system SHALL match the rule's `pattern` against the input parameter value using `picomatch`.

#### Scenario: Glob match for paths
- **WHEN** a rule has `pattern: "**/.env*"`, `matchType: "glob"`, `tool: [write, edit]`, `param: path`
- **THEN** the rule SHALL match `.env`, `.env.local`, and `config/.env.production`

#### Scenario: Glob match for nested paths
- **WHEN** a rule has `pattern: "**/.git/**"`, `matchType: "glob"`
- **THEN** the rule SHALL match `project/.git/config` and `.git/objects/abc`

### Requirement: First-match-wins evaluation
Rules within a layer SHALL be evaluated in order. The first rule whose `tool` and `pattern` both match SHALL determine the action. Subsequent rules SHALL NOT be evaluated.

#### Scenario: Multiple matching rules
- **WHEN** rule 1 matches `bash` commands starting with `ls` as `allow`, and rule 2 matches all `bash` commands as `deny`
- **THEN** a call to `bash` with command `ls -la` SHALL be allowed (rule 1 matches first)

#### Scenario: No matching rule
- **WHEN** no rule in any layer matches the tool call
- **THEN** the default action of the active preset (or global default) SHALL apply

### Requirement: Rule compilation at load time
The system SHALL compile all regex and glob patterns at config load time or preset switch time, not at match time.

#### Scenario: Compiled patterns cached
- **WHEN** the user switches presets via `/permissions use`
- **THEN** all patterns in the new preset SHALL be compiled before the first tool call is evaluated
