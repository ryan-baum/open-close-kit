import { stat } from "node:fs/promises";

type Direction = "open" | "close";
type Route = "day" | "session" | "sprint" | "milestone" | "conversation";
type Tier = "Daily" | "Cadence" | "Engagement" | "Meta/craft";

type Suggestion = {
  route: Route;
  tier: Tier;
  reason: string;
};

type TimeClue = {
  iso: string;
  hour: number;
  day_of_week: string;
  day_index: number;
  period: "morning" | "afternoon" | "evening" | "night";
};

type WorkClue = {
  path: string;
  active_run: boolean;
  active_fields: Record<string, string | number | boolean>;
};

type SprintClue = {
  path: string;
  exists: boolean;
  status: string | null;
  field: "status" | "state" | null;
  stale_or_missing: boolean;
};

type GitClue = {
  cwd: string;
  is_repo: boolean;
  dirty: boolean;
};

type Clues = {
  time?: TimeClue;
  work?: WorkClue;
  sprint?: SprintClue;
  git?: GitClue;
};

type Output = {
  direction: Direction;
  clues: Clues;
  suggestions: Suggestion[];
  generated_at: string;
};

const PROBE_TIMEOUT_MS = 2_000;
const ROUTE_TIERS: Record<Route, Tier> = {
  day: "Daily",
  session: "Daily",
  sprint: "Cadence",
  milestone: "Engagement",
  conversation: "Daily",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ACTIVE_SPRINT_STATES = new Set(["active", "open", "current", "locked"]);
const TERMINAL_RUN_STATES = new Set(["complete", "completed", "closed", "done", "abandoned", "cancelled", "canceled"]);

function parseDirection(argv: string[]): Direction {
  const index = argv.indexOf("--direction");
  const value = index >= 0 ? argv[index + 1] : undefined;

  if (value === "open" || value === "close") {
    return value;
  }

  throw new Error("missing --direction open|close");
}

function joinPath(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}

/**
 * The state dir: OPEN_CLOSE_STATE_DIR when set (a leading ~ means HOME), else ~/.claude/open-close.
 * Nothing here requires the dir to exist; every probe treats a missing file as "no clue".
 */
function stateDir(home: string): string {
  const override = process.env.OPEN_CLOSE_STATE_DIR?.trim();
  if (override) {
    return override === "~" || override.startsWith("~/") ? joinPath(home, override.slice(1)) : override;
  }
  return joinPath(home, ".claude", "open-close");
}

async function withTimeout<T>(probe: () => Promise<T | null> | T | null): Promise<T | null> {
  let timeout: Timer | undefined;

  try {
    return await Promise.race([
      Promise.resolve().then(probe),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), PROBE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function clockNow(): Date | null {
  const override = process.env.CONTEXT_CLUES_NOW;
  const date = override ? new Date(override) : new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function periodForHour(hour: number): TimeClue["period"] {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 23) return "evening";
  return "night";
}

async function probeTime(): Promise<TimeClue | null> {
  return withTimeout(() => {
    const now = clockNow();
    if (!now) return null;

    const dayIndex = now.getDay();
    return {
      iso: now.toISOString(),
      hour: now.getHours(),
      day_of_week: DAY_NAMES[dayIndex],
      day_index: dayIndex,
      period: periodForHour(now.getHours()),
    };
  });
}

function readNested(value: unknown, path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asScalar(value: unknown): string | number | boolean | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function pickFields(source: Record<string, unknown>, sessionId?: string): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean> = {};
  const keys = [
    // The documented shape is examples/work.example.json; other keys are ignored.
    "task",
    "phase",
    "progress",
    "contract",
    "milestone",
    "started",
    "updatedAt",
  ];

  if (sessionId) {
    fields.sessionId = sessionId;
  }

  for (const key of keys) {
    const scalar = asScalar(source[key]);
    if (scalar !== undefined) {
      fields[key] = scalar;
    }
  }

  return fields;
}

function modeHistoryIsOpen(source: Record<string, unknown>): boolean {
  const history = source.modeHistory;
  if (!Array.isArray(history) || history.length === 0) return false;

  const last = history[history.length - 1];
  return isRecord(last) && !("endedAt" in last);
}

function stateLooksActive(source: Record<string, unknown>): boolean {
  if (source.active === true || source.isActive === true) return true;
  if (modeHistoryIsOpen(source)) return true;

  const state = String(source.state ?? source.status ?? source.phase ?? "").toLowerCase();
  if (state && !TERMINAL_RUN_STATES.has(state)) return true;

  return false;
}

function latestSessionEntry(sessions: unknown): [string, Record<string, unknown>] | null {
  if (!isRecord(sessions)) return null;

  const entries = Object.entries(sessions).filter((entry): entry is [string, Record<string, unknown>] => {
    return isRecord(entry[1]);
  });

  if (entries.length === 0) return null;

  entries.sort((a, b) => sessionTimestamp(b[1]) - sessionTimestamp(a[1]));
  return entries[0];
}

function sessionTimestamp(session: Record<string, unknown>): number {
  for (const key of ["updatedAt", "started"]) {
    const value = session[key];
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  return 0;
}

function findActiveWork(data: unknown): { active: boolean; fields: Record<string, string | number | boolean> } {
  if (!isRecord(data)) return { active: false, fields: {} };

  const directCandidates = [
    data.activeRun,
    data.currentRun,
    data.activeSession,
    data.currentSession,
    data.active,
    data.current,
  ];

  for (const candidate of directCandidates) {
    if (isRecord(candidate) && stateLooksActive(candidate)) {
      return { active: true, fields: pickFields(candidate) };
    }
  }

  if (stateLooksActive(data) && (data.task || data.phase)) {
    return { active: true, fields: pickFields(data) };
  }

  const latestSession = latestSessionEntry(data.sessions);
  if (latestSession) {
    const [sessionId, session] = latestSession;
    if (stateLooksActive(session)) {
      return { active: true, fields: pickFields(session, sessionId) };
    }
  }

  const topLevelTask = readNested(data, ["task"]);
  if (typeof topLevelTask === "string" && topLevelTask.trim()) {
    return { active: true, fields: pickFields(data) };
  }

  return { active: false, fields: {} };
}

async function probeWork(home: string): Promise<WorkClue | null> {
  return withTimeout(async () => {
    const path = joinPath(stateDir(home), "work.json");
    if (!(await fileExists(path))) return null;

    const text = await Bun.file(path).text();
    const data = JSON.parse(text);
    const active = findActiveWork(data);

    return {
      path,
      active_run: active.active,
      active_fields: active.fields,
    };
  });
}

function parseFrontmatter(markdown: string): Record<string, string> {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;

    const key = field[1];
    const value = field[2].trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }

  return result;
}

async function probeSprint(home: string): Promise<SprintClue | null> {
  return withTimeout(async () => {
    const path = joinPath(stateDir(home), "SPRINT.md");
    const homeExists = await fileExists(home);
    if (!homeExists) return null;

    const exists = await fileExists(path);
    if (!exists) {
      return {
        path,
        exists: false,
        status: null,
        field: null,
        stale_or_missing: true,
      };
    }

    const text = await Bun.file(path).text();
    const frontmatter = parseFrontmatter(text);
    const field = frontmatter.status !== undefined ? "status" : frontmatter.state !== undefined ? "state" : null;
    const status = field ? frontmatter[field] : null;
    const normalized = status?.trim().toLowerCase() ?? "";

    return {
      path,
      exists: true,
      status,
      field,
      stale_or_missing: !normalized || !ACTIVE_SPRINT_STATES.has(normalized),
    };
  });
}

async function runGit(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string } | null> {
  let proc: Subprocess<"pipe", "pipe", "pipe"> | undefined;

  return withTimeout(async () => {
    proc = Bun.spawn(["git", ...args], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    return { exitCode, stdout };
  }).finally(() => {
    if (proc && proc.exitCode === null) {
      proc.kill();
    }
  });
}

async function probeGit(): Promise<GitClue | null> {
  return withTimeout(async () => {
    const cwd = process.cwd();
    const repo = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
    if (!repo || repo.exitCode !== 0 || repo.stdout.trim() !== "true") return null;

    const status = await runGit(["status", "--porcelain"], cwd);
    if (!status || status.exitCode !== 0) return null;

    return {
      cwd,
      is_repo: true,
      dirty: status.stdout.trim().length > 0,
    };
  });
}

function addSuggestion(
  scores: Map<Route, { score: number; reasons: string[]; order: number }>,
  route: Route,
  score: number,
  reason: string,
): void {
  const existing = scores.get(route);
  if (!existing) {
    scores.set(route, { score, reasons: [reason], order: scores.size });
    return;
  }

  existing.score += score;
  existing.reasons.push(reason);
}

function rankSuggestions(direction: Direction, clues: Clues): Suggestion[] {
  const scores = new Map<Route, { score: number; reasons: string[]; order: number }>();
  const activeRun = clues.work?.active_run === true;

  if (activeRun && direction === "close") {
    addSuggestion(scores, "conversation", 120, "active work state found; close conversation runs the learning sweep first");
  }

  if (activeRun && direction === "open") {
    addSuggestion(scores, "session", 100, "active work state found; opening a session resumes the work container");
    addSuggestion(scores, "milestone", 80, "active work state found; milestone context may need hydration");
  }

  if (!activeRun && direction === "open" && clues.time?.period === "morning") {
    addSuggestion(scores, "day", 70, "morning with no active work state; day open is likely");
  }

  if (direction === "close" && clues.time?.period === "evening") {
    addSuggestion(scores, "day", 70, "evening local time; day close is likely");
  }

  const isSprintDay = clues.time?.day_index === 0 || clues.time?.day_index === 1;
  if (isSprintDay && clues.sprint?.stale_or_missing) {
    addSuggestion(scores, "sprint", 60, "Sun/Mon with sprint state absent or not active; sprint route may fit");
  }

  return [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[1].order - b[1].order)
    .map(([route, scored]) => ({
      route,
      tier: ROUTE_TIERS[route],
      reason: scored.reasons.join("; "),
    }));
}

async function gatherClues(): Promise<Clues> {
  const clues: Clues = {};
  const home = process.env.HOME;

  if (!home || !(await fileExists(home))) {
    return clues;
  }

  const [time, work, sprint, git] = await Promise.all([probeTime(), probeWork(home), probeSprint(home), probeGit()]);

  if (time) clues.time = time;
  if (work) clues.work = work;
  if (sprint) clues.sprint = sprint;
  if (git) clues.git = git;

  return clues;
}

export async function buildContextClues(direction: Direction): Promise<Output> {
  const clues = await gatherClues();

  return {
    direction,
    clues,
    suggestions: rankSuggestions(direction, clues),
    generated_at: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  try {
    const direction = parseDirection(Bun.argv.slice(2));
    const output = await buildContextClues(direction);
    process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

if (import.meta.main) {
  await main();
}
