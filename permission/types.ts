/** Action to take when a rule matches */
export type RuleAction = "allow" | "deny" | "ask";

/** Pattern matching engine */
export type MatchType = "regex" | "glob";

/** Which layer a decision came from */
export type DecisionLayer = "ephemeral" | "preset" | "default";

/** A single permission rule (as defined in config or added ephemerally) */
export interface Rule {
  /** Tool name(s) to match */
  tool: string | string[];
  /** Input parameter to match against (auto-detected for built-in tools if omitted) */
  param?: string;
  /** Pattern string (regex or glob) */
  pattern: string;
  /** Pattern engine: "regex" (default) or "glob" */
  matchType?: MatchType;
  /** Regex flags (e.g., "i" for case-insensitive) */
  flags?: string;
  /** Decision when rule matches */
  action: RuleAction;
  /** Explanation shown to user or LLM */
  reason?: string;
}

/** A named preset containing rules and a default action */
export interface Preset {
  /** Fallback action when no rule matches */
  default: RuleAction;
  /** Ordered list of rules */
  rules: Rule[];
}

/** Top-level config file structure */
export interface Config {
  /** Preset to use on startup (optional) */
  active?: string;
  /** Named presets */
  presets: Record<string, Preset>;
}

/** An ephemeral rule with a session-scoped id */
export interface EphemeralRule extends Rule {
  /** Auto-incremented id, unique within the session */
  id: number;
}

/** A rule with its pattern pre-compiled for fast matching */
export interface CompiledRule {
  /** Original rule data */
  rule: Rule | EphemeralRule;
  /** Compiled regex (if matchType is "regex") */
  regex?: RegExp;
  /** Compiled glob matcher (if matchType is "glob") */
  globMatcher?: (value: string) => boolean;
  /** Resolved parameter name (after auto-detection) */
  resolvedParam: string;
}

/** Result of evaluating a tool call against the permission rules */
export interface Decision {
  /** Action to take */
  action: RuleAction;
  /** Reason message */
  reason: string;
  /** Which layer produced this decision */
  layer: DecisionLayer;
}

/** Internal state for the permission extension */
export interface PermissionState {
  /** Parsed config from disk */
  config: Config;
  /** Currently active preset name */
  activePreset: string;
  /** Session-bound ephemeral rules */
  ephemeralRules: EphemeralRule[];
  /** Next auto-increment id for ephemeral rules */
  nextEphemeralId: number;
  /** Compiled rules for the active preset */
  compiledPresetRules: CompiledRule[];
  /** Compiled ephemeral rules */
  compiledEphemeralRules: CompiledRule[];
}
