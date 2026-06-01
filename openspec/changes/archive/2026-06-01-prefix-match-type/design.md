## Context

The permission extension uses a `matchType` field on each rule to select between regex and glob pattern engines. This field defaults to `"regex"` when omitted. The field appears in config YAML, is accepted in inline `/permissions add` commands, and is prompted during interactive add.

Current files touched:
- `types.ts` — defines `MatchType` type and `Rule.matchType`
- `config.ts` — reads and validates `matchType` from YAML
- `matcher.ts` — switches on `matchType` in `compileRule()`
- `ephemeral.ts` — parses `matchType` from inline args, prompts in interactive add
- `commands.ts` — validates `matchType` in `/permissions check`

## Goals / Non-Goals

**Goals:**
- Eliminate the `matchType` field entirely
- Embed type information in the `pattern` field via `r:` / `g:` prefix
- Simplify inline add syntax (one fewer positional arg)
- Simplify interactive add flow (one fewer prompt step)
- Hard break on old configs — clear error, no silent migration

**Non-Goals:**
- Backward compatibility with `matchType` configs
- Auto-migration or config rewriting
- Supporting bare patterns (no prefix) with a default engine

## Decisions

### 1. Prefix always required

Bare patterns (no prefix) are invalid. This eliminates ambiguity — every pattern is self-describing.

**Alternative considered**: Default bare patterns to regex. Rejected because it reintroduces implicit behavior and partially defeats the purpose of the change.

### 2. `flags` stays as a separate field

`flags` is regex-specific and orthogonal to the engine choice. Keeping it separate avoids prefix complexity like `ri:` or `r/i:`.

**Behavior**: If `flags` is set on a `g:` pattern, log a warning and ignore. Do not reject — not worth breaking a config over.

### 3. Collision escape via regex

To match a literal string starting with `r:` or `g:`, use regex: `r:g:foo` matches the string `g:foo`. This works because the prefix parser strips the first `r:` and the remainder `g:foo` becomes the regex pattern.

### 4. Parse function as single source of truth

A `parsePattern(raw: string)` function in `config.ts` returns `{ engine, pattern }`. All consumers call this instead of branching on `matchType`.

```
parsePattern("r:.*\\.env.*")  → { engine: "regex", pattern: ".*\\.env.*" }
parsePattern("g:**/.ssh/**")  → { engine: "glob", pattern: "**/.ssh/**" }
```

### 5. Validation rejects `matchType` field

If a rule in config has a `matchType` field, validation fails with a clear message directing the user to use prefixes. This is a hard break — no silent ignore.

### 6. Interactive add drops matchType prompt

The pattern prompt changes to `Pattern (r:... or g:...)`. The match type select step is removed entirely.

## Risks / Trade-offs

**[Breaking change]** All existing configs must be updated. → Mitigation: Clear error message on load pointing to the new syntax. This is a one-time cost.

**[Rare collision]** Patterns that naturally start with `r:` or `g:` need regex escape. → Mitigation: Documented. The `r:g:...` escape is intuitive once seen.

**[flags + glob]** Users might set `flags` with a glob pattern out of habit. → Mitigation: Warning on load, flags ignored. Non-fatal.
