## 1. Setup

- [ ] 1.1 Add `unbash` dependency to `permission/package.json`
- [ ] 1.2 Run `bun install` in the permission directory

## 2. Bash Command Splitting Module

- [ ] 2.1 Create `permission/bash-split.ts` with `extractBashCommands(command: string): string[]`
- [ ] 2.2 Implement AST walker that recursively extracts leaf `Command` nodes from `AndOr`, `Pipeline`, `Subshell`, `Statement`, and `Script` container types
- [ ] 2.3 Implement command reconstruction: join `name.value` + `suffix[].value` with spaces
- [ ] 2.4 Add graceful fallback: return `[command]` on parse failure or empty extraction
- [ ] 2.5 Verify quoted separators are not split (e.g., `echo "hello && world"` stays as one command)

## 3. Matcher Integration

- [ ] 3.1 Modify `permission/matcher.ts` to import `extractBashCommands`
- [ ] 3.2 Add bash-splitting path in the evaluate flow: when tool is `bash` and resolved param is `command`, split before matching
- [ ] 3.3 Implement per-part evaluation: loop through extracted commands, run `matchRule` on each part against rules in order
- [ ] 3.4 Implement "any deny blocks all" aggregation: if any part matches a deny rule, return deny; if any part matches an ask rule (and none deny), return ask; otherwise allow/default
- [ ] 3.5 Ensure non-bash tools and non-command params follow the existing whole-string evaluation path unchanged

## 4. Verification

- [ ] 4.1 Test: compound command with deny rule on suffix (`git push && rm -rf /` with deny on `rm`)
- [ ] 4.2 Test: compound command with allow rule on prefix only (`git status && git push` with allow on `^git`)
- [ ] 4.3 Test: pipeline splitting (`ls | grep secret` with deny on `grep`)
- [ ] 4.4 Test: quoted separator not split (`echo "rm -rf /"` — should NOT match deny on `rm`)
- [ ] 4.5 Test: single command unchanged behavior (no regression)
- [ ] 4.6 Test: non-bash tool unchanged behavior (no regression)
- [ ] 4.7 Test: parse failure graceful fallback
