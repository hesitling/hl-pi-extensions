import { parse } from "unbash";
import type { Node, Command, Statement } from "unbash";

/**
 * Extract individual simple commands from a bash command string.
 *
 * Parses the command into an AST and walks it to find all leaf `Command` nodes,
 * reconstructing each as a simple command string (name + arguments).
 *
 * Handles: `&&`, `||`, `;`, `|`, subshells `()`, brace groups `{}`
 * Correctly preserves quoted separators (e.g., `echo "hello && world"` stays as one command).
 *
 * @param command The raw bash command string
 * @returns Array of extracted simple command strings. Falls back to `[command]` on parse failure.
 */
export function extractBashCommands(command: string): string[] {
  try {
    const script = parse(command);

    // If parse produced errors and no commands, fall back
    if (!script.commands || script.commands.length === 0) {
      return [command];
    }

    const commands: string[] = [];
    for (const stmt of script.commands) {
      extractFromNode(stmt.command, commands);
    }

    // If extraction yielded nothing, fall back to original
    if (commands.length === 0) {
      return [command];
    }

    return commands;
  } catch {
    // Parse failure: fall back to whole-string matching
    return [command];
  }
}

/**
 * Recursively extract leaf Command nodes from an AST node.
 */
function extractFromNode(node: Node, result: string[]): void {
  switch (node.type) {
    case "Command":
      reconstructCommand(node, result);
      break;

    case "Statement":
      // Statement wraps another node
      extractFromNode(node.command, result);
      break;

    case "AndOr":
      // && or || chains: recurse into each command
      for (const cmd of node.commands) {
        extractFromNode(cmd, result);
      }
      break;

    case "Pipeline":
      // | chains: recurse into each command
      for (const cmd of node.commands) {
        extractFromNode(cmd, result);
      }
      break;

    case "Subshell":
      // ( ... ) groups: recurse into body statements
      for (const stmt of node.body.commands) {
        extractFromNode(stmt.command, result);
      }
      break;

    case "BraceGroup":
      // { ... } groups: recurse into body statements
      for (const stmt of node.body.commands) {
        extractFromNode(stmt.command, result);
      }
      break;

    case "CompoundList":
      // Semicolon-separated list: recurse into each statement
      for (const stmt of node.commands) {
        extractFromNode(stmt.command, result);
      }
      break;

    default:
      // For other node types (If, For, While, Case, etc.), don't extract
      // These are complex constructs that shouldn't be split
      break;
  }
}

/**
 * Reconstruct a simple command string from a Command AST node.
 * Joins name.value + suffix[].value with spaces.
 */
function reconstructCommand(node: Command, result: string[]): void {
  const parts: string[] = [];

  if (node.name) {
    parts.push(node.name.value);
  }

  for (const word of node.suffix) {
    parts.push(word.value);
  }

  if (parts.length > 0) {
    result.push(parts.join(" "));
  }
}
