import { describe, test, expect } from "bun:test";
import { extractBashCommandsArray } from "./bash-split";

// Helper: materialize generator to array
const extract = extractBashCommandsArray;

describe("extractBashCommands", () => {
  // ── Basic cases ──────────────────────────────────────────────────

  test("single command unchanged", () => {
    expect(extract("rm -rf /tmp")).toEqual(["rm -rf /tmp"]);
  });

  test("AndOr chain", () => {
    expect(extract("git push && rm -rf /")).toEqual(["git push", "rm -rf /"]);
  });

  test("pipeline", () => {
    expect(extract("ls -la | grep secret")).toEqual(["ls -la", "grep secret"]);
  });

  test("semicolon list", () => {
    expect(extract("echo hello; rm -rf /")).toEqual(["echo hello", "rm -rf /"]);
  });

  test("or-chain", () => {
    expect(extract('cat foo || echo "not found"')).toEqual(["cat foo", "echo not found"]);
  });

  // ── Quoted separators preserved ─────────────────────────────────

  test("double-quoted separator not split", () => {
    expect(extract('echo "hello && world"')).toEqual(["echo hello && world"]);
  });

  test("single-quoted separator not split", () => {
    expect(extract("echo 'rm -rf / ; echo done'")).toEqual(["echo rm -rf / ; echo done"]);
  });

  // ── $() command substitution ─────────────────────────────────────

  test("$() basic extraction", () => {
    expect(extract("echo $(whoami)")).toEqual(["echo $(whoami)", "whoami"]);
  });

  test("$() with compound content", () => {
    expect(extract("echo $(whoami && date)")).toEqual(["echo $(whoami && date)", "whoami", "date"]);
  });

  test("$() nested", () => {
    expect(extract("echo $(echo $(whoami))")).toEqual([
      "echo $(echo $(whoami))",
      "echo $(whoami)",
      "whoami",
    ]);
  });

  test("$() multiple in one command", () => {
    expect(extract("echo $(whoami) $(date)")).toEqual(["echo $(whoami) $(date)", "whoami", "date"]);
  });

  test("$() combined with top-level split", () => {
    expect(extract("echo $(whoami) && rm -rf /")).toEqual(["echo $(whoami)", "whoami", "rm -rf /"]);
  });

  test("$() double-quoted", () => {
    expect(extract('echo "$(whoami)"')).toEqual(["echo $(whoami)", "whoami"]);
  });

  // ── Backtick command substitution ────────────────────────────────

  test("backtick basic extraction", () => {
    expect(extract("echo `whoami`")).toEqual(["echo `whoami`", "whoami"]);
  });

  test("backtick with compound content", () => {
    expect(extract("echo `whoami && date`")).toEqual(["echo `whoami && date`", "whoami", "date"]);
  });

  test("backtick combined with top-level split", () => {
    expect(extract("echo `whoami` || echo failed")).toEqual(["echo `whoami`", "whoami", "echo failed"]);
  });

  // ── Single-quoted substitution ───────────────────────────────
  // With AST-based extraction, SingleQuoted nodes are correctly skipped.
  // The shell doesn't expand $() inside single quotes, so we don't either.

  test("single-quoted $() correctly skipped", () => {
    expect(extract("echo '$(whoami)'")).toEqual(["echo $(whoami)"]);
  });

  test("single-quoted backtick correctly skipped", () => {
    expect(extract("echo '`whoami`'")).toEqual(["echo `whoami`"]);
  });

  test("single-quoted substitution with surrounding text", () => {
    expect(extract("echo 'hello $(whoami) world'")).toEqual(["echo hello $(whoami) world"]);
  });

  test("single-quoted $() does not hide unquoted $()", () => {
    expect(extract("echo '$(date)' $(whoami)")).toEqual([
      "echo $(date) $(whoami)",
      "whoami",
    ]);
  });

  // ── Fallback ────────────────────────────────────────────────────

  test("empty string returns original", () => {
    expect(extract("")).toEqual([""]);
  });
});
