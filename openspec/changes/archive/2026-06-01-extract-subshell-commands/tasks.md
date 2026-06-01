## 1. Core Implementation

- [x] 1.1 Add `extractFromSubstitution()` function to `bash-split.ts` that finds `$()` and backtick spans in a string
- [x] 1.2 Add single-quote awareness — skip extraction when substitution is inside single quotes
- [x] 1.3 Add recursive depth limit (max 10) to prevent runaway parsing
- [x] 1.4 Integrate recursive extraction into `extractBashCommands()` — after top-level extraction, apply substitution extraction to each result

## 2. Tests

- [x] 2.1 Add unit tests for `$()` extraction (basic, nested, compound)
- [x] 2.2 Add unit tests for backtick extraction (basic, nested)
- [x] 2.3 Add unit test for single-quoted exclusion
- [x] 2.4 Add unit test for combined top-level split + substitution extraction
- [x] 2.5 Add unit test for depth limit behavior

## 3. Spec Update

- [x] 3.1 Update `openspec/specs/bash-command-splitting/spec.md` with new requirements (archive the delta)
