import { parse } from "unbash";
import type { Node, Command, Script, Word, WordPart, CommandExpansionPart, DoubleQuotedPart } from "unbash";

/**
 * Extract individual simple commands from a bash command string.
 *
 * Walks the unbash AST directly, using CommandExpansionPart.script for
 * command substitutions instead of string scanning + re-parsing.
 *
 * @yields Each extracted command string
 */
export function* extractBashCommands(command: string): Generator<string> {
  try {
    const script = parse(command);

    if (!script.commands?.length) {
      yield command;
      return;
    }

    let yielded = false;
    for (const cmd of walkScript(script)) {
      yielded = true;
      yield cmd;
    }

    if (!yielded) {
      yield command;
    }
  } catch {
    yield command;
  }
}

/** Backward-compat wrapper that returns an array. */
export function extractBashCommandsArray(command: string): string[] {
  return [...extractBashCommands(command)];
}

// ── AST walkers ────────────────────────────────────────────────────

function* walkScript(script: Script): Generator<string> {
  for (const stmt of script.commands) {
    yield* walkNode(stmt.command);
  }
}

function* walkNode(node: Node): Generator<string> {
  switch (node.type) {
    case "Command":
      yield* walkCommand(node);
      break;
    case "Statement":
      yield* walkNode(node.command);
      break;
    case "Pipeline":
    case "AndOr":
      for (const cmd of node.commands) yield* walkNode(cmd);
      break;
    case "Subshell":
    case "BraceGroup":
      for (const stmt of node.body.commands) yield* walkNode(stmt.command);
      break;
    case "CompoundList":
      for (const stmt of node.commands) yield* walkNode(stmt.command);
      break;
    // If, For, While, Case, etc. — don't extract
  }
}

function* walkCommand(cmd: Command): Generator<string> {
  // Yield the command itself
  yield reconstructCommand(cmd);

  // Yield commands from $() and backtick expansions in name + suffix words
  for (const word of [cmd.name, ...cmd.suffix]) {
    if (word) yield* walkWord(word);
  }
}

function* walkWord(word: Word): Generator<string> {
  for (const part of word.parts ?? []) {
    yield* walkPart(part);
  }
}

function* walkPart(part: WordPart): Generator<string> {
  switch (part.type) {
    case "CommandExpansion":
      if (part.script) yield* walkScript(part.script);
      break;
    case "DoubleQuoted":
      for (const child of part.parts) {
        if (child.type === "CommandExpansion" && child.script) {
          yield* walkScript(child.script);
        }
      }
      break;
    case "ProcessSubstitution":
      if (part.script) yield* walkScript(part.script);
      break;
    // SingleQuoted, Literal, SimpleExpansion, etc. — skip
  }
}

// ── Reconstruction ─────────────────────────────────────────────────

function reconstructCommand(cmd: Command): string {
  const parts: string[] = [];
  if (cmd.name) parts.push(cmd.name.value);
  for (const word of cmd.suffix) parts.push(word.value);
  return parts.join(" ");
}
