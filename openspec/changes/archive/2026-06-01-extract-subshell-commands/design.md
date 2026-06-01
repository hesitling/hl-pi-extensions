## Context

The bash splitter in `permission/bash-split.ts` uses `unbash` to parse commands into an AST, then extracts leaf `Command` nodes. Currently, it reconstructs commands by joining `name.value` and `suffix[].value` — but does not recurse into command substitutions (`$()` and backticks).

This means `echo "$(whoami)"` extracts as `["echo $(whoami)"]`, hiding `whoami` from permission rules.

```
Current flow:
  echo "$(whoami)"  →  AST  →  Command node  →  "echo $(whoami)"
                                                    ↑
                                          whoami is buried in string
```

## Goals / Non-Goals

**Goals:**
- Extract commands from `$()` and backtick substitutions so permission rules evaluate them
- Handle arbitrary nesting depth
- Preserve existing behavior for all other cases

**Non-Goals:**
- Extracting from `$()` inside **single-quoted** strings (shell doesn't expand those)
- Extracting from `$()` inside **double-quoted** strings where the substitution is the entire word (e.g., `"$(whoami)"` — the quotes don't prevent execution, but we extract the inner command anyway since it runs)
- Handling process substitution `<()` or `>()`

## Decisions

### Decision 1: Recursive extraction approach

**Choice**: After extracting top-level commands, scan each extracted string for `$()` and backtick patterns, then recursively extract commands from within them.

**Alternative considered**: Modifying the AST walk to recurse into substitution nodes directly.

**Why chosen**: The `unbash` parser's AST doesn't expose command substitution as a separate node type we can easily walk. String-level extraction is simpler and more predictable. The `unbash` parser already handles the heavy lifting of parsing — we just need to peel off one more layer.

**Approach**:
1. Extract top-level commands as today
2. For each extracted command, find all `$()` and backtick spans
3. Extract the content inside those spans
4. Recursively call `extractBashCommands` on the content
5. Append results to the output array

### Decision 2: Handle quoted substitutions

**Choice**: Extract from both `"$(cmd)"` (double-quoted) and unquoted `$(cmd)`.

**Rationale**: The shell executes the substitution in both cases. A permission rule blocking `whoami` should catch it regardless of quoting context.

### Decision 3: Avoid infinite recursion

**Choice**: Limit recursion depth to a reasonable bound (e.g., 10 levels).

**Alternative**: Detect cycles via visited-set.

**Why chosen**: Command substitutions are typically shallow. A depth limit is simpler and sufficient. Parse failures already fall back to `[command]`, so no infinite loop risk.

## Risks / Trade-offs

- **False positives**: `echo '$(whoami)'` (single-quoted) — shell doesn't expand, but our regex won't distinguish. Mitigation: Only match `$()` that appear outside single quotes (parse-aware check).
- **Complexity**: Nested quotes and escaping make string-level extraction fragile. Mitigation: Lean on `unbash` for the initial parse; only do string extraction for substitution content.
- **Performance**: Recursive extraction adds overhead. Mitigation: Depth limit; most commands have zero or one substitution level.
