import { parse } from "unbash";
import type { Node, Command, Statement } from "unbash";

/**
 * Extract individual simple commands from a bash command string.
 *
 * Parses the command into an AST and walks it to find all leaf `Command` nodes,
 * reconstructing each as a simple command string (name + arguments).
 *
 * Also recursively extracts commands from $() and backtick substitutions.
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

    // For each extracted command, also extract from $() and backtick substitutions.
    // Note: unbash strips quotes, so we can't detect single-quoted substitutions
    // in reconstructed commands. This is an acceptable false positive — we may
    // extract from single-quoted substitutions, but won't miss any real ones.
    const result: string[] = [];
    for (const cmd of commands) {
      result.push(cmd);
      const subs = extractFromSubstitution(cmd);
      for (const sub of subs) {
        result.push(...extractBashCommands(sub));
      }
    }

    return result;
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
 * Extract immediate content from $() and backtick substitutions in a command string.
 * Returns only the direct content — caller is responsible for recursive parsing.
 * Does NOT handle nested substitutions; those are discovered when caller
 * recursively calls extractBashCommands on the returned content.
 *
 * @param command The command string to scan
 * @returns Array of content strings found inside substitutions
 */
function extractFromSubstitution(command: string): string[] {
  const extracted: string[] = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < command.length) {
    const ch = command[i];

    // Track quote state (single quotes prevent expansion)
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      i++;
      continue;
    }
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      i++;
      continue;
    }

    // Skip escaped characters
    if (ch === '\\' && !inSingleQuote) {
      i += 2;
      continue;
    }

    // Only extract from substitutions outside single quotes
    if (!inSingleQuote) {
      // $() command substitution
      if (ch === '$' && i + 1 < command.length && command[i + 1] === '(') {
        const inner = extractMatchingParen(command, i + 2, '(', ')');
        if (inner !== null) {
          extracted.push(inner.content);
          i = inner.endIndex;
          continue;
        }
      }

      // Backtick command substitution
      if (ch === '`') {
        const end = command.indexOf('`', i + 1);
        if (end !== -1) {
          extracted.push(command.substring(i + 1, end));
          i = end + 1;
          continue;
        }
      }
    }

    i++;
  }

  return extracted;
}

/**
 * Find the matching closing parenthesis, handling nested parens.
 * Returns the content between parens and the index after the closing paren.
 */
function extractMatchingParen(
  str: string,
  start: number,
  open: string,
  close: string,
): { content: string; endIndex: number } | null {
  let depth = 1;
  let i = start;

  while (i < str.length) {
    const ch = str[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return { content: str.substring(start, i), endIndex: i + 1 };
      }
    }
    // Skip escaped chars
    else if (ch === '\\') {
      i++;
    }
    i++;
  }

  return null; // Unmatched
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
