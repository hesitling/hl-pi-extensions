## Why

The current `bash-split.ts` implementation reconstructs command strings from the AST, then re-parses them to extract commands from `$()` and backtick substitutions. This is redundant — `unbash` already parses command substitutions into `CommandExpansionPart` nodes with a `script` field containing the pre-parsed AST. The string reconstruction also loses quote information, causing false positives with single-quoted substitutions.

## What Changes

- Replace string-level `$()` / backtick extraction with direct AST walk using `CommandExpansionPart.script`
- Use `Generator<string>` instead of `string[]` — each `yield` is one command string
- Eliminate `extractFromSubstitution()` and `extractMatchingParen()` (no longer needed)
- Single-quote handling becomes correct: `SingleQuotedPart` nodes are skipped directly
- Backward-compatible wrapper `extractBashCommandsArray()` for callers that need arrays

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `bash-command-splitting`: Implementation rewrite — same external behavior, cleaner internals. Spec-level behavior unchanged (no delta spec needed).

## Impact

- `permission/bash-split.ts`: Full rewrite — ~80 lines (down from ~170)
- `permission/bash-split.test.ts`: Tests unchanged (behavior preserved)
- `permission/matcher.ts`: Minor update to use generator iteration
