## Context

`bash-split.ts` extracts individual commands from bash strings for permission rule matching. Current implementation:

1. Parse with `unbash` → AST
2. Walk AST → reconstruct command strings (loses quote info)
3. Char-scan reconstructed strings for `$()` / backticks
4. Re-parse extracted content (redundant)

The `unbash` parser already provides `CommandExpansionPart` nodes with a pre-parsed `script` field. String reconstruction and re-parsing are unnecessary.

## Goals / Non-Goals

**Goals:**
- Walk the AST directly for command expansion extraction
- Use `Generator<string>` for composable, lazy iteration
- Correct single-quote handling via `SingleQuotedPart` nodes
- Reduce code from ~170 lines to ~80 lines

**Non-Goals:**
- Changing external behavior (tests stay the same)
- Modifying `matcher.ts` beyond adapting to generator API
- Supporting process substitution `<()` / `>()` extraction

## Decisions

### Decision 1: Generator<string> instead of string[]

**Choice**: Each `yield` produces one command string.

**Alternative**: `Generator<string[]>` (batched) or `string[]` (current).

**Why**: Flatter API — caller iterates directly with `for...of`. No batching overhead. Composable with `yield*`.

### Decision 2: Walk Word.parts for expansion detection

**Choice**: For each `Command` node, walk `name.parts` and `suffix[].parts` to find `CommandExpansionPart` and `DoubleQuotedPart` containing expansions.

**Alternative**: Continue string-scanning reconstructed commands.

**Why**: Preserves quote information. `SingleQuotedPart` is a distinct type — skip it. `CommandExpansionPart.script` is already parsed — no re-parsing.

### Decision 3: reconstructCommand() stays

**Choice**: Keep string reconstruction for the top-level command (needed for pattern matching in matcher.ts).

**Alternative**: Return structured Word arrays.

**Why**: The permission system matches against strings (glob/regex). Reconstructing once per command is cheap and necessary.

### Decision 4: Backward-compatible wrapper

**Choice**: Provide `extractBashCommandsArray()` that materializes the generator.

**Alternative**: Update all callers to use generators.

**Why**: Minimal diff. Callers can migrate incrementally.

## Risks / Trade-offs

- **unbash API stability**: We depend on `CommandExpansionPart.script` being populated. If unbash changes, we fall back gracefully (parse failure → `[command]`).
- **Generator unfamiliarity**: Team may be less comfortable with generators. Mitigation: wrapper function for array callers.
