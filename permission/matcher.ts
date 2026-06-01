import picomatch from "picomatch";
import type { CompiledRule, Decision, DecisionLayer, EphemeralRule, Rule, RuleAction } from "./types";
import { resolveParam, parsePattern } from "./config";
import { extractBashCommandsArray } from "./bash-split";

/**
 * Compile a single rule into a CompiledRule with pre-compiled pattern.
 * Returns null if the rule cannot be compiled (e.g., unresolvable param).
 */
export function compileRule(rule: Rule | EphemeralRule): CompiledRule | null {
  // Resolve the parameter name across all tool names in the rule
  const tools = Array.isArray(rule.tool) ? rule.tool : [rule.tool];
  let resolvedParam: string | null = null;

  for (const t of tools) {
    const p = resolveParam(rule, t);
    if (p) {
      resolvedParam = p;
      break;
    }
  }

  if (!resolvedParam) {
    return null;
  }

  let engine: "regex" | "glob";
  let pattern: string;
  try {
    ({ engine, pattern } = parsePattern(rule.pattern));
  } catch {
    console.warn(`[permission] Invalid pattern "${rule.pattern}", skipping rule`);
    return null;
  }

  if (engine === "glob") {
    const matcher = picomatch(pattern);
    return { rule, globMatcher: matcher, resolvedParam };
  }

  // Regex
  try {
    const regex = new RegExp(pattern, rule.flags ?? "");
    return { rule, regex, resolvedParam };
  } catch {
    console.warn(`[permission] Invalid regex pattern "${pattern}", skipping rule`);
    return null;
  }
}

/**
 * Compile an array of rules, filtering out invalid ones.
 */
export function compileRules(rules: Rule[]): CompiledRule[] {
  const compiled: CompiledRule[] = [];
  for (const rule of rules) {
    const cr = compileRule(rule);
    if (cr) compiled.push(cr);
  }
  return compiled;
}

/**
 * Check if a compiled rule matches the given tool call.
 */
export function matchRule(compiled: CompiledRule, toolName: string, input: Record<string, unknown>): boolean {
  const { rule, regex, globMatcher, resolvedParam } = compiled;

  // Check tool name match
  const tools = Array.isArray(rule.tool) ? rule.tool : [rule.tool];
  if (!tools.includes(toolName)) {
    return false;
  }

  // Get the parameter value
  const paramValue = input[resolvedParam];
  if (paramValue === undefined || paramValue === null) {
    return false;
  }
  const strValue = String(paramValue);

  // Match pattern
  if (globMatcher) {
    return globMatcher(strValue);
  }
  if (regex) {
    regex.lastIndex = 0; // Reset for global flag safety
    return regex.test(strValue);
  }

  return false;
}

/**
 * Build a human-readable reason string for a decision.
 */
function buildReason(
  action: RuleAction,
  ruleReason: string | undefined,
  layer: DecisionLayer,
  layerDetail: string,
): string {
  if (ruleReason) return ruleReason;
  if (action === "deny") return `Blocked by ${layerDetail}`;
  if (action === "ask") return `Confirmation required by ${layerDetail}`;
  return `Allowed by ${layerDetail}`;
}

/**
 * Check if a tool call is a bash command that should be split.
 * Returns true if the tool is "bash" and the resolved param is "command".
 */
function shouldSplitCommands(toolName: string, compiledRules: CompiledRule[]): boolean {
  if (toolName !== "bash") return false;
  // Check if any rule targets the bash command param
  return compiledRules.some(cr => cr.resolvedParam === "command");
}

/**
 * Evaluate a tool call against the three-layer permission system.
 *
 * Layer 1: Ephemeral rules (strongest)
 * Layer 2: Active preset rules
 * Layer 3: Default action
 *
 * For bash tools with `param: command`, the command string is split into
 * individual simple commands and each is evaluated independently.
 * Any deny on any part blocks the entire call.
 */
export function evaluate(
  toolName: string,
  input: Record<string, unknown>,
  compiledEphemeralRules: CompiledRule[],
  compiledPresetRules: CompiledRule[],
  defaultAction: RuleAction,
  activePresetName: string,
): Decision {
  // Check if we should split bash commands
  const allRules = [...compiledEphemeralRules, ...compiledPresetRules];
  const needsSplit = shouldSplitCommands(toolName, allRules);

  if (needsSplit && typeof input.command === "string") {
    return evaluateBashCommands(
      input.command,
      toolName,
      input,
      compiledEphemeralRules,
      compiledPresetRules,
      defaultAction,
      activePresetName,
    );
  }

  // Non-bash tools or non-command params: evaluate whole string
  return evaluateWholeString(
    toolName,
    input,
    compiledEphemeralRules,
    compiledPresetRules,
    defaultAction,
    activePresetName,
  );
}

/**
 * Evaluate a bash command by splitting it into parts and evaluating each.
 * Uses "any deny blocks all" aggregation.
 */
function evaluateBashCommands(
  command: string,
  toolName: string,
  input: Record<string, unknown>,
  compiledEphemeralRules: CompiledRule[],
  compiledPresetRules: CompiledRule[],
  defaultAction: RuleAction,
  activePresetName: string,
): Decision {
  const parts = extractBashCommandsArray(command);

  // Track the "worst" decision across parts
  let worstAction: RuleAction = "allow";
  let worstDecision: Decision | null = null;

  for (const part of parts) {
    const partInput = { ...input, command: part };
    const decision = evaluateWholeString(
      toolName,
      partInput,
      compiledEphemeralRules,
      compiledPresetRules,
      defaultAction,
      activePresetName,
    );

    // Track the worst action: deny > ask > allow
    const action = decision.action as string;
    if (action === "deny") {
      return decision; // Immediate deny
    }
    if (action === "ask") {
      worstAction = "ask";
      worstDecision = decision;
    }
  }

  // If any part asked (and none denied), return ask
  if (worstDecision) {
    return worstDecision;
  }

  // All parts allowed
  return {
    action: "allow",
    reason: `All command parts allowed in preset "${activePresetName}"`,
    layer: "preset",
  };
}

/**
 * Evaluate a single command string against the three-layer system.
 * Original whole-string evaluation logic.
 */
function evaluateWholeString(
  toolName: string,
  input: Record<string, unknown>,
  compiledEphemeralRules: CompiledRule[],
  compiledPresetRules: CompiledRule[],
  defaultAction: RuleAction,
  activePresetName: string,
): Decision {
  // Layer 1: Ephemeral rules
  for (let i = 0; i < compiledEphemeralRules.length; i++) {
    const cr = compiledEphemeralRules[i];
    if (matchRule(cr, toolName, input)) {
      const ephemeralId = (cr.rule as EphemeralRule).id;
      return {
        action: cr.rule.action,
        reason: buildReason(cr.rule.action, cr.rule.reason, "ephemeral", `ephemeral rule #${ephemeralId}`),
        layer: "ephemeral",
      };
    }
  }

  // Layer 2: Preset rules
  for (let i = 0; i < compiledPresetRules.length; i++) {
    const cr = compiledPresetRules[i];
    if (matchRule(cr, toolName, input)) {
      return {
        action: cr.rule.action,
        reason: buildReason(cr.rule.action, cr.rule.reason, "preset", `preset "${activePresetName}" rule ${i + 1}`),
        layer: "preset",
      };
    }
  }

  // Layer 3: Default action
  return {
    action: defaultAction,
    reason: `Default action from preset "${activePresetName}"`,
    layer: "default",
  };
}
