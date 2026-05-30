import type { ExtensionAPI, SessionManager } from "@earendil-works/pi-coding-agent";
import type { Config, PermissionState, CompiledRule } from "./types";
import { loadConfig, getPreset, hasPreset } from "./config";
import { compileRules } from "./matcher";

/**
 * Create the initial permission state.
 * Resolves active preset from: saved session entry → config.active → "default".
 */
export function createInitialState(): PermissionState {
  const config = loadConfig();
  const activePreset = resolveActivePreset(config, undefined);
  const preset = getPreset(config, activePreset);

  return {
    config,
    activePreset,
    ephemeralRules: [],
    nextEphemeralId: 1,
    compiledPresetRules: preset ? compileRules(preset.rules) : [],
    compiledEphemeralRules: [],
  };
}

/**
 * Resolve which preset to use.
 * Priority: savedPreset → config.active → "default" → first available.
 */
export function resolveActivePreset(config: Config, savedPreset: string | undefined): string {
  // 1. Saved from session
  if (savedPreset && hasPreset(config, savedPreset)) {
    return savedPreset;
  }
  // 2. Config active field
  if (config.active && hasPreset(config, config.active)) {
    return config.active;
  }
  // 3. "default" preset
  if (hasPreset(config, "default")) {
    return "default";
  }
  // 4. First available
  const names = Object.keys(config.presets);
  if (names.length > 0) {
    return names[0];
  }
  // Should not happen (loadConfig always creates at least "default")
  return "default";
}

/**
 * Scan session entries for the latest "permission-preset" entry.
 */
export function findSavedPreset(sessionManager: SessionManager): string | undefined {
  const entries = sessionManager.getEntries();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "custom" && entry.customType === "permission-preset") {
      const data = entry.data as Record<string, unknown> | undefined;
      if (data && typeof data.name === "string") {
        return data.name;
      }
    }
  }
  return undefined;
}

/**
 * Switch to a new preset. Returns true if successful, false if preset not found.
 * Updates state in-place.
 */
export function switchPreset(state: PermissionState, name: string): boolean {
  if (!hasPreset(state.config, name)) {
    return false;
  }

  state.activePreset = name;
  const preset = getPreset(state.config, name);
  state.compiledPresetRules = preset ? compileRules(preset.rules) : [];
  return true;
}

/**
 * Persist the active preset choice to the session.
 */
export function persistPreset(pi: ExtensionAPI, name: string): void {
  pi.appendEntry("permission-preset", { name });
}

/**
 * Reload config from disk and recompile rules for the active preset.
 * Preserves ephemeral rules.
 */
export function reloadConfig(state: PermissionState): void {
  state.config = loadConfig();

  // Ensure active preset still exists
  if (!hasPreset(state.config, state.activePreset)) {
    console.warn(`[permission] Active preset "${state.activePreset}" no longer exists, falling back`);
    state.activePreset = resolveActivePreset(state.config, undefined);
  }

  const preset = getPreset(state.config, state.activePreset);
  state.compiledPresetRules = preset ? compileRules(preset.rules) : [];
}

/**
 * Recompile ephemeral rules (call after add/remove/clear).
 */
export function recompileEphemeral(state: PermissionState): void {
  state.compiledEphemeralRules = compileRules(state.ephemeralRules);
}

/**
 * Get the default action for the active preset.
 */
export function getDefaultAction(state: PermissionState): "allow" | "deny" | "ask" {
  const preset = getPreset(state.config, state.activePreset);
  return preset?.default ?? "ask";
}
