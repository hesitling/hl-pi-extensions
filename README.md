# pi Extensions

A collection of extensions for [pi](https://github.com/earendil-works/pi-coding-agent), the coding agent harness. Currently includes a **permission extension** and an **OpenSpec-based change management workflow**.

## Permission Extension

A three-layer permission system that intercepts tool calls and applies allow/deny/ask decisions based on configurable rules.

### How It Works

Permissions are evaluated in three layers, with the first match winning:

| Layer | Name | Scope | Strength |
|-------|------|-------|----------|
| 1 | Ephemeral rules | Current session only | Strongest |
| 2 | Active preset rules | Persistent, switchable | Middle |
| 3 | Default action | Preset fallback | Weakest |

### Configuration

Create `~/.pi/permissions.yml`:

```yaml
active: default

presets:
  default:
    default: allow
    rules:
      - tool: bash
        pattern: "\\bsudo\\b"
        action: deny
        reason: "No sudo allowed"

      - tool: [write, edit]
        pattern: "g:**/.env*"
        action: ask
        reason: "Confirm before editing .env files"

      - tool: bash
        pattern: "r:^git "
        action: allow
        reason: "Git commands are fine"

  strict:
    default: ask
    rules:
      - tool: bash
        pattern: "\\brm\\s+-rf"
        action: deny
        reason: "No rm -rf"
```

#### Rule Fields

| Field | Required | Description |
|-------|----------|-------------|
| `tool` | Yes | Tool name (string) or names (array) to match |
| `param` | No* | Input field to match against |
| `pattern` | Yes | Pattern string with `r:` (regex) or `g:` (glob) prefix |
| `flags` | No | Regex flags (e.g., `"i"` for case-insensitive) |
| `action` | Yes | `"allow"`, `"deny"`, or `"ask"` |
| `reason` | No | Explanation shown to user or LLM |

\* Auto-detected for built-in tools: `bash`→`command`, `read`/`write`/`edit`→`path`.

#### Pattern Prefixes

- **`r:`** — Regex matching (default). Example: `r:\bsudo\b`
- **`g:`** — Glob matching via picomatch. Example: `g:**/.env*`

#### Bash Command Chain Detection

When a `bash` tool call targets the `command` parameter, the system splits compound commands (e.g., `git push && rm -rf /`) and evaluates each part independently. If **any** part produces a `deny`, the entire call is blocked.

### Commands

```
/permissions                  # Overview (active preset, ephemeral count, default action)
/permissions list             # Show all active rules across all layers
/permissions ephemeral        # Show only ephemeral (session) rules
/permissions add <args>       # Add an ephemeral rule
/permissions rm <id>          # Remove an ephemeral rule by id
/permissions clear            # Remove all ephemeral rules
/permissions use <name>       # Switch active preset
/permissions presets          # List available presets from config
/permissions reload           # Reload config from disk
/permissions check            # Validate config without applying
```

All subcommands support tab completion.

### Dependencies

- **picomatch** — Glob pattern matching
- **unbash** — Bash command splitting
- **js-yaml** — YAML config parsing

## OpenSpec Change Management

This repository uses an [OpenSpec](https://github.com/earendil-works/openspec)-based workflow for managing changes. Specifications live in `openspec/specs/` as the source of truth; changes are proposed, designed, and implemented through a structured pipeline.

### Structure

```
openspec/
├── specs/                      # Living specifications
│   ├── bash-command-splitting/
│   ├── ephemeral-rules/
│   ├── interactive-prompts/
│   ├── permission-commands/
│   ├── preset-management/
│   └── rule-matching/
└── changes/
    ├── archive/                # Completed changes
    └── <active-change>/        # In-progress changes
        ├── proposal.md         # What & why
        ├── design.md           # How
        └── tasks.md            # Implementation steps
```

### Agent Skills

Four skills support the OpenSpec workflow (available as `/opsx-*` commands):

| Skill | Purpose |
|-------|---------|
| `openspec-explore` | Think through ideas, investigate problems, clarify requirements |
| `openspec-propose` | Generate a complete change proposal in one step |
| `openspec-apply-change` | Implement tasks from an approved change |
| `openspec-archive-change` | Finalize and archive a completed change |

## Development

### Prerequisites

- [Bun](https://bun.sh/) (package manager)

### Setup

```bash
bun install
```

### Common Commands

```bash
bun add <package>          # Add dependency
bun add -d <package>       # Add dev dependency
bun run <script>           # Run a package script
```

### Conventions

- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/) — `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Example: `feat(matcher): add bash command chain detection`
- **Search**: Use `ripgrep` (`rg`), not `grep`
- **Package runner**: Use `bunx`, not `npx`

## License

MIT
