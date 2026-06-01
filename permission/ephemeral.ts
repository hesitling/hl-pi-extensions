import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { EphemeralRule, PermissionState, RuleAction } from "./types";
import { getDefaultParam } from "./config";
import { compileRule } from "./matcher";
import { recompileEphemeral } from "./state";

/**
 * Add an ephemeral rule to the state.
 * Returns the assigned id.
 */
export function addEphemeralRule(state: PermissionState, rule: Omit<EphemeralRule, "id">): number {
  const id = state.nextEphemeralId++;
  const ephemeralRule: EphemeralRule = { ...rule, id };
  state.ephemeralRules.push(ephemeralRule);
  recompileEphemeral(state);
  return id;
}

/**
 * Remove an ephemeral rule by id.
 * Returns true if found and removed, false otherwise.
 */
export function removeEphemeralRule(state: PermissionState, id: number): boolean {
  const index = state.ephemeralRules.findIndex((r) => r.id === id);
  if (index === -1) return false;
  state.ephemeralRules.splice(index, 1);
  recompileEphemeral(state);
  return true;
}

/**
 * Clear all ephemeral rules. Returns the count of rules removed.
 */
export function clearEphemeralRules(state: PermissionState): number {
  const count = state.ephemeralRules.length;
  state.ephemeralRules = [];
  recompileEphemeral(state);
  return count;
}

/**
 * Get the list of current ephemeral rules.
 */
export function listEphemeralRules(state: PermissionState): EphemeralRule[] {
  return [...state.ephemeralRules];
}

/**
 * Parse inline arguments for `/permissions add <tool> <param> <pattern> <action> [reason]`.
 * Returns parsed rule fields or null if args are insufficient.
 */
export function parseInlineAddArgs(
  args: string,
): { tool: string | string[]; param?: string; pattern: string; action: RuleAction; reason?: string } | null {
  const parts = splitArgs(args);
  if (parts.length < 3) return null;

  // Determine if first arg is an array: [write,edit]
  let tool: string | string[];
  let offset = 0;
  if (parts[0].startsWith("[") && parts[0].endsWith("]")) {
    tool = parts[0]
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim());
    offset = 1;
  } else {
    tool = parts[0];
    offset = 1;
  }

  const remaining = parts.slice(offset);
  if (remaining.length < 2) return null;

  // Try to detect if second arg is a param or pattern
  // If tool is a known builtin and second arg doesn't look like a pattern, treat as param
  const knownBuiltins = ["bash", "read", "write", "edit", "grep", "find", "ls"];
  const toolName = Array.isArray(tool) ? tool[0] : tool;
  const secondArgLooksLikeParam =
    knownBuiltins.includes(toolName) && !remaining[0].includes("\\") && !remaining[0].includes("*");

  let param: string | undefined;
  let pattern: string;
  let actionStr: string;
  let reason: string | undefined;

  if (secondArgLooksLikeParam && remaining.length >= 3) {
    param = remaining[0];
    pattern = remaining[1];
    actionStr = remaining[2];
    reason = remaining[3];
  } else {
    pattern = remaining[0];
    actionStr = remaining[1];
    reason = remaining[2];
  }

  if (!["allow", "deny", "ask"].includes(actionStr)) return null;

  return {
    tool,
    param,
    pattern,
    action: actionStr as RuleAction,
    reason,
  };
}

/**
 * Split a string by spaces, respecting quoted strings.
 */
function splitArgs(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Interactive add wizard: prompt user for all fields via ctx.ui.
 * Returns the rule fields or null if cancelled.
 */
export async function interactiveAdd(
  ctx: ExtensionContext,
): Promise<Omit<EphemeralRule, "id"> | null> {
  const toolStr = await ctx.ui.input("Tool name(s):", "bash");
  if (!toolStr) return null;

  // Parse tool: could be "bash" or "[write,edit]"
  let tool: string | string[];
  if (toolStr.startsWith("[") && toolStr.endsWith("]")) {
    tool = toolStr
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim());
  } else {
    tool = toolStr.trim();
  }

  // Suggest default param
  const toolName = Array.isArray(tool) ? tool[0] : tool;
  const defaultParam = getDefaultParam(toolName) ?? "command";

  const param = await ctx.ui.input("Parameter to match:", defaultParam);
  if (!param) return null;

  const pattern = await ctx.ui.input("Pattern (r:... or g:...):", "");
  if (!pattern) return null;

  const actionChoice = await ctx.ui.select("Action:", ["allow", "deny", "ask"]);
  if (!actionChoice) return null;

  const reason = await ctx.ui.input("Reason (optional):", "");

  return {
    tool,
    param,
    pattern,
    action: actionChoice as RuleAction,
    reason: reason || undefined,
  };
}
