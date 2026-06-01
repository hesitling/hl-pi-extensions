import { describe, test, expect } from "bun:test";
import { extractBashCommands } from "./bash-split";

describe("extractBashCommands", () => {
  // ── Basic cases ──────────────────────────────────────────────────

  test("single command unchanged", () => {
    expect(extractBashCommands("rm -rf /tmp")).toEqual(["rm -rf /tmp"]);
  });

  test("AndOr chain", () => {
    expect(extractBashCommands("git push && rm -rf /")).toEqual(["git push", "rm -rf /"]);
  });

  test("pipeline", () => {
    expect(extractBashCommands("ls -la | grep secret")).toEqual(["ls -la", "grep secret"]);
  });

  test("semicolon list", () => {
    expect(extractBashCommands("echo hello; rm -rf /")).toEqual(["echo hello", "rm -rf /"]);
  });

  test("or-chain", () => {
    expect(extractBashCommands('cat foo || echo "not found"')).toEqual(["cat foo", "echo not found"]);
  });

  // ── Quoted separators preserved ─────────────────────────────────

  test("double-quoted separator not split", () => {
    expect(extractBashCommands('echo "hello && world"')).toEqual(["echo hello && world"]);
  });

  test("single-quoted separator not split", () => {
    expect(extractBashCommands("echo 'rm -rf / ; echo done'")).toEqual(["echo rm -rf / ; echo done"]);
  });

  // ── $() command substitution ─────────────────────────────────────

  test("$() basic extraction", () => {
    expect(extractBashCommands("echo $(whoami)")).toEqual(["echo $(whoami)", "whoami"]);
  });

  test("$() with compound content", () => {
    expect(extractBashCommands("echo $(whoami && date)")).toEqual(["echo $(whoami && date)", "whoami", "date"]);
  });

  test("$() nested", () => {
    expect(extractBashCommands("echo $(echo $(whoami))")).toEqual([
      "echo $(echo $(whoami))",
      "echo $(whoami)",
      "whoami",
    ]);
  });

  test("$() multiple in one command", () => {
    expect(extractBashCommands("echo $(whoami) $(date)")).toEqual(["echo $(whoami) $(date)", "whoami", "date"]);
  });

  test("$() combined with top-level split", () => {
    expect(extractBashCommands("echo $(whoami) && rm -rf /")).toEqual(["echo $(whoami)", "whoami", "rm -rf /"]);
  });

  test("$() double-quoted", () => {
    expect(extractBashCommands('echo "$(whoami)"')).toEqual(["echo $(whoami)", "whoami"]);
  });

  // ── Backtick command substitution ────────────────────────────────

  test("backtick basic extraction", () => {
    expect(extractBashCommands("echo `whoami`")).toEqual(["echo `whoami`", "whoami"]);
  });

  test("backtick with compound content", () => {
    expect(extractBashCommands("echo `whoami && date`")).toEqual(["echo `whoami && date`", "whoami", "date"]);
  });

  test("backtick combined with top-level split", () => {
    expect(extractBashCommands("echo `whoami` || echo failed")).toEqual(["echo `whoami`", "whoami", "echo failed"]);
  });

  // ── Single-quoted substitution (false positive) ──────────────────
  // unbash strips quotes from reconstructed commands, so we can't detect
  // single-quoted $(...). This means we extract from single-quoted
  // substitutions too — an acceptable false positive.

  test("single-quoted $() still extracted (known limitation)", () => {
    expect(extractBashCommands("echo '$(whoami)'")).toEqual(["echo $(whoami)", "whoami"]);
  });

  // ── Fallback ────────────────────────────────────────────────────

  test("empty string returns original", () => {
    expect(extractBashCommands("")).toEqual([""]);
  });
});
