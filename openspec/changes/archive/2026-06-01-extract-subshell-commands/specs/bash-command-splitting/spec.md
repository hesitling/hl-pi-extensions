## ADDED Requirements

### Requirement: Recursive extraction from command substitutions
The system SHALL recursively extract commands from `$()` (dollar-paren) and backtick command substitutions within each extracted command string.

#### Scenario: Dollar-paren substitution
- **WHEN** the command is `echo $(whoami)`
- **THEN** the system SHALL extract `["echo $(whoami)", "whoami"]`

#### Scenario: Backtick substitution
- **WHEN** the command is `echo \`whoami\``
- **THEN** the system SHALL extract `["echo \`whoami\`", "whoami"]`

#### Scenario: Nested substitution
- **WHEN** the command is `echo $(echo $(whoami))`
- **THEN** the system SHALL extract `["echo $(echo $(whoami))", "echo $(whoami)", "whoami"]`

#### Scenario: Substitution with compound command
- **WHEN** the command is `echo $(whoami && date)`
- **THEN** the system SHALL extract `["echo $(whoami && date)", "whoami", "date"]`

#### Scenario: Multiple substitutions in one command
- **WHEN** the command is `echo $(whoami) $(date)`
- **THEN** the system SHALL extract `["echo $(whoami) $(date)", "whoami", "date"]`

### Requirement: Single-quoted substitutions excluded
The system SHALL NOT extract commands from `$()` or backtick substitutions that appear inside single-quoted strings, since the shell does not expand them.

#### Scenario: Single-quoted dollar-paren
- **WHEN** the command is `echo '$(whoami)'`
- **THEN** the system SHALL extract `["echo '$(whoami)'"]` (no inner extraction)

### Requirement: Recursion depth limit
The system SHALL limit recursive extraction to a maximum depth to prevent runaway parsing.

#### Scenario: Deeply nested substitution
- **WHEN** the command contains more than 10 levels of nested `$()` substitutions
- **THEN** the system SHALL extract up to 10 levels deep and stop, without throwing an error

### Requirement: Combined with top-level splitting
The system SHALL apply recursive substitution extraction after top-level command splitting, so both mechanisms work together.

#### Scenario: Substitution inside chained commands
- **WHEN** the command is `echo $(whoami) && rm -rf /`
- **THEN** the system SHALL extract `["echo $(whoami)", "whoami", "rm -rf /"]`
