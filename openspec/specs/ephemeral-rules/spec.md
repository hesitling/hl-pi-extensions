## ADDED Requirements

### Requirement: Ephemeral rule storage
Ephemeral rules SHALL be stored in-memory within the extension closure scope. They SHALL NOT be persisted to disk or to `appendEntry`.

#### Scenario: Session ends
- **WHEN** the session is destroyed (quit, new session, switch session)
- **THEN** all ephemeral rules SHALL be discarded automatically

#### Scenario: Extension reload
- **WHEN** the user runs `/reload`
- **THEN** all ephemeral rules SHALL be discarded (extension closure is recreated)

### Requirement: Ephemeral rule ID
Each ephemeral rule SHALL have an auto-incremented integer `id`, starting from 1. IDs SHALL NOT be reused within a session.

#### Scenario: Add and remove rules
- **WHEN** user adds rule (id=1), adds rule (id=2), removes rule (id=1), adds another rule
- **THEN** the new rule SHALL have id=3 (not reusing id=1)

### Requirement: Add ephemeral rule
The user SHALL be able to add ephemeral rules via `/permissions add` with either inline arguments or an interactive wizard.

#### Scenario: Inline add
- **WHEN** user runs `/permissions add bash command "\\bsudo\\b" deny "No sudo"`
- **THEN** an ephemeral rule SHALL be created with tool=bash, param=command, pattern=`\bsudo\b`, action=deny, reason="No sudo"

#### Scenario: Interactive add
- **WHEN** user runs `/permissions add` with no arguments
- **THEN** the system SHALL prompt for tool, param, pattern, match type, action, and reason via interactive dialogs

#### Scenario: Confirmation after add
- **WHEN** an ephemeral rule is successfully added
- **THEN** the system SHALL display the assigned id and a summary of the rule

### Requirement: Remove ephemeral rule
The user SHALL be able to remove a specific ephemeral rule by id via `/permissions rm <id>`.

#### Scenario: Successful removal
- **WHEN** user runs `/permissions rm 3` and rule #3 exists
- **THEN** rule #3 SHALL be removed and the system SHALL confirm

#### Scenario: Non-existent id
- **WHEN** user runs `/permissions rm 99` and no rule with id 99 exists
- **THEN** the system SHALL display an error message

### Requirement: Clear ephemeral rules
The user SHALL be able to remove all ephemeral rules via `/permissions clear`.

#### Scenario: Clear with rules present
- **WHEN** user runs `/permissions clear` and 4 ephemeral rules exist
- **THEN** all 4 rules SHALL be removed and the system SHALL confirm the count

#### Scenario: Clear with no rules
- **WHEN** user runs `/permissions clear` and no ephemeral rules exist
- **THEN** the system SHALL display a message indicating no rules to clear

### Requirement: Ephemeral rules precedence
Ephemeral rules SHALL be evaluated before preset rules. Within the ephemeral layer, first-match-wins applies.

#### Scenario: Ephemeral overrides preset
- **WHEN** preset rule denies `bash` with `sudo` but ephemeral rule allows `bash` with `sudo`
- **THEN** the ephemeral rule SHALL take precedence and the call SHALL be allowed

#### Scenario: Ephemeral adds restriction
- **WHEN** preset has no rule for `git push` but ephemeral rule asks for confirmation on `git push`
- **THEN** the user SHALL be prompted before any `git push` command
