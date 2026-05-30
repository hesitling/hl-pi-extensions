## Context

pi is a coding agent that executes tool calls (bash, read, write, edit, grep, find, ls, and custom tools) on behalf of an LLM. Currently there is no configurable permission system—users who want to control tool access must write custom TypeScript extensions. The existing examples (`permission-gate.ts`, `protected-paths.ts`) are hardcoded patterns, not a general framework.

The extension will hook into the `tool_call` event (which fires before execution and can return `{ block: true }`) to enforce user-defined rules. The pi extension API provides `ctx.ui.confirm()` for interactive prompts and `pi.appendEntry()` for session persistence.

## Goals / Non-Goals

**Goals:**
- Provide a YAML-based rule configuration that non-developers can edit
- Support three evaluation layers: ephemeral (session-bound) → preset (persistent, switchable) → default
- Match tool calls by tool name and parameter value using regex or glob patterns
- Offer `/permissions` command for runtime management (add/remove ephemeral rules, switch presets, view state)
- Fail safely: invalid config or missing file → `ask` default; non-interactive mode → `ask` treated as `deny`

**Non-Goals:**
- Role-based access control (multi-user permissions)
- Rate limiting or tool call budgets
- Auditing/logging of permission decisions beyond the session
- Modifying tool arguments (only allow/deny/ask, not rewrite)
- GUI or web-based configuration UI

## Decisions

### 1. Config format: YAML in `~/.pi/permissions.yml`

**Choice:** YAML file at a fixed global path.

**Alternatives considered:**
- JSON: harder to hand-edit, no comments
- TypeScript config: defeats the "no code" goal
- Inline in `settings.json`: pi's settings don't support arbitrary extension config

**Rationale:** YAML supports comments, is human-readable, and `js-yaml` is a well-tested dependency. Global path (`~/.pi/`) follows pi's convention for user-level config.

### 2. Pattern matching: regex primary, glob as opt-in

**Choice:** Rules default to regex matching. Setting `matchType: glob` switches to glob via `picomatch`.

**Alternatives considered:**
- Glob only: insufficient for complex patterns like `\bsudo\b` or negative lookahead
- String contains: too fragile, no wildcard support
- Only regex: glob is more intuitive for path matching

**Rationale:** Regex is the most expressive. Glob is added as ergonomic sugar for path patterns (e.g., `**/.git/**`). Both compile at rule-load time for performance.

### 3. Evaluation: first-match-wins within each layer

**Choice:** Rules are evaluated in config order within each layer. First match determines the action. Layers are checked: ephemeral → preset → default.

**Alternatives considered:**
- Most-specific-match-wins: ambiguous definition, hard to reason about
- Priority field on each rule: over-engineered for the use case
- Last-match-wins: counter-intuitive when reading top-down

**Rationale:** First-match-wins is simple, predictable, and matches how firewall ACLs and CSS cascading work. Users control priority by ordering rules in the file.

### 4. Ephemeral rules: in-memory only, no persistence

**Choice:** Ephemeral rules live in the extension closure scope. They are not written to `appendEntry` or disk.

**Alternatives considered:**
- Persist to `appendEntry` and restore: defeats "ephemeral" semantics; clutters session history
- Persist to a separate temp file: adds complexity, unclear cleanup semantics

**Rationale:** Ephemeral means temporary. Session-scoped in-memory state is the simplest model. Users who want persistent rules should use presets.

### 5. Active preset persistence: via `appendEntry`

**Choice:** When the user switches presets, write a `permission-preset` custom entry to the session. On `session_start`, scan entries to restore the last choice.

**Alternatives considered:**
- Write to a separate file: doesn't participate in session branching/forking
- Rely on config `active` field only: loses per-session override

**Rationale:** `appendEntry` participates in pi's session tree (branching, forking, compaction). This means preset choice follows the conversation branch.

### 6. Auto-detection of param field for built-in tools

**Choice:** If the rule omits `param`, auto-detect based on tool name: `command` for bash, `path` for read/write/edit, `pattern` for grep, `query` for find.

**Alternatives considered:**
- Always require explicit `param`: verbose for the common case
- Match against all parameters: expensive, ambiguous

**Rationale:** Most rules target the "main argument" of a tool. Auto-detection reduces boilerplate while keeping explicit `param` available for custom tools or edge cases.

### 7. Module structure: directory-based extension

**Choice:** `permission/` directory with `index.ts` entry point and supporting modules.

```
permission/
├── package.json      # js-yaml, picomatch
├── index.ts          # Entry point, event wiring
├── config.ts         # YAML loading, validation
├── matcher.ts        # Rule compilation and matching
├── ephemeral.ts      # Ephemeral rule CRUD
├── commands.ts       # /permissions command handler
├── ui.ts             # Display helpers
├── state.ts          # State management
└── types.ts          # Type definitions
```

**Rationale:** Multi-file for separation of concerns. Each module has a single responsibility. `index.ts` wires everything together following pi's extension pattern.

### 8. Non-interactive fallback

**Choice:** In non-interactive mode (`-p`, `--mode json`), `ask` actions are treated as `deny`.

**Alternatives considered:**
- Treat `ask` as `allow`: too permissive for automated/CI contexts
- Skip the rule entirely: loses the deny intent

**Rationale:** Fail-safe. If we can't prompt the user, the safest action is to block.

## Risks / Trade-offs

**[Risk] Regex denial of carelessly written patterns** → Mitigation: validate regex at config load time, log warnings for invalid patterns, skip them gracefully.

**[Risk] Performance with many rules or large parameter values** → Mitigation: compile regex once at load time; first-match-wins means early exit; typical rule sets are <50 rules.

**[Risk] User confusion about layer precedence** → Mitigation: `/permissions list` clearly shows all three layers with visual separation; evaluation order documented in help text.

**[Risk] YAML parsing errors block startup** → Mitigation: on parse failure, log warning and fall back to empty config with `default: ask`. Extension remains functional.

**[Risk] Ephemeral rules lost on `/reload`** → Mitigation: this is by design (session-bound). Document clearly. Users can re-add rules or use presets for persistent needs.

**[Risk] Glob vs regex confusion** → Mitigation: default is regex (explicit); glob requires explicit `matchType: glob`. Documentation shows examples of both.
