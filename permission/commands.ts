import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { PermissionState } from "./types";
import { hasPreset, getPresetNames, loadConfig } from "./config";
import { switchPreset, persistPreset, reloadConfig } from "./state";
import {
  addEphemeralRule,
  removeEphemeralRule,
  clearEphemeralRules,
  parseInlineAddArgs,
  interactiveAdd,
} from "./ephemeral";
import {
  formatOverview,
  formatFullList,
  formatEphemeralList,
  formatPresetList,
  formatValidationResult,
  formatAddResult,
  formatRemoveResult,
  formatClearResult,
  formatSwitchResult,
  formatHelp,
} from "./ui";
import { compileRules } from "./matcher";

const SUBCOMMANDS = ["list", "ephemeral", "add", "rm", "clear", "use", "presets", "reload", "check", "help"];

/**
 * Register the /permissions command and all subcommands.
 */
export function registerCommand(pi: ExtensionAPI, state: PermissionState): void {
  pi.registerCommand("permissions", {
    description: "Manage permission rules and presets",
    getArgumentCompletions: (prefix: string) => {
      const parts = prefix.trim().split(/\s+/);
      if (parts.length <= 1) {
        // Complete subcommand
        const items = SUBCOMMANDS.map((s) => ({ value: s, label: s }));
        return items.filter((i) => i.value.startsWith(parts[0] ?? ""));
      }
      // Complete preset names for "use"
      if (parts[0] === "use") {
        const names = getPresetNames(state.config);
        const items = names.map((n) => ({ value: `use ${n}`, label: n }));
        return items.filter((i) => i.value.startsWith(prefix.trim()));
      }
      // Complete ephemeral rule ids for "rm"
      if (parts[0] === "rm") {
        const items = state.ephemeralRules.map((r) => ({
          value: `rm ${r.id}`,
          label: `#${r.id}`,
        }));
        return items.filter((i) => i.value.startsWith(prefix.trim()));
      }
      return null;
    },
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const trimmed = args.trim();
      const [subcommand, ...rest] = trimmed.split(/\s+/);
      const restStr = rest.join(" ");

      switch (subcommand) {
        case "":
        case undefined:
          ctx.ui.notify(formatOverview(state), "info");
          break;

        case "list":
          ctx.ui.notify(formatFullList(state), "info");
          break;

        case "ephemeral":
          ctx.ui.notify(formatEphemeralList(state), "info");
          break;

        case "add":
          await handleAdd(pi, state, restStr, ctx);
          break;

        case "rm":
          await handleRm(state, restStr, ctx);
          break;

        case "clear":
          await handleClear(state, ctx);
          break;

        case "use":
          await handleUse(pi, state, restStr, ctx);
          break;

        case "presets":
          ctx.ui.notify(formatPresetList(state), "info");
          break;

        case "reload":
          handleReload(state, ctx);
          break;

        case "check":
          handleCheck(ctx);
          break;

        case "help":
          ctx.ui.notify(formatHelp(), "info");
          break;

        default:
          ctx.ui.notify(`Unknown subcommand: ${subcommand}\n\nAvailable: ${SUBCOMMANDS.join(", ")}`, "warning");
          break;
      }
    },
  });
}

/**
 * Handle /permissions add — inline or interactive.
 */
async function handleAdd(
  pi: ExtensionAPI,
  state: PermissionState,
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  if (args.trim()) {
    // Inline mode
    const parsed = parseInlineAddArgs(args);
    if (!parsed) {
      ctx.ui.notify(
        'Invalid arguments. Usage: /permissions add <tool> [param] <pattern> <action> [reason]\nExample: /permissions add bash command "\\bsudo\\b" deny "No sudo"',
        "warning",
      );
      return;
    }
    const id = addEphemeralRule(state, parsed);
    ctx.ui.notify(formatAddResult(id, parsed), "info");
  } else {
    // Interactive mode
    if (!ctx.hasUI) {
      ctx.ui.notify("Interactive mode not available. Use inline syntax.", "warning");
      return;
    }
    const rule = await interactiveAdd(ctx);
    if (!rule) {
      ctx.ui.notify("Cancelled", "info");
      return;
    }
    const id = addEphemeralRule(state, rule);
    ctx.ui.notify(formatAddResult(id, rule), "info");
  }
}

/**
 * Handle /permissions rm <id>.
 */
async function handleRm(state: PermissionState, args: string, ctx: ExtensionCommandContext): Promise<void> {
  const idStr = args.trim();
  if (!idStr) {
    ctx.ui.notify("Usage: /permissions rm <id>", "warning");
    return;
  }
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    ctx.ui.notify("Invalid id. Must be a number.", "warning");
    return;
  }
  const success = removeEphemeralRule(state, id);
  ctx.ui.notify(formatRemoveResult(id, success), success ? "info" : "warning");
}

/**
 * Handle /permissions clear.
 */
async function handleClear(state: PermissionState, ctx: ExtensionCommandContext): Promise<void> {
  const count = clearEphemeralRules(state);
  ctx.ui.notify(formatClearResult(count), "info");
}

/**
 * Handle /permissions use <name>.
 */
async function handleUse(
  pi: ExtensionAPI,
  state: PermissionState,
  args: string,
  ctx: ExtensionCommandContext,
): Promise<void> {
  const name = args.trim();
  if (!name) {
    ctx.ui.notify("Usage: /permissions use <preset-name>", "warning");
    return;
  }
  if (!hasPreset(state.config, name)) {
    const available = getPresetNames(state.config).join(", ");
    ctx.ui.notify(`Preset "${name}" not found.\n\nAvailable: ${available}`, "warning");
    return;
  }
  switchPreset(state, name);
  persistPreset(pi, name);
  ctx.ui.notify(formatSwitchResult(name, state), "info");
}

/**
 * Handle /permissions reload.
 */
function handleReload(state: PermissionState, ctx: ExtensionCommandContext): void {
  reloadConfig(state);
  ctx.ui.notify(`✓ Config reloaded. Active preset: ${state.activePreset}`, "info");
}

/**
 * Handle /permissions check.
 */
function handleCheck(ctx: ExtensionCommandContext): void {
  // Validate config by loading fresh and collecting errors
  // We do a separate validation pass here for the check command
  const config = loadConfig();
  const errors: string[] = [];

  for (const [name, preset] of Object.entries(config.presets)) {
    if (!preset.default) {
      errors.push(`Preset "${name}": missing "default" action`);
    }
    for (let i = 0; i < preset.rules.length; i++) {
      const rule = preset.rules[i];
      if (!rule.tool) errors.push(`Preset "${name}", rule ${i + 1}: missing "tool"`);
      if (!rule.action) errors.push(`Preset "${name}", rule ${i + 1}: missing "action"`);
      if (!rule.pattern) errors.push(`Preset "${name}", rule ${i + 1}: missing "pattern"`);
      if (rule.matchType === "regex" || !rule.matchType) {
        try {
          new RegExp(rule.pattern, rule.flags ?? "");
        } catch {
          errors.push(`Preset "${name}", rule ${i + 1}: invalid regex "${rule.pattern}"`);
        }
      }
    }
  }

  ctx.ui.notify(formatValidationResult(config, errors), errors.length > 0 ? "warning" : "info");
}
