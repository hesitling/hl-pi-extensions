import type { Config, EphemeralRule, PermissionState, CompiledRule } from "./types";
import { getPresetNames, getPreset, getDefaultParam } from "./config";

/**
 * Format an overview: preset name, ephemeral count, default action.
 */
export function formatOverview(state: PermissionState): string {
  const preset = getPreset(state.config, state.activePreset);
  const defaultAction = preset?.default ?? "ask";
  const presetRuleCount = preset?.rules.length ?? 0;
  const ephemeralCount = state.ephemeralRules.length;

  const lines = [
    `🔒 Preset: ${state.activePreset} (default: ${defaultAction}) | 📝 Ephemeral: ${ephemeralCount} | Rules: ${presetRuleCount}`,
    `   /permissions list  /permissions add  /permissions help`,
  ];
  return lines.join("\n");
}

/**
 * Format a single rule for display.
 */
function formatRule(rule: EphemeralRule | CompiledRule["rule"], index?: number, id?: number): string {
  const action = rule.action.padEnd(5);
  const tools = Array.isArray(rule.tool) ? `[${rule.tool.join(",")}]` : rule.tool;
  const toolStr = tools.padEnd(12);
  const param = rule.param ?? "?";
  const pattern = rule.pattern.length > 40 ? rule.pattern.slice(0, 37) + "..." : rule.pattern;
  const prefix = id !== undefined ? `#${String(id).padEnd(3)}` : `   `;
  const idx = index !== undefined ? String(index + 1).padStart(2) : "  ";
  return `  ${prefix} ${action} ${toolStr} ${param.padEnd(10)} ${pattern}`;
}

/**
 * Format the full rule list: ephemeral + preset with visual separation.
 */
export function formatFullList(state: PermissionState): string {
  const lines: string[] = [];
  const preset = getPreset(state.config, state.activePreset);

  // Ephemeral section
  lines.push(`📝 Ephemeral Rules: ${state.ephemeralRules.length} active`);
  lines.push("");
  if (state.ephemeralRules.length > 0) {
    lines.push(" ── Ephemeral (session-only) ──────────────────");
    for (const rule of state.ephemeralRules) {
      lines.push(formatRule(rule, undefined, rule.id));
    }
  } else {
    lines.push("  (none)");
  }

  lines.push("");

  // Preset section
  const presetRuleCount = preset?.rules.length ?? 0;
  lines.push(`🔒 Preset "${state.activePreset}" (default: ${preset?.default ?? "ask"}): ${presetRuleCount} rules`);
  lines.push("");
  if (preset && preset.rules.length > 0) {
    lines.push(` ── Preset "${state.activePreset}" ───────────────────────`);
    for (let i = 0; i < preset.rules.length; i++) {
      lines.push(formatRule(preset.rules[i], i));
    }
  } else {
    lines.push("  (no rules)");
  }

  return lines.join("\n");
}

/**
 * Format ephemeral rules only.
 */
export function formatEphemeralList(state: PermissionState): string {
  const lines: string[] = [];
  lines.push(`📝 Ephemeral Rules: ${state.ephemeralRules.length} active`);
  lines.push("");

  if (state.ephemeralRules.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }

  for (const rule of state.ephemeralRules) {
    lines.push(formatRule(rule, undefined, rule.id));
  }

  return lines.join("\n");
}

/**
 * Format all available presets with their details.
 */
export function formatPresetList(state: PermissionState): string {
  const names = getPresetNames(state.config);
  const lines: string[] = [];
  lines.push("📋 Available Presets:");
  lines.push("");

  for (const name of names) {
    const preset = getPreset(state.config, name);
    const marker = name === state.activePreset ? " ← active" : "";
    const ruleCount = preset?.rules.length ?? 0;
    const defaultAction = preset?.default ?? "ask";
    lines.push(`  ${name.padEnd(15)} default: ${defaultAction.padEnd(5)} ${ruleCount} rules${marker}`);
  }

  return lines.join("\n");
}

/**
 * Format validation results for `/permissions check`.
 */
export function formatValidationResult(config: Config, errors: string[]): string {
  if (errors.length === 0) {
    const presetCount = Object.keys(config.presets).length;
    const totalRules = Object.values(config.presets).reduce((sum, p) => sum + p.rules.length, 0);
    return `✅ Config valid: ${presetCount} presets, ${totalRules} total rules`;
  }

  const lines = ["❌ Config has errors:", ""];
  for (const err of errors) {
    lines.push(`  • ${err}`);
  }
  return lines.join("\n");
}

/**
 * Format the result of adding an ephemeral rule.
 */
export function formatAddResult(id: number, rule: Omit<EphemeralRule, "id">): string {
  const tools = Array.isArray(rule.tool) ? `[${rule.tool.join(",")}]` : rule.tool;
  const param = rule.param ?? "(auto)";
  return `✓ Added ephemeral rule #${id}: ${rule.action} ${tools} ${param} /${rule.pattern}/`;
}

/**
 * Format the result of removing an ephemeral rule.
 */
export function formatRemoveResult(id: number, success: boolean): string {
  if (success) {
    return `✓ Removed ephemeral rule #${id}`;
  }
  return `✗ No ephemeral rule with id ${id}`;
}

/**
 * Format the result of clearing ephemeral rules.
 */
export function formatClearResult(count: number): string {
  if (count === 0) {
    return "No ephemeral rules to clear";
  }
  return `✓ Cleared ${count} ephemeral rules`;
}

/**
 * Format the result of switching presets.
 */
export function formatSwitchResult(name: string, state: PermissionState): string {
  const preset = getPreset(state.config, name);
  const ruleCount = preset?.rules.length ?? 0;
  const ephemeralCount = state.ephemeralRules.length;
  return `✓ Switched to preset "${name}" (default: ${preset?.default ?? "ask"}, ${ruleCount} rules)\n   Ephemeral rules: ${ephemeralCount} active`;
}

/**
 * Format help text for /permissions command.
 */
export function formatHelp(): string {
  return `🔒 Permission Extension

Three-layer permission system for controlling tool calls:
  Layer 1: Ephemeral rules (session-bound, strongest)
  Layer 2: Active preset rules (persistent, switchable)
  Layer 3: Default action

Usage:
  /permissions              Show overview (preset, ephemeral count, rule count)
  /permissions help         Show this help message

Subcommands:
  /permissions list         Show all rules (ephemeral + active preset)
  /permissions ephemeral    Show ephemeral rules only
  /permissions add          Add ephemeral rule interactively
  /permissions add <tool> [param] <pattern> <action> [reason]
                            Add ephemeral rule inline
  /permissions rm <id>      Remove ephemeral rule by id
  /permissions clear        Clear all ephemeral rules
  /permissions use <name>   Switch to a different preset
  /permissions presets      List all available presets
  /permissions reload       Reload config from ~/.pi/permissions.yml
  /permissions check        Validate config file for errors

Examples:
  /permissions add bash command "\\bsudo\\b" deny "No sudo"
  /permissions add read path "\\.env$" deny "Protect secrets"
  /permissions rm 3
  /permissions use permissive

Config file: ~/.pi/permissions.yml`;
}

/**
 * Format a tool call confirmation prompt for "ask" action.
 */
export function formatAskPrompt(toolName: string, input: Record<string, unknown>, reason: string, layer: string): string {
  const param = input.command ?? input.path ?? input.pattern ?? input.query ?? JSON.stringify(input);
  const displayParam = String(param).length > 120 ? String(param).slice(0, 117) + "..." : String(param);
  return `⚠️ ${layer}\n\n  ${toolName}: ${displayParam}\n\n  ${reason}\n\nAllow?`;
}
