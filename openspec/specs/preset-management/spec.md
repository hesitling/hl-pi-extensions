## ADDED Requirements

### Requirement: Preset definition in config
The config file (`~/.pi/permissions.yml`) SHALL contain a `presets` map where each key is a preset name and each value has:
- `default`: `"allow"`, `"deny"`, or `"ask"` — the fallback action when no rule matches
- `rules`: array of rule objects (see `rule-matching` spec)

#### Scenario: Valid config with multiple presets
- **WHEN** the config defines presets `default`, `strict`, and `relaxed`
- **THEN** all three presets SHALL be available for switching at runtime

#### Scenario: Missing presets map
- **WHEN** the config file exists but has no `presets` key
- **THEN** the system SHALL log a warning and use an empty presets map

### Requirement: Active preset field
The config file MAY contain a top-level `active` field specifying the preset to use on startup.

#### Scenario: Active field present
- **WHEN** `active: strict` is set in the config and no saved preset exists in the session
- **THEN** the system SHALL load the `strict` preset on startup

#### Scenario: Active field absent
- **WHEN** no `active` field is set and no saved preset exists in the session
- **THEN** the system SHALL use the preset named `"default"` if it exists

#### Scenario: No default preset
- **WHEN** no `active` field, no saved preset, and no preset named `"default"` exists
- **THEN** the system SHALL log a warning and use `default: ask` with an empty ruleset

### Requirement: Preset persistence via appendEntry
When the user switches presets, the system SHALL write a `permission-preset` custom entry to the session via `pi.appendEntry()`.

#### Scenario: Preset survives session restart
- **WHEN** user switches to `strict` preset and the session is later reloaded
- **THEN** the system SHALL scan session entries, find the latest `permission-preset` entry, and restore `strict` as the active preset

#### Scenario: Preset follows branch
- **WHEN** user switches to `strict` on branch A, then forks to branch B and switches to `relaxed`
- **THEN** returning to branch A SHALL restore `strict` as the active preset

### Requirement: Config reload
The system SHALL reload the YAML config from disk when the user runs `/permissions reload`.

#### Scenario: Reload picks up changes
- **WHEN** user edits `permissions.yml` to add a new preset, then runs `/permissions reload`
- **THEN** the new preset SHALL be available immediately

#### Scenario: Reload preserves active preset
- **WHEN** user is on `strict` preset and runs `/permissions reload`
- **THEN** the active preset SHALL remain `strict` (unless it was removed from config)

### Requirement: Preset validation
The system SHALL validate each preset at load time: rules must conform to the rule schema, regex patterns must compile, and required fields must be present.

#### Scenario: Invalid rule in preset
- **WHEN** a preset contains a rule with an invalid regex pattern
- **THEN** the system SHALL log a warning with the preset name and rule index, skip that rule, and load the remaining rules

#### Scenario: Empty preset
- **WHEN** a preset has `rules: []`
- **THEN** the preset SHALL be valid and use only its `default` action
