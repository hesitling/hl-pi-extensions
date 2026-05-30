# AGENTS.md

Instructions for AI agents working in this repository.

## Codebase Navigation

```
.
├── permission/             # Permission extension
│   ├── index.ts            # Entry point — tool_call interception
│   ├── matcher.ts          # Rule compilation and 3-layer evaluation
│   ├── types.ts            # All TypeScript interfaces
│   └── package.json
│
├── openspec/               # Change management
│   ├── specs/              # Living specifications (source of truth)
│   └── changes/            # Active and archived change proposals
│
└── .pi/                    # Agent skills and prompts
```

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
