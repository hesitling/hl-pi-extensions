## Why

pi currently has no built-in mechanism for users to control which tool calls the agent can execute. The example extensions (`permission-gate.ts`, `protected-paths.ts`) demonstrate ad-hoc patterns, but there's no unified, configurable permission system. Users need a way to define rules that match tool calls (by tool name, parameters, patterns) and decide whether to allow, deny, or prompt for confirmation—without writing TypeScript. A three-layer architecture (ephemeral → preset → default) lets users set baseline policies, switch contexts quickly, and add temporary overrides per session.

## What Changes

- **New extension: `permission/`** — a directory-based pi extension that intercepts `tool_call` events and enforces permission rules.
- **YAML config file (`~/.pi/permissions.yml`)** — defines named presets, each containing an ordered list of rules and a default action.
- **Three-layer evaluation** — ephemeral rules (session-bound, strongest) → active preset rules (persistent, switchable) → default action.
- **`/permissions` command** — runtime management: list rules, add/remove ephemeral rules, switch presets, reload config.
- **Pattern matching** — rules match tool parameters using regex (default) or glob patterns.
- **Session persistence** — the active preset name survives restarts via `appendEntry`; ephemeral rules are in-memory only.

## Capabilities

### New Capabilities

- `rule-matching`: Core engine for matching tool calls against rules with regex/glob patterns, parameter targeting, and first-match-wins evaluation.
- `preset-management`: Loading, validating, switching, and persisting named rule presets from a YAML config file.
- `ephemeral-rules`: Session-bound temporary rules with add/remove/clear operations, strongest evaluation precedence.
- `permission-commands`: The `/permissions` command interface with subcommands for all permission operations.
- `interactive-prompts`: User interaction for `ask` actions (confirm/select dialogs) with non-interactive fallback (deny).

### Modified Capabilities

None — this is a greenfield extension.

## Impact

- **New files**: `permission/` directory under `~/.pi/agent/extensions/` with `index.ts`, `package.json`, and supporting modules.
- **Dependencies**: `js-yaml` (YAML parsing), `picomatch` (glob matching).
- **Session state**: Uses `appendEntry` for active preset persistence; ephemeral rules in closure scope only.
- **Tool execution**: Hooks into `tool_call` event; can block any built-in or custom tool call.
- **No breaking changes**: Purely additive; does not modify pi core or existing extensions.
