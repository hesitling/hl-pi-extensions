## Why

Permission rules currently require a `pattern` field with `r:` or `g:` prefix, even when the intent is simply "allow/deny all calls to this tool." This forces unnecessary boilerplate — users must write `pattern: "g:**"` or similar glob-everything patterns for common cases like "allow all reads" or "allow all writes." Making `pattern` optional reduces config verbosity and lets users express tool-level trust directly.

## What Changes

- `pattern` field in rules becomes optional
- When omitted, the rule matches **all** calls to the specified tool(s), regardless of input parameters
- Existing rules with patterns continue to work exactly as before (no breaking change)
- Validation updated to accept rules with only `tool` + `action`

## Capabilities

### New Capabilities

_None — this modifies existing behavior._

### Modified Capabilities

- `rule-matching`: Rule schema changes — `pattern` becomes optional; new "patternless match" behavior when omitted

## Impact

- **Code**: `permission/types.ts`, `permission/config.ts`, `permission/matcher.ts`
- **Config format**: Backward compatible — existing configs keep working
- **Dependencies**: None
