## Context

The permission system uses a 3-layer rule evaluation (ephemeral → preset → default). Each rule currently requires a `pattern` field with `r:` (regex) or `g:` (glob) prefix. This means a user who wants to "allow all reads" must write:

```yaml
- tool: read
  pattern: "g:**"
  action: allow
```

The `g:**` is pure boilerplate — it communicates nothing the user intended. The change makes `pattern` optional so the above becomes:

```yaml
- tool: read
  action: allow
```

## Goals / Non-Goals

**Goals:**
- Make `pattern` optional in rule definitions
- When `pattern` is omitted, rule matches all calls to the specified tool(s)
- Keep full backward compatibility — existing rules with patterns work unchanged

**Non-Goals:**
- Changing the config file structure (presets wrapper, active field)
- Adding new pattern types or matching engines
- Changing the 3-layer evaluation order

## Decisions

### Decision: Pattern absence means "match all"

When `pattern` is omitted, the rule matches any call to the specified tool(s) regardless of input parameters.

**Why this over alternatives:**
- Alternative: Require an explicit wildcard like `pattern: "g:*"` — rejected because it's still boilerplate
- Alternative: A separate `matchAll: true` field — rejected because it adds a new concept when omitting the existing one is sufficient

The semantics are clean: no pattern = no filtering = match everything.

### Decision: Compilation handles missing pattern

In `compileRule()`, when `pattern` is undefined:
- Skip `parsePattern()` call
- Return a `CompiledRule` with no `regex` and no `globMatcher`
- `resolvedParam` is still computed (for display/debugging) but won't be used for matching

In `matchRule()`, when no `regex` and no `globMatcher` exist on the compiled rule:
- Return `true` immediately after tool name match
- Don't check `resolvedParam` or input values

### Decision: Validation relaxed for missing pattern

In `validateRule()`, the "missing required field pattern" error is removed. A rule with only `tool` + `action` is valid.

`param` auto-detection still runs but is non-critical for patternless rules (it's used for display only).

## Risks / Trade-offs

**[Risk] Accidental broad permissions** → A user might write a patternless rule intending to be restrictive, accidentally allowing everything. Mitigation: This is a conscious config choice; the user opts in by omitting pattern. Documentation should make the semantics clear.

**[Risk] `param` resolution for patternless rules** → `compileRule()` currently returns `null` if `param` can't be resolved. For patternless rules targeting custom tools, `param` is irrelevant. Mitigation: Skip param resolution requirement when pattern is absent — the rule matches on tool name alone.
