## Why

Commands wrapped in `$()` (command substitution) or backticks are not extracted by the bash splitter. This allows permission rules to be bypassed — a rule blocking `whoami` won't catch `echo "$(whoami)"` because only `echo $(whoami)` is extracted, not the inner `whoami`.

## What Changes

- Extract commands recursively from `$()` and backtick substitutions within each command
- `echo "$(whoami)"` will now produce `["echo $(whoami)", "whoami"]` so both are evaluated against rules
- Applies to all nesting depths: `echo "$(echo $(whoami))"` extracts `whoami`
- Only extracts from **unquoted** substitutions — `"$(whoami)"` (quoted) is skipped since the shell treats it as a single word and the substitution still runs, but the outer context is preserved

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `bash-command-splitting`: Add requirement for recursive extraction of commands from `$()` and backtick substitutions

## Impact

- `permission/bash-split.ts`: Main change location — add recursive extraction logic
- Tests: New test cases for command substitution scenarios
- Security: Closes a bypass vector in the permission system
