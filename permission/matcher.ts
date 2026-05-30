import picomatch from "picomatch";
import type { CompiledRule, Decision, DecisionLayer, EphemeralRule, Rule, RuleAction } from "./types";
import { resolveParam } from "./config";

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

  const matchType = rule.matchType ?? "regex";

  if (matchType === "glob") {
    const matcher = picomatch(rule.pattern);
    return { rule, globMatcher: matcher, resolvedParam };
  }

  // Default: regex
  try {
    const regex = new RegExp(rule.pattern, rule.flags ?? "");
    return { rule, regex, resolvedParam };
  } catch {
    console.warn(`[permission] Invalid regex pattern "${rule.pattern}", skipping rule`);
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
 * Evaluate a tool call against the three-layer permission system.
 *
 * Layer 1: Ephemeral rules (strongest)
 * Layer 2: Active preset rules
 * Layer 3: Default action
 */
export function evaluate(
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
