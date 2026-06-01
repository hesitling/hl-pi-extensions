import { describe, test, expect } from "bun:test";
import type { Rule } from "./types";
import { compileRule, matchRule, compileRules, evaluate } from "./matcher";

describe("patternless rules", () => {
  test("5.1 patternless rule compiles successfully", () => {
    const rule: Rule = {
      tool: "read",
      action: "allow",
    };
    const compiled = compileRule(rule);
    expect(compiled).not.toBeNull();
    expect(compiled!.rule).toBe(rule);
    expect(compiled!.regex).toBeUndefined();
    expect(compiled!.globMatcher).toBeUndefined();
  });

  test("5.2 patternless rule matches any input for that tool", () => {
    const rule: Rule = {
      tool: "read",
      action: "allow",
    };
    const compiled = compileRule(rule)!;

    expect(matchRule(compiled, "read", { path: "/any/path" })).toBe(true);
    expect(matchRule(compiled, "read", { path: "/etc/passwd" })).toBe(true);
    expect(matchRule(compiled, "read", { path: "" })).toBe(true);
    expect(matchRule(compiled, "read", {})).toBe(true); // no param at all
  });

  test("5.2 patternless rule does not match other tools", () => {
    const rule: Rule = {
      tool: "read",
      action: "allow",
    };
    const compiled = compileRule(rule)!;

    expect(matchRule(compiled, "write", { path: "/any/path" })).toBe(false);
    expect(matchRule(compiled, "bash", { command: "ls" })).toBe(false);
  });

  test("5.3 patternless rule with tool array matches all specified tools", () => {
    const rule: Rule = {
      tool: ["read", "write", "edit"],
      action: "allow",
    };
    const compiled = compileRule(rule)!;

    expect(matchRule(compiled, "read", { path: "/foo" })).toBe(true);
    expect(matchRule(compiled, "write", { path: "/foo" })).toBe(true);
    expect(matchRule(compiled, "edit", { path: "/foo" })).toBe(true);
    expect(matchRule(compiled, "bash", { command: "ls" })).toBe(false);
  });

  test("5.4 patternless rule evaluated before patterned rules (first-match-wins)", () => {
    const patternlessRule: Rule = {
      tool: "write",
      action: "allow",
    };
    const patternedRule: Rule = {
      tool: "write",
      pattern: "g:**/.env*",
      action: "deny",
    };

    const rules = compileRules([patternlessRule, patternedRule]);
    expect(rules.length).toBe(2);

    // First rule (patternless) matches first → allow
    const decision = evaluate(
      "write",
      { path: ".env" },
      [],        // no ephemeral rules
      rules,     // preset rules
      "ask",     // default
      "test",    // preset name
    );
    expect(decision.action).toBe("allow");
  });

  test("5.5 patternless rule works with bash command splitting", () => {
    const rule: Rule = {
      tool: "bash",
      action: "allow",
    };
    const compiled = compileRule(rule)!;

    // Patternless bash rule matches any command
    expect(matchRule(compiled, "bash", { command: "ls -la" })).toBe(true);
    expect(matchRule(compiled, "bash", { command: "rm -rf /" })).toBe(true);

    // Evaluate compound command - should all be allowed
    const decision = evaluate(
      "bash",
      { command: "git status && rm -rf /tmp" },
      [],
      [compiled],
      "ask",
      "test",
    );
    expect(decision.action).toBe("allow");
  });

  test("patternless rule with reason preserves reason", () => {
    const rule: Rule = {
      tool: "read",
      action: "allow",
      reason: "Reads are always safe",
    };
    const compiled = compileRule(rule)!;

    expect(matchRule(compiled, "read", { path: "/any" })).toBe(true);
  });

  test("patterned rules still work alongside patternless", () => {
    const patternless: Rule = { tool: "read", action: "allow" };
    const patterned: Rule = { tool: "write", pattern: "g:/tmp/**", action: "allow" };

    const compiled = compileRules([patternless, patterned]);
    expect(compiled.length).toBe(2);

    // Patternless read matches anything
    expect(matchRule(compiled[0], "read", { path: "/etc/passwd" })).toBe(true);

    // Patterned write only matches /tmp/**
    expect(matchRule(compiled[1], "write", { path: "/tmp/foo" })).toBe(true);
    expect(matchRule(compiled[1], "write", { path: "/etc/passwd" })).toBe(false);
  });
});
