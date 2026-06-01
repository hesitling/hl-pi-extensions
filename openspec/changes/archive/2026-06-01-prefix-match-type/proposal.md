## Why

The current rule schema requires a separate `matchType` field to distinguish regex from glob patterns. This adds verbosity to configs (an extra field per rule) and friction to inline `/permissions add` commands (an extra positional argument). Using a prefix convention (`r:` for regex, `g:` for glob) directly in the `pattern` field eliminates both problems while keeping the intent visually obvious.

## What Changes

- **BREAKING**: Remove `matchType` field from rule schema. Rules with `matchType` will fail validation.
- **BREAKING**: `pattern` field must now start with `r:` (regex) or `g:` (glob). Bare patterns are invalid.
- `flags` field retained, applies only to `r:` patterns. Using `flags` with `g:` triggers a warning.
- Inline `/permissions add` syntax loses one positional arg — pattern now self-describes its engine.
- Interactive add flow drops the "Match type" select step.
- Config files using the old `matchType` format must be migrated manually.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `rule-matching`: Rule schema changes — `matchType` removed, `pattern` gains `r:/g:` prefix requirement, validation rules updated.

## Impact

- **Config files**: `~/.pi/permissions.yml` — all rules must use prefix syntax. Old configs break on load.
- **Code**: `types.ts`, `config.ts`, `matcher.ts`, `ephemeral.ts`, `commands.ts`, `ui.ts` — every file that touches `matchType` or pattern parsing.
- **Users**: Must update existing configs. Inline add syntax changes (shorter, but different).
