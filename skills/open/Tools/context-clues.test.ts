import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const scriptPath = join(import.meta.dir, "context-clues.ts");
const bunPath = process.execPath;
let tempRoots: string[] = [];

beforeEach(() => {
  tempRoots = [];
});

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), "context-clues-"));
  tempRoots.push(root);
  return root;
}

// The default state dir is ~/.claude/open-close; OPEN_CLOSE_STATE_DIR overrides it.
function defaultStateDir(home: string): string {
  return join(home, ".claude", "open-close");
}

function makeHome(): string {
  const home = tempDir();
  mkdirSync(defaultStateDir(home), { recursive: true });
  return home;
}

function writeState(stateDir: string, work: unknown, sprintFrontmatter: string): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "work.json"), JSON.stringify(work));
  writeFileSync(join(stateDir, "SPRINT.md"), `---\n${sprintFrontmatter}\n---\n\n# Sprint\n`);
}

async function runScript(
  direction: "open" | "close",
  home: string,
  cwd?: string,
  extraEnv: Record<string, string | undefined> = {},
) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    HOME: home,
    CONTEXT_CLUES_NOW: "2026-07-06T09:00:00-04:00",
    ...extraEnv,
  };
  if (!("OPEN_CLOSE_STATE_DIR" in extraEnv)) delete env.OPEN_CLOSE_STATE_DIR;
  const proc = Bun.spawn([bunPath, scriptPath, "--direction", direction], {
    cwd: cwd ?? tempDir(),
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  return {
    exitCode,
    stdout,
    stderr,
    json: stdout.trim() ? JSON.parse(stdout) : null,
  };
}

describe("context clues CLI", () => {
  test("open fixture ranks session before milestone for active work state", async () => {
    const home = makeHome();
    writeState(
      defaultStateDir(home),
      {
        activeRun: {
          task: "Author context clues",
          phase: "execute",
          started: "2026-07-06T12:00:00.000Z",
        },
      },
      "state: Active",
    );

    const result = await runScript("open", home);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.json.direction).toBe("open");
    expect(result.json.suggestions[0].route).toBe("session");
    expect(result.json.suggestions[1].route).toBe("milestone");
  });

  test("close fixture ranks conversation first for active work state", async () => {
    const home = makeHome();
    writeState(
      defaultStateDir(home),
      {
        sessions: {
          "20260706-090000_context-clues": {
            task: "Author context clues",
            phase: "execute",
            modeHistory: [{ mode: "native", startedAt: 1783342800000 }],
          },
        },
      },
      "status: Active",
    );

    const result = await runScript("close", home);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.json.direction).toBe("close");
    expect(result.json.suggestions[0].route).toBe("conversation");
  });

  test("open exits zero with empty suggestions when HOME is unusable", async () => {
    const parent = tempDir();
    const missingHome = join(parent, "missing-home");

    const result = await runScript("open", missingHome, parent);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.json.direction).toBe("open");
    expect(result.json.clues).toEqual({});
    expect(result.json.suggestions).toEqual([]);
  });

  test("close exits zero with empty suggestions when HOME is unusable", async () => {
    const parent = tempDir();
    const missingHome = join(parent, "missing-home");

    const result = await runScript("close", missingHome, parent);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.json.direction).toBe("close");
    expect(result.json.clues).toEqual({});
    expect(result.json.suggestions).toEqual([]);
  });

  test("OPEN_CLOSE_STATE_DIR overrides the default state dir", async () => {
    const home = makeHome();
    const custom = join(tempDir(), "my-state");
    writeState(custom, { activeRun: { task: "Elsewhere", phase: "execute" } }, "status: Active");

    const result = await runScript("close", home, undefined, { OPEN_CLOSE_STATE_DIR: custom });

    expect(result.exitCode).toBe(0);
    expect(result.json.clues.work.path).toBe(join(custom, "work.json"));
    expect(result.json.suggestions[0].route).toBe("conversation");
  });

  test("a state dir that does not exist means no active run, never an error", async () => {
    const home = makeHome();
    const result = await runScript("close", home, undefined, { OPEN_CLOSE_STATE_DIR: join(tempDir(), "absent") });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.json.clues.work).toBeUndefined();
  });

  test("conversation is ranked in the Daily tier, as the routers group it", async () => {
    const home = makeHome();
    writeState(defaultStateDir(home), { activeRun: { task: "x", phase: "execute" } }, "status: Active");

    const result = await runScript("close", home);

    expect(result.json.suggestions[0]).toMatchObject({ route: "conversation", tier: "Daily" });
  });

  test("a malformed work.json fails open: exit 0, no work clue", async () => {
    const home = makeHome();
    writeFileSync(join(defaultStateDir(home), "work.json"), "{ not json");

    const result = await runScript("open", home);

    expect(result.exitCode).toBe(0);
    expect(result.json.clues.work).toBeUndefined();
  });

  test("the documented work.json shape (examples/work.example.json) is read: activeRun with task, phase and contract", async () => {
    const home = makeHome();
    writeState(
      defaultStateDir(home),
      { activeRun: { task: "Trial onboarding emails", phase: "execute", contract: "~/work/x/CONTRACT.md" } },
      "status: Active",
    );

    const result = await runScript("close", home);

    expect(result.json.clues.work.active_run).toBe(true);
    expect(result.json.clues.work.active_fields).toEqual({
      task: "Trial onboarding emails",
      phase: "execute",
      contract: "~/work/x/CONTRACT.md",
    });
  });
});
