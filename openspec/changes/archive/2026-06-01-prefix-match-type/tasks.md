## 1. Types

- [x] 1.1 Remove `MatchType` type from `types.ts`
- [x] 1.2 Remove `matchType` field from `Rule` interface in `types.ts`

## 2. Config

- [x] 2.1 Add `parsePattern(raw: string): { engine: "regex" | "glob"; pattern: string }` function to `config.ts`
- [x] 2.2 Update `normalizeRule()` in `config.ts` to use `parsePattern()` and stop reading `matchType`
- [x] 2.3 Update `validateRule()` in `config.ts` to require `r:/g:` prefix and reject `matchType` field
- [x] 2.4 Add validation: warn if `flags` is set on a `g:` pattern
- [x] 2.5 Remove `MatchType` import from `config.ts`

## 3. Matcher

- [x] 3.1 Update `compileRule()` in `matcher.ts` to use `parsePattern()` instead of `rule.matchType`
- [x] 3.2 Remove `MatchType` import from `matcher.ts`

## 4. Ephemeral

- [x] 4.1 Update `parseInlineAddArgs()` in `ephemeral.ts` to remove `matchType` from return type and use prefix detection
- [x] 4.2 Update `interactiveAdd()` in `ephemeral.ts` to remove matchType select step and update pattern prompt to `Pattern (r:... or g:...)`
- [x] 4.3 Remove `MatchType` import from `ephemeral.ts`

## 5. Commands

- [x] 5.1 Update `handleCheck()` in `commands.ts` to validate prefix presence instead of `matchType`

## 6. Verification

- [x] 6.1 Run `bun run build` (or type-check) to verify no type errors
- [x] 6.2 Manually test: old config with `matchType` → clear error on load
- [x] 6.3 Manually test: config with `r:` and `g:` prefixes → rules compile and match correctly
- [x] 6.4 Manually test: `/permissions add bash command "r:\\bsudo\\b" deny` works
- [x] 6.5 Manually test: interactive add flow skips matchType prompt
