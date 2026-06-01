## 1. Type Changes

- [x] 1.1 Make `pattern` optional in `Rule` interface (`types.ts`)

## 2. Validation Updates

- [x] 2.1 Remove "missing pattern" validation error in `validateRule()` (`config.ts`)
- [x] 2.2 Allow patternless rules for custom tools (skip param resolution requirement when pattern absent)

## 3. Compilation Updates

- [x] 3.1 Handle missing pattern in `compileRule()` — skip `parsePattern()`, return `CompiledRule` without regex/glob (`matcher.ts`)

## 4. Matching Updates

- [x] 4.1 Update `matchRule()` — return `true` on tool name match when no regex/glob present (`matcher.ts`)

## 5. Tests

- [x] 5.1 Add test: patternless rule validates successfully
- [x] 5.2 Add test: patternless rule matches any input for that tool
- [x] 5.3 Add test: patternless rule with tool array matches all specified tools
- [x] 5.4 Add test: patternless rule evaluated before patterned rules (first-match-wins)
- [x] 5.5 Add test: patternless rule works with bash command splitting
