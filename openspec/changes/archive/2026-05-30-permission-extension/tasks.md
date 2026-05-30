## 1. Project Setup

- [x] 1.1 Create `permission/` directory structure with `index.ts`, `package.json`, `types.ts`, `config.ts`, `matcher.ts`, `ephemeral.ts`, `commands.ts`, `ui.ts`, `state.ts`
- [x] 1.2 Create `package.json` with dependencies (`js-yaml`, `picomatch`) and pi extension entry point
- [x] 1.3 Run `npm install` in the `permission/` directory

## 2. Type Definitions (types.ts)

- [x] 2.1 Define `Rule` interface (tool, param, pattern, matchType, flags, action, reason)
- [x] 2.2 Define `Preset` interface (default action, rules array)
- [x] 2.3 Define `Config` interface (active, presets map)
- [x] 2.4 Define `EphemeralRule` interface (extends Rule with id)
- [x] 2.5 Define `CompiledRule` interface (rule + compiled regex/picmatch)
- [x] 2.6 Define `PermissionState` interface (config, activePreset, ephemeralRules, nextEphemeralId, compiledPresetRules)
- [x] 2.7 Define `Decision` interface (action, reason, layer)

## 3. Config Loading (config.ts)

- [x] 3.1 Implement YAML loading from `~/.pi/permissions.yml` using `js-yaml`
- [x] 3.2 Implement config validation: check presets map exists, each preset has `default` and `rules`, each rule has required fields
- [x] 3.3 Implement auto-detection of `param` field for built-in tools (bash→command, read/write/edit→path, grep→pattern, find→query)
- [x] 3.4 Implement regex validation: test-compile each pattern, log warnings for invalid patterns and skip them
- [x] 3.5 Implement fallback: missing file → empty config with `default: ask`; parse error → log warning, use empty config

## 4. Rule Matcher (matcher.ts)

- [x] 4.1 Implement regex compilation: convert rule patterns to `RegExp` objects with flags, cache in `CompiledRule`
- [x] 4.2 Implement glob compilation: convert rule patterns to picomatch matchers, cache in `CompiledRule`
- [x] 4.3 Implement `matchRule()`: check tool name match (string or array) and parameter pattern match
- [x] 4.4 Implement `evaluate()`: three-layer evaluation — ephemeral first, then preset, then default; first-match-wins within each layer

## 5. State Management (state.ts)

- [x] 5.1 Implement `PermissionState` initialization: load config, resolve active preset (saved → config.active → "default"), compile preset rules
- [x] 5.2 Implement `switchPreset()`: validate preset exists, recompile rules, update state
- [x] 5.3 Implement preset persistence: write `permission-preset` entry via `pi.appendEntry()` on switch
- [x] 5.4 Implement preset restoration: on `session_start`, scan entries for latest `permission-preset` entry

## 6. Ephemeral Rules (ephemeral.ts)

- [x] 6.1 Implement `addEphemeralRule()`: validate rule, assign auto-incremented id, add to state
- [x] 6.2 Implement `removeEphemeralRule()`: find by id, remove from state, return success/failure
- [x] 6.3 Implement `clearEphemeralRules()`: remove all, return count
- [x] 6.4 Implement `listEphemeralRules()`: return current ephemeral rules array
- [x] 6.5 Implement inline argument parsing for `/permissions add <tool> <param> <pattern> <action> [reason]`
- [x] 6.6 Implement interactive add wizard using `ctx.ui` dialogs (tool → param → pattern → matchType → action → reason)

## 7. UI Helpers (ui.ts)

- [x] 7.1 Implement overview display: preset name, ephemeral count, default action
- [x] 7.2 Implement full rule list display: ephemeral section + preset section with visual separation
- [x] 7.3 Implement ephemeral-only list display
- [x] 7.4 Implement preset list display: all presets with rule counts and active indicator
- [x] 7.5 Implement validation result display for `/permissions check`

## 8. Command Handler (commands.ts)

- [x] 8.1 Register `/permissions` command with `pi.registerCommand()` and argument auto-completion
- [x] 8.2 Implement bare `/permissions` → overview display
- [x] 8.3 Implement `/permissions list` → full rule list
- [x] 8.4 Implement `/permissions ephemeral` → ephemeral-only list
- [x] 8.5 Implement `/permissions add` → inline or interactive add
- [x] 8.6 Implement `/permissions rm <id>` → remove by id with error handling
- [x] 8.7 Implement `/permissions clear` → clear all ephemeral rules
- [x] 8.8 Implement `/permissions use <name>` → switch preset with validation and persistence
- [x] 8.9 Implement `/permissions presets` → list available presets
- [x] 8.10 Implement `/permissions reload` → reload config from disk
- [x] 8.11 Implement `/permissions check` → validate config and display results

## 9. Entry Point and Event Wiring (index.ts)

- [x] 9.1 Wire `session_start` event: initialize state, restore active preset from session entries
- [x] 9.2 Wire `tool_call` event: run evaluation, handle allow/deny/ask actions, return block result when needed
- [x] 9.3 Handle `ask` action with UI: show confirm dialog with tool name, param value, and reason
- [x] 9.4 Handle `ask` action without UI: treat as deny in non-interactive mode
- [x] 9.5 Register `/permissions` command and wire all subcommands
- [x] 9.6 Export default factory function following pi extension pattern

## 10. Testing and Polish

- [x] 10.1 Test with a sample `permissions.yml` containing multiple presets and rules
- [x] 10.2 Test ephemeral rule add/remove/clear lifecycle
- [x] 10.3 Test preset switching and session persistence
- [x] 10.4 Test regex and glob pattern matching against built-in tool calls
- [x] 10.5 Test non-interactive mode fallback (ask → deny)
- [x] 10.6 Test config validation and error reporting
- [x] 10.7 Test `/permissions reload` with config changes
