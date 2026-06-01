## 1. Rewrite bash-split.ts

- [x] 1.1 Add generator functions: `walkCommands`, `walkNode`, `walkCommand`, `walkWord`
- [x] 1.2 Add `reconstructCommand()` helper (replaces `reconstructCommand` that pushes to array)
- [x] 1.3 Implement `extractBashCommands()` as `Generator<string>` using the walkers
- [x] 1.4 Add `extractBashCommandsArray()` backward-compat wrapper
- [x] 1.5 Remove `extractFromSubstitution()` and `extractMatchingParen()`

## 2. Update caller

- [x] 2.1 Update `matcher.ts` to iterate generator directly (or use array wrapper)

## 3. Verify

- [x] 3.1 Run existing `bash-split.test.ts` — all 18 tests must pass unchanged
