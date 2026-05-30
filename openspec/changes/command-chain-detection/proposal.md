## Why

The permission extension matches rules against the raw `command` string. When a user chains commands with `&&`, `||`, `;`, or `|`, an allow rule that matches the first part (e.g., `^git\s+push`) can accidentally shield a dangerous suffix (e.g., `rm -rf /`) because first-match-wins evaluates the whole string. Command chain detection splits compound bash commands into individual parts and evaluates each separately, ensuring dangerous actions hidden in chains are never missed.

## What Changes

- **Bash command splitting** — all `bash` tool calls have their `command` parameter parsed into individual simple commands before rule evaluation.
- **Shell parser integration** — uses `unbash` (TypeScript, zero-deps) to parse the command AST, correctly handling `&&`, `||`, `;`, `|`, subshells, and quoted strings.
- **Per-part evaluation** — each extracted command is evaluated independently through the three-layer permission system. If any part produces a deny, the entire command is blocked.
- **Graceful degradation** — if parsing fails or yields no commands, falls back to whole-string matching (current behavior).

## Capabilities

### New Capabilities

- `bash-command-splitting`: Parsing bash command strings into individual simple commands using a shell parser, with recursive AST walking to handle nested structures (subshells, pipelines, and/or chains).

### Modified Capabilities

- `rule-matching`: Update evaluation flow so that `bash` tool calls with `param: command` are split before matching. Each extracted command part is evaluated independently; any deny blocks the whole call. Non-bash tools and non-command params are unaffected.

## Impact

- **New dependency**: `unbash` (zero-deps, TypeScript, ~2KB)
- **New file**: `permission/bash-split.ts` — command extraction logic
- **Modified file**: `permission/matcher.ts` — integrate splitting into the evaluate path
- **Modified file**: `permission/index.ts` — pass extracted parts through evaluation
- **No config changes**: splitting is automatic for all bash commands, no user opt-in required
- **No breaking changes**: single commands and non-bash tools behave identically
