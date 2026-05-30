# AGENTS.md

Instructions for AI agents working in this repository.

## Codebase Navigation

```
.
├── permission/                  # The permission extension (main codebase)
│   ├── index.ts                 # Entry point, session lifecycle, tool_call interception
│   ├── types.ts                 # TypeScript interfaces (Rule, Preset, Config, Decision, etc.)
│   ├── config.ts                # YAML config loading, param auto-detection
│   ├── matcher.ts               # Rule compilation, pattern matching, 3-layer evaluation
│   ├── state.ts                 # State management, preset switching, session persistence
│   ├── ephemeral.ts             # Session-bound temporary rules
│   ├── commands.ts              # /permissions command and subcommands
│   ├── ui.ts                    # Ask-prompt formatting
│   └── package.json             # Dependencies (js-yaml, picomatch)
│
├── openspec/                    # OpenSpec change management
│   ├── specs/                   # Living specifications (source of truth)
│   │   ├── rule-matching/spec.md
│   │   ├── ephemeral-rules/spec.md
│   │   ├── preset-management/spec.md
│   │   ├── permission-commands/spec.md
│   │   └── interactive-prompts/spec.md
│   └── changes/                 # Change proposals (active and archived)
│       └── command-chain-detection/
│           ├── proposal.md      # Why
│           ├── design.md        # How
│           ├── specs/           # Delta specs for this change
│           └── tasks.md         # Implementation checklist
│
└── .pi/                         # pi agent configuration
    ├── skills/                  # OpenSpec workflow skills
    └── prompts/                 # Prompt templates for OpenSpec commands
```

### Key entry points

- **Permission evaluation flow**: `index.ts` → `matcher.ts` → `evaluate()`
- **Rule compilation**: `config.ts` → `matcher.ts` → `compileRules()`
- **Config loading**: `config.ts` → `loadConfig()` reads `~/.pi/permissions.yml`
- **State management**: `state.ts` manages active preset, ephemeral rules, compiled rules

## Bun

Use `bun` as the package manager. Do not use `npm` or `yarn`.

```bash
bun add <package>         # Add dependency
bun add -d <package>      # Add dev dependency
bun install               # Install all dependencies
bun run <script>          # Run a package script
```

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

Format: `<type>(<scope>): <description>`

Types used in this repo:

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation, specs, proposals |
| `refactor` | Code restructure without behavior change |
| `test` | Adding or updating tests |
| `chore` | Dependencies, config, tooling |

Scope is optional. Use the module name when relevant (e.g., `feat(matcher)`, `docs(specs)`).

Examples:
```
feat: add bash command chain detection
feat(matcher): split compound commands before evaluation
docs: add command-chain-detection change proposal
chore: add unbash dependency
test(bash-split): verify quoted separators are preserved
```
