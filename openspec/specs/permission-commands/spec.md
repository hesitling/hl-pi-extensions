## ADDED Requirements

### Requirement: /permissions command registration
The extension SHALL register a `/permissions` command with pi.

#### Scenario: Bare command
- **WHEN** user runs `/permissions` with no subcommand
- **THEN** the system SHALL display an overview showing the active preset name, ephemeral rule count, and default action

### Requirement: /permissions list subcommand
The system SHALL support `/permissions list` to display all active rules across all layers.

#### Scenario: List with ephemeral and preset rules
- **WHEN** user runs `/permissions list` and has 2 ephemeral rules and a preset with 5 rules
- **THEN** the display SHALL show ephemeral rules labeled as "Ephemeral (session-only)" and preset rules labeled with the preset name, separated visually

#### Scenario: List with no ephemeral rules
- **WHEN** user runs `/permissions list` and has 0 ephemeral rules
- **THEN** the display SHALL show only the preset rules section

### Requirement: /permissions ephemeral subcommand
The system SHALL support `/permissions ephemeral` to display only ephemeral rules.

#### Scenario: Show ephemeral rules
- **WHEN** user runs `/permissions ephemeral` and has 3 ephemeral rules
- **THEN** the display SHALL show only those 3 rules with their ids, tool, param, pattern, and action

### Requirement: /permissions add subcommand
The system SHALL support `/permissions add` to add ephemeral rules. See `ephemeral-rules` spec for details.

### Requirement: /permissions rm subcommand
The system SHALL support `/permissions rm <id>` to remove ephemeral rules by id. See `ephemeral-rules` spec for details.

### Requirement: /permissions clear subcommand
The system SHALL support `/permissions clear` to remove all ephemeral rules. See `ephemeral-rules` spec for details.

### Requirement: /permissions use subcommand
The system SHALL support `/permissions use <name>` to switch the active preset.

#### Scenario: Valid preset name
- **WHEN** user runs `/permissions use strict` and preset `strict` exists
- **THEN** the system SHALL switch to `strict`, persist the choice via `appendEntry`, and confirm with preset details

#### Scenario: Invalid preset name
- **WHEN** user runs `/permissions use nonexistent`
- **THEN** the system SHALL display an error and list available presets

#### Scenario: Preset switch preserves ephemeral rules
- **WHEN** user has 2 ephemeral rules and switches presets
- **THEN** the ephemeral rules SHALL remain unchanged

### Requirement: /permissions presets subcommand
The system SHALL support `/permissions presets` to list all available presets from the config file.

#### Scenario: List presets
- **WHEN** user runs `/permissions presets` and the config defines `default`, `strict`, `relaxed`
- **THEN** the display SHALL show all three presets with their rule counts and default actions, indicating which is active

### Requirement: /permissions reload subcommand
The system SHALL support `/permissions reload` to reload the config file from disk.

#### Scenario: Successful reload
- **WHEN** user edits the config file and runs `/permissions reload`
- **THEN** the system SHALL reload the config, recompile rules for the active preset, and confirm

### Requirement: /permissions check subcommand
The system SHALL support `/permissions check` to validate the config file without applying changes.

#### Scenario: Valid config
- **WHEN** user runs `/permissions check` and the config is valid
- **THEN** the system SHALL display a success message with preset count and total rule count

#### Scenario: Invalid config
- **WHEN** user runs `/permissions check` and the config has errors
- **THEN** the system SHALL display each error with the preset name, rule index, and error description

### Requirement: Argument auto-completion
The `/permissions` command SHALL provide argument auto-completion for subcommands and preset names.

#### Scenario: Tab completion for use
- **WHEN** user types `/permissions use ` and presses tab
- **THEN** the system SHALL suggest available preset names

#### Scenario: Tab completion for subcommands
- **WHEN** user types `/permissions ` and presses tab
- **THEN** the system SHALL suggest available subcommands (list, add, rm, clear, use, presets, reload, check, ephemeral)
