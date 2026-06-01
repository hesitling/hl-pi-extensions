import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import type { Config, Preset, Rule } from "./types";

const CONFIG_PATH = join(homedir(), ".pi", "permissions.yml");

/** Auto-detect param field for built-in tools */
const BUILTIN_PARAM_MAP: Record<string, string> = {
  bash: "command",
  read: "path",
  write: "path",
  edit: "path",
  grep: "pattern",
  find: "query",
};

/**
 * Resolve the param field for a rule.
 * Auto-detects for built-in tools if omitted. Returns null if unresolvable.
 */
export function resolveParam(rule: Rule, toolName: string): string | null {
  if (rule.param) return rule.param;
  return BUILTIN_PARAM_MAP[toolName] ?? null;
}

/**
 * Get the default param field for a tool name (for display purposes).
 */
export function getDefaultParam(toolName: string): string | undefined {
  return BUILTIN_PARAM_MAP[toolName];
}

/**
 * Parse a pattern string with r:/g: prefix into engine and pattern.
 */
export function parsePattern(raw: string): { engine: "regex" | "glob"; pattern: string } {
  if (raw.startsWith("r:")) return { engine: "regex", pattern: raw.slice(2) };
  if (raw.startsWith("g:")) return { engine: "glob", pattern: raw.slice(2) };
  throw new Error(`Pattern must start with r: or g:, got "${raw}"`);
}

/**
 * Validate a single rule. Returns null if valid, error message if invalid.
 */
function validateRule(rule: unknown, presetName: string, index: number): string | null {
  if (!rule || typeof rule !== "object") {
    return `Preset "${presetName}", rule ${index + 1}: must be an object`;
  }
  const r = rule as Record<string, unknown>;

  if (!r.tool) {
    return `Preset "${presetName}", rule ${index + 1}: missing required field "tool"`;
  }
  if (typeof r.tool !== "string" && !Array.isArray(r.tool)) {
    return `Preset "${presetName}", rule ${index + 1}: "tool" must be a string or array`;
  }
  if (!r.action) {
    return `Preset "${presetName}", rule ${index + 1}: missing required field "action"`;
  }
  if (!["allow", "deny", "ask"].includes(r.action as string)) {
    return `Preset "${presetName}", rule ${index + 1}: "action" must be "allow", "deny", or "ask"`;
  }

  // Reject old matchType field
  if (r.matchType) {
    return `Preset "${presetName}", rule ${index + 1}: matchType removed, use r:/g: prefix in pattern`;
  }

  // Validate pattern if present
  if (r.pattern) {
    // Parse and validate pattern prefix
    let parsed: { engine: "regex" | "glob"; pattern: string };
    try {
      parsed = parsePattern(r.pattern as string);
    } catch {
      return `Preset "${presetName}", rule ${index + 1}: pattern must start with r: or g:, got "${r.pattern}"`;
    }

    // Validate regex compiles
    if (parsed.engine === "regex") {
      try {
        new RegExp(parsed.pattern, (r.flags as string) ?? "");
      } catch {
        return `Preset "${presetName}", rule ${index + 1}: invalid regex "${parsed.pattern}"`;
      }
    }

    // Warn if flags set on glob pattern
    if (parsed.engine === "glob" && r.flags) {
      console.warn(`[permission] Preset "${presetName}", rule ${index + 1}: flags only applies to r: patterns, ignoring`);
    }

    // Check that at least one tool in the array has a resolvable param if param is omitted
    if (!r.param) {
      const tools = Array.isArray(r.tool) ? r.tool : [r.tool];
      const hasResolvable = tools.some((t: unknown) => typeof t === "string" && BUILTIN_PARAM_MAP[t]);
      if (!hasResolvable) {
        return `Preset "${presetName}", rule ${index + 1}: "param" is required for custom tools (not auto-detectable)`;
      }
    }
  }

  return null;
}

/**
 * Normalize a raw rule from YAML into a clean Rule object.
 */
function normalizeRule(raw: Record<string, unknown>): Rule {
  return {
    tool: raw.tool as string | string[],
    param: raw.param as string | undefined,
    pattern: raw.pattern as string | undefined,
    flags: raw.flags as string | undefined,
    action: raw.action as Rule["action"],
    reason: raw.reason as string | undefined,
  };
}

/**
 * Load and validate the config from disk.
 * Returns a valid Config or a fallback empty config.
 */
export function loadConfig(): Config {
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf-8");
  } catch {
    console.warn(`[permission] Config file not found at ${CONFIG_PATH}, using defaults`);
    return { presets: { default: { default: "ask", rules: [] } } };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (e) {
    console.warn(`[permission] Failed to parse config: ${e}`);
    return { presets: { default: { default: "ask", rules: [] } } };
  }

  if (!parsed || typeof parsed !== "object") {
    console.warn("[permission] Config is not an object, using defaults");
    return { presets: { default: { default: "ask", rules: [] } } };
  }

  const obj = parsed as Record<string, unknown>;
  const config: Config = {
    active: obj.active as string | undefined,
    presets: {},
  };

  if (!obj.presets || typeof obj.presets !== "object") {
    console.warn('[permission] Config missing "presets" map, using defaults');
    return { presets: { default: { default: "ask", rules: [] } } };
  }

  const presetsRaw = obj.presets as Record<string, unknown>;
  for (const [name, presetRaw] of Object.entries(presetsRaw)) {
    if (!presetRaw || typeof presetRaw !== "object") {
      console.warn(`[permission] Preset "${name}" is not an object, skipping`);
      continue;
    }
    const p = presetRaw as Record<string, unknown>;

    if (!p.default || !["allow", "deny", "ask"].includes(p.default as string)) {
      console.warn(`[permission] Preset "${name}" missing valid "default" field, skipping`);
      continue;
    }

    const rulesRaw = Array.isArray(p.rules) ? p.rules : [];
    const validRules: Rule[] = [];

    for (let i = 0; i < rulesRaw.length; i++) {
      const error = validateRule(rulesRaw[i], name, i);
      if (error) {
        console.warn(`[permission] ${error}, skipping`);
        continue;
      }
      validRules.push(normalizeRule(rulesRaw[i] as Record<string, unknown>));
    }

    config.presets[name] = {
      default: p.default as Preset["default"],
      rules: validRules,
    };
  }

  if (Object.keys(config.presets).length === 0) {
    console.warn("[permission] No valid presets found, creating default");
    config.presets.default = { default: "ask", rules: [] };
  }

  return config;
}

/**
 * Get the list of available preset names from config.
 */
export function getPresetNames(config: Config): string[] {
  return Object.keys(config.presets);
}

/**
 * Check if a preset exists in config.
 */
export function hasPreset(config: Config, name: string): boolean {
  return name in config.presets;
}

/**
 * Get a preset by name, or undefined if not found.
 */
export function getPreset(config: Config, name: string): Preset | undefined {
  return config.presets[name];
}
