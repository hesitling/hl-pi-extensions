## Context

The permission extension evaluates rules against the raw `command` string for `bash` tool calls. The matcher uses first-match-wins within each layer (ephemeral → preset → default). When a user chains commands with `&&`, `||`, `;`, or `|`, the first matching rule applies to the entire string. An allow rule matching the prefix (e.g., `^git\s+push`) can accidentally shield a dangerous suffix (e.g., `rm -rf /`).

Current flow:
```
bash tool_call → evaluate("git push && rm -rf /") → first rule matches → action
```

The shell correctly interprets `&&` as a command separator. The permission system should too.

## Goals / Non-Goals

**Goals:**
- Split compound bash commands into individual simple commands before rule evaluation
- Evaluate each extracted command independently through the three-layer system
- Any deny on any part blocks the entire call
- Correctly handle quoted separators (don't split inside strings)
- Gracefully fall back to whole-string matching if parsing fails

**Non-Goals:**
- Recursive parsing of embedded commands (e.g., `bash -c "rm -rf /"` — the `-c` argument is not recursively parsed)
- Per-rule opt-in/out — splitting is global for all bash commands
- Modifying how non-bash tools are evaluated
- Modifying how glob matching works for path-based tools

## Decisions

### Decision: Use `unbash` as the shell parser

**Choice**: `unbash` (v3.0.0)

**Alternatives considered**:
- `bash-parser` (v0.5.0, 2017) — old, unmaintained, has dependencies
- `@banyudu/bash-parser` (v0.6.0) — community fork, less mature
- `tree-sitter-bash` — requires native bindings, heavy
- Hand-rolled regex splitter — can't handle quotes, subshells, or edge cases

**Rationale**: `unbash` is TypeScript-native, zero-dependency, fast, tolerant (never throws), and has a clean AST with structured `Command` nodes. It correctly handles `&&`, `||`, `;`, `|`, subshells, quoted strings, and command substitutions.

### Decision: Walk AST to extract leaf Command nodes

**Choice**: Recursive traversal that extracts all `Command` type nodes from the AST.

**Alternative considered**: Reconstruct command strings from the original input using AST position ranges (`pos`/`end`). More complex, fragile with whitespace.

**Rationale**: The AST naturally represents compound commands as container types (`AndOr`, `Pipeline`, `Subshell`) with `Command` children. Walking the tree and reconstructing from `name.value` + `suffix[].value` is simple and correct.

```
AST node types handled:
├── Script.commands      → recurse (top-level ; separated)
├── Statement.command    → recurse (wrapper)
├── AndOr.commands       → recurse (&&, || chains)
├── Pipeline.commands    → recurse (| chains)
├── Subshell.body.commands → recurse (( ) groups)
└── Command              → LEAF: extract and reconstruct
```

### Decision: Global splitting for all bash commands

**Choice**: Every `bash` tool call with `param: command` is split automatically.

**Alternative considered**: Per-rule opt-in via `splitCommands: true` field. More flexible but adds config complexity and users might forget to enable it.

**Rationale**: The primary use case is catching dangerous commands hidden in chains. This should be the default behavior, not something users have to opt into. Single commands are unaffected (extract one element = same as whole-string).

### Decision: "Any deny blocks all" aggregation

**Choice**: If any extracted command part produces a deny decision, the entire bash call is blocked. If no part is denied but a part produces an ask, prompt the user.

**Alternatives considered**:
- "All parts" — all must match an allow rule. Too restrictive.
- Per-action splitting — deny uses "any part", allow uses "all parts". Surprising semantics.
- Evaluate each part through full 3-layer independently, take the "worst" result. Same as "any deny blocks all" but more complex.

**Rationale**: "Any deny blocks all" is the safest default. It matches the user's stated goal: deny dangerous actions hidden in command combinations. An allow rule on `git push` should not shield `rm -rf /` appended after it.

### Decision: Fallback to whole-string on parse failure

**Choice**: If parsing or extraction fails, return `[originalCommand]` (single element) and proceed with normal evaluation.

**Alternative considered**: Deny on parse failure (fail-closed). Too aggressive — many benign commands might have unusual syntax.

**Rationale**: Graceful degradation ensures no regression. A parse failure means we fall back to current behavior (whole-string matching), not a worse behavior.

## Risks / Trade-offs

**[Risk] `value` field strips quotes** → Mitigation: This is acceptable for matching. Rules match semantic content, not syntactic form. A rule blocking `rm` should match whether the argument was `rm` or `"rm"`.

**[Risk] `bash -c "embedded command"` not recursively parsed** → Mitigation: Documented as non-goal. The reconstructed string `bash -c embedded command` still matches rules against individual words. A future enhancement could add recursive `-c` parsing.

**[Risk] Performance overhead of parsing every bash command** → Mitigation: `unbash` is benchmarked as fast (competitive with tree-sitter native). Single commands parse in microseconds. The overhead is negligible compared to tool execution time.

**[Risk] Unusual bash syntax may not parse correctly** → Mitigation: `unbash` uses tolerant parsing — it never throws and returns partial ASTs. Worst case, extraction returns fewer commands than expected, and we fall back to whole-string matching for the remainder.

**[Risk] Existing rules that match compound strings break** → Mitigation: A rule like `pattern: "git push && rm"` matching the full string would no longer trigger because we split before matching. This is intentional — such rules should be written as deny rules on the dangerous part (e.g., `rm`), not on the compound string.
