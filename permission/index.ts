/**
 * Permission Extension for pi
 *
 * A three-layer permission system for controlling tool calls:
 *   Layer 1: Ephemeral rules (session-bound, strongest)
 *   Layer 2: Active preset rules (persistent, switchable)
 *   Layer 3: Default action
 *
 * Config: ~/.pi/permissions.yml
 * Command: /permissions
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { PermissionState } from "./types";
import { createInitialState, findSavedPreset, switchPreset } from "./state";
import { evaluate } from "./matcher";
import { getDefaultAction } from "./state";
import { registerCommand } from "./commands";
import { formatAskPrompt } from "./ui";

export default function (pi: ExtensionAPI) {
  let state: PermissionState;

  // ── Session lifecycle ────────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    // Initialize state (loads config, compiles rules)
    state = createInitialState();

    // Restore saved preset from session entries
    const savedPreset = findSavedPreset(ctx.sessionManager);
    if (savedPreset) {
      switchPreset(state, savedPreset);
    }

    // Register the /permissions command
    registerCommand(pi, state);
  });

  // ── Tool call interception ───────────────────────────────────────────

  pi.on("tool_call", async (event, ctx) => {
    // Ensure state is initialized
    if (!state) return undefined;

    const { toolName, input } = event;
    const inputRecord = (input ?? {}) as Record<string, unknown>;

    // Evaluate against the three-layer system
    const decision = evaluate(
      toolName,
      inputRecord,
      state.compiledEphemeralRules,
      state.compiledPresetRules,
      getDefaultAction(state),
      state.activePreset,
    );

    switch (decision.action) {
      case "allow":
        // Allow silently
        return undefined;

      case "deny":
        // Block with reason
        return { block: true, reason: decision.reason };

      case "ask": {
        // Prompt user if UI available, otherwise deny
        if (!ctx.hasUI) {
          return { block: true, reason: "Blocked (non-interactive mode)" };
        }

        const prompt = formatAskPrompt(toolName, inputRecord, decision.reason, decision.layer);
        const confirmed = await ctx.ui.confirm("Permission", prompt);

        if (confirmed) {
          return undefined; // Allow
        }
        return { block: true, reason: "Blocked by user" };
      }
    }
  });
}
