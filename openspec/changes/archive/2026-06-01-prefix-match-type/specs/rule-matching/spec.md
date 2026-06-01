## MODIFIED Requirements

### Requirement: Rule schema
Each rule SHALL have the following fields:
- `tool`: string or array of strings — tool name(s) to match
- `param`: string (optional for built-in tools) — input field to match against
- `pattern`: string — pattern with `r:` (regex) or `g:` (glob) prefix
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

### Requirement: Pattern prefix parsing
The `pattern` field SHALL start with `r:` (regex) or `g:` (glob). The prefix determines the pattern engine. The text after the prefix is the pattern string passed to the engine.

#### Scenario: Regex prefix
- **WHEN** a rule has `pattern: "r:.*\\.env.*"`
- **THEN** the system SHALL use regex engine with pattern `.*\\.env.*`

#### Scenario: Glob prefix
- **WHEN** a rule has `pattern: "g:**/.ssh/**"`
- **THEN** the system SHALL use glob engine with pattern `**/.ssh/**`

#### Scenario: Missing prefix
- **WHEN** a rule has `pattern: "\\bsudo\\b"` (no prefix)
- **THEN** the rule SHALL be rejected with a validation error: "Pattern must start with r: or g:"

#### Scenario: Collision escape
- **WHEN** a rule needs to match a literal string starting with `g:` (e.g., `g:projects/thing`)
- **THEN** the rule SHALL use `pattern: "r:g:projects/thing"` (regex prefix, pattern is `g:projects/thing`)

### Requirement: Regex pattern matching
When the pattern starts with `r:`, the system SHALL match the text after the prefix against the input parameter value using JavaScript `RegExp`.

#### Scenario: Basic regex match
- **WHEN** a rule has `pattern: "r:\\brm\\s+(-rf?|--recursive)"` with `flags: "i"`
- **THEN** the rule SHALL match `rm -rf /tmp/foo` and `rm --recursive /tmp/foo` (case-insensitive)

#### Scenario: Invalid regex
- **WHEN** a rule has `pattern: "r:[unclosed"`
- **THEN** the system SHALL log a warning and skip the rule, continuing with remaining rules

### Requirement: Glob pattern matching
When the pattern starts with `g:`, the system SHALL match the text after the prefix against the input parameter value using `picomatch`.

#### Scenario: Glob match for paths
- **WHEN** a rule has `pattern: "g:**/.env*"`, `tool: [write, edit]`, `param: path`
- **THEN** the rule SHALL match `.env`, `.env.local`, and `config/.env.production`

#### Scenario: Glob match for nested paths
- **WHEN** a rule has `pattern: "g:**/.git/**"`
- **THEN** the rule SHALL match `project/.git/config` and `.git/objects/abc`

### Requirement: Flags with glob warning
When a rule has a `g:` prefix and a `flags` field is present, the system SHALL log a warning and ignore the `flags` value. The rule SHALL NOT be rejected.

#### Scenario: Flags on glob pattern
- **WHEN** a rule has `pattern: "g:**/.ssh"` and `flags: "i"`
- **THEN** the system SHALL log a warning "flags only applies to r: patterns, ignoring" and evaluate the glob normally

## ADDED Requirements

_None._

## REMOVED Requirements

_None. The matchType field removal is captured in the MODIFIED Rule schema requirement._
