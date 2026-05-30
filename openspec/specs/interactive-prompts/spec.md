## ADDED Requirements

### Requirement: Ask action with UI available
When a rule matches with `action: "ask"` and the extension is in interactive mode (`ctx.hasUI` is true), the system SHALL prompt the user for confirmation before allowing the tool call.

#### Scenario: Confirm dialog for bash command
- **WHEN** a bash command matches a rule with `action: ask` and `reason: "Confirm before push"`
- **THEN** the system SHALL display a confirmation dialog showing the tool name, the command, and the reason

#### Scenario: User confirms
- **WHEN** the user confirms the dialog
- **THEN** the tool call SHALL be allowed

#### Scenario: User denies
- **WHEN** the user denies the dialog
- **THEN** the tool call SHALL be blocked with reason "Blocked by user"

### Requirement: Ask action without UI
When a rule matches with `action: "ask"` and `ctx.hasUI` is false (print mode, JSON mode), the system SHALL treat the action as `deny`.

#### Scenario: Non-interactive mode
- **WHEN** a tool call matches an `ask` rule in print mode (`-p`)
- **THEN** the tool call SHALL be blocked with reason "Blocked (non-interactive mode)"

### Requirement: Deny action
When a rule matches with `action: "deny"`, the system SHALL block the tool call immediately without prompting.

#### Scenario: Deny with reason
- **WHEN** a tool call matches a rule with `action: deny` and `reason: "Protected path"`
- **THEN** the tool call SHALL be blocked and the reason SHALL be returned to the LLM

#### Scenario: Deny without reason
- **WHEN** a tool call matches a rule with `action: deny` and no reason
- **THEN** the tool call SHALL be blocked with a generic reason "Blocked by permission rule"

### Requirement: Allow action
When a rule matches with `action: "allow"`, the system SHALL allow the tool call without prompting.

#### Scenario: Allow bypasses further evaluation
- **WHEN** a tool call matches an `allow` rule in the ephemeral layer
- **THEN** the tool call SHALL be allowed and preset rules SHALL NOT be evaluated

### Requirement: Display layer and rule origin
When blocking or prompting, the system SHALL indicate which layer (ephemeral or preset) and which rule triggered the decision.

#### Scenario: Ephemeral rule triggered
- **WHEN** an ephemeral rule blocks a tool call
- **THEN** the display SHALL show "Ephemeral rule #N" with the reason

#### Scenario: Preset rule triggered
- **WHEN** a preset rule blocks a tool call
- **THEN** the display SHALL show "Preset '<name>' rule N" with the reason
