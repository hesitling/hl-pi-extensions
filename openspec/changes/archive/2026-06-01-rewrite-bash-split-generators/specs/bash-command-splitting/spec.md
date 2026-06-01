## No Spec Changes

This change is a pure implementation rewrite. The external behavior of `extractBashCommands()` remains identical — all existing requirements and scenarios in `openspec/specs/bash-command-splitting/spec.md` continue to apply unchanged.

The rewrite improves internals (AST walk instead of string scan, generators instead of arrays) without changing what the system does.
