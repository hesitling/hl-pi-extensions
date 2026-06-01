## ADDED Requirements

### Requirement: Shell parser integration
The system SHALL use a shell parser (`unbash`) to parse bash command strings into an AST before extracting individual commands.

#### Scenario: Parse compound command
- **WHEN** a bash command string `git push && rm -rf /` is parsed
- **THEN** the parser SHALL return an AST containing an `AndOr` node with two `Command` children

#### Scenario: Tolerant parsing
- **WHEN** a malformed or incomplete bash command string is parsed
- **THEN** the parser SHALL return a partial AST without throwing an exception

### Requirement: Command extraction from AST
The system SHALL walk the parsed AST and extract all leaf `Command` nodes, reconstructing each as a simple command string (name + arguments).

#### Scenario: Extract from AndOr chain
- **WHEN** the AST represents `git push && rm -rf /`
- **THEN** the system SHALL extract `["git push", "rm -rf /"]`

#### Scenario: Extract from pipeline
- **WHEN** the AST represents `ls -la | grep secret`
- **THEN** the system SHALL extract `["ls -la", "grep secret"]`

#### Scenario: Extract from semicolon list
- **WHEN** the AST represents `echo hello; rm -rf /`
- **THEN** the system SHALL extract `["echo hello", "rm -rf /"]`

#### Scenario: Extract from or-chain
- **WHEN** the AST represents `cat foo || echo "not found"`
- **THEN** the system SHALL extract `["cat foo", "echo not found"]`

#### Scenario: Extract from subshell
- **WHEN** the AST represents `cd /tmp && (rm -rf / ; echo done)`
- **THEN** the system SHALL extract `["cd /tmp", "rm -rf /", "echo done"]`

#### Scenario: Extract from mixed operators
- **WHEN** the AST represents `ls | grep foo && rm -rf /`
- **THEN** the system SHALL extract `["ls", "grep foo", "rm -rf /"]`

#### Scenario: Single command unchanged
- **WHEN** the AST represents `rm -rf /tmp` (no chaining operators)
- **THEN** the system SHALL extract `["rm -rf /tmp"]` (single element)

### Requirement: Quoted separator preservation
The system SHALL NOT split on operator tokens (`&&`, `||`, `;`, `|`) that appear inside quoted strings.

#### Scenario: Double-quoted separator
- **WHEN** the command is `echo "hello && world"`
- **THEN** the system SHALL extract `["echo hello && world"]` (single command, not split)

#### Scenario: Single-quoted separator
- **WHEN** the command is `echo 'rm -rf / ; echo done'`
- **THEN** the system SHALL extract `["echo rm -rf / ; echo done"]` (single command, not split)

### Requirement: Command string reconstruction
The system SHALL reconstruct each extracted command by joining the command name and suffix values with spaces, using the parsed `value` field (quotes stripped).

#### Scenario: Basic reconstruction
- **WHEN** a `Command` node has `name.value = "git"` and `suffix[].value = ["push"]`
- **THEN** the reconstructed string SHALL be `"git push"`

#### Scenario: Quoted argument reconstruction
- **WHEN** a `Command` node has `name.value = "echo"` and `suffix[].value = ["hello world"]` (from `"hello world"`)
- **THEN** the reconstructed string SHALL be `"echo hello world"` (quotes stripped)

### Requirement: Graceful fallback on parse failure
If the shell parser fails or command extraction yields an empty array, the system SHALL fall back to whole-string matching using the original command value.

#### Scenario: Parser returns empty commands
- **WHEN** parsing a command yields no extractable `Command` nodes
- **THEN** the system SHALL return `[originalCommand]` as a single-element array

#### Scenario: Parser exception
- **WHEN** the parser throws an unexpected error
- **THEN** the system SHALL log a warning and return `[originalCommand]`

### Requirement: Recursive extraction from command substitutions
The system SHALL recursively extract commands from `$()` (dollar-paren) and backtick command substitutions within each extracted command string.

#### Scenario: Dollar-paren substitution
- **WHEN** the command is `echo $(whoami)`
- **THEN** the system SHALL extract `["echo $(whoami)", "whoami"]`

#### Scenario: Backtick substitution
- **WHEN** the command is `` echo `whoami` ``
- **THEN** the system SHALL extract ``["echo `whoami`", "whoami"]``

#### Scenario: Nested substitution
- **WHEN** the command is `echo $(echo $(whoami))`
- **THEN** the system SHALL extract `["echo $(echo $(whoami))", "echo $(whoami)", "whoami"]`

#### Scenario: Substitution with compound command
- **WHEN** the command is `echo $(whoami && date)`
- **THEN** the system SHALL extract `["echo $(whoami && date)", "whoami", "date"]`

#### Scenario: Multiple substitutions in one command
- **WHEN** the command is `echo $(whoami) $(date)`
- **THEN** the system SHALL extract `["echo $(whoami) $(date)", "whoami", "date"]`

### Requirement: Combined with top-level splitting
The system SHALL apply recursive substitution extraction after top-level command splitting, so both mechanisms work together.

#### Scenario: Substitution inside chained commands
- **WHEN** the command is `echo $(whoami) && rm -rf /`
- **THEN** the system SHALL extract `["echo $(whoami)", "whoami", "rm -rf /"]`

### Requirement: Recursion depth limit
The system SHALL limit recursive substitution extraction to prevent runaway parsing.

#### Scenario: Deeply nested substitution
- **WHEN** the command contains more than 10 levels of nested `$()` substitutions
- **THEN** the system SHALL stop recursing without throwing an error

### Requirement: Single-quoted substitution handling
The system SHALL NOT extract commands from `$()` or backtick substitutions that appear inside single-quoted strings, since the shell does not expand them.

#### Scenario: Single-quoted dollar-paren
- **WHEN** the command is `echo '$(whoami)'`
- **THEN** the system SHALL extract `["echo $(whoami)"]` (no inner extraction)

#### Scenario: Single-quoted backtick
- **WHEN** the command is `` echo '`whoami`' ``
- **THEN** the system SHALL extract ``["echo `whoami`"]`` (no inner extraction)

#### Scenario: Single-quoted does not hide unquoted substitution
- **WHEN** the command is `echo '$(date)' $(whoami)`
- **THEN** the system SHALL extract `["echo $(date) $(whoami)", "whoami"]`
