---
name: open
description: USE WHEN the user wants to begin a work container or ceremony: "start my day", "open a milestone", "plan a sprint", "new client", or start a session/week/project/research/brief/skill/experiment/direction/goal/conversation. NOT FOR opening files/URLs/apps, git operations, or "open a PR".
---

<!-- NAMING (do not "fix"): the skill name is lowercase `open` and must MATCH commands/open.md, so the / picker shows one /open entry rather than two (check this on your install: if you see two, delete commands/open.md). Sibling: `close`. -->

# /open Router

Bottom Line Up Front (BLUF): Route `/open` requests to one canonical pack under `~/.claude/skills/open/References/`. This router owns route resolution, help, the bare menu, and guards; packs own ceremony content.

DECISION BUDGET: open=0 / close=0 for router work; menu navigation excluded; the [R] path has at most one non-menu user decision.

COUNTERPART: the `close` skill uses the same route tokens and loads the `## CLOSE` section from each pack at `~/.claude/skills/open/References/<route>.md`.

Terminology: NMIT = Next Most Important Thing. A **run** is one piece of substantive work with its own folder, `${OPEN_CLOSE_WORK_DIR:-~/work}/<YYYYMMDD-HHMMSS_slug>/` (a milestone's slug is `<project>--<milestone>`; a project's home is undated, `~/work/<project-slug>/`, or its own repository), holding a **work contract** (`CONTRACT.md`: goal, criteria, phase, decisions, changelog). The **state dir** is `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}`; bridge files between a close and the next open live there.

## Route Table

| token | aliases | pack path | one-line semantics |
|---|---|---|---|
| day | d, today | `~/.claude/skills/open/References/day.md` | Start the day: agent review, energy check-in, pickup of yesterday's bridge, sprint check, dated commitments, NMIT, and an offer menu. |
| session | s, block, work | `~/.claude/skills/open/References/session.md` | Start a work block from a pre-planned next move, choose NMIT, set focus guardrails, and create a parking lot. |
| week | w | `~/.claude/skills/open/References/week.md` | Preview the week with calendar sweep, sprint alignment, glass-ball scan, and week intentions. |
| sprint | sp | `~/.claude/skills/open/References/sprint.md` | Gather backlog, select capacity-aware scope, lock Core Focus/do-NOT/dates, and write `SPRINT.md`. |
| milestone | m, ms | `~/.claude/skills/open/References/milestone.md` | Classify the milestone, create its run folder, and write its work contract. |
| project | p, proj | `~/.claude/skills/open/References/project.md` | Open project altitude: work-contract home, project-registry stub, goal linkage. |
| client | c | `~/.claude/skills/open/References/client.md` | Open a client container: the first open builds organisation, people and client-project surfaces; later opens use the existing frame. |
| deal | dl | `~/.claude/skills/open/References/deal.md` | Open the post-discovery sales motion: a written agreement on objectives, measures and value, a deal recap, a stakeholder map when the committee is larger than one, a deal state file, and the proposal by name. |
| research-project | rp, research | `~/.claude/skills/open/References/research-project.md` | Start research with a prior-art scan plan, a sequential strategy, and argument-graph placement. |
| brief | b | `~/.claude/skills/open/References/brief.md` | Start typed intake with an evidence manifest and a claim check before generation. |
| conversation | conv, chat | `~/.claude/skills/open/References/conversation.md` | Minimal open: recall context and capture intent. |
| skill | sk | `~/.claude/skills/open/References/skill.md` | Routing-only glue: your skill-authoring workflow's scaffold and validate, then its with-skill against baseline test. |
| experiment | ex, exp | `~/.claude/skills/open/References/experiment.md` | Stage hypothesis, prediction, and kill criteria into the argument graph. |
| direction | dir | `~/.claude/skills/open/References/direction.md` | Open the seasonal direction loop with review, direction choice, and 1-3 exploration probes. |
| goal | g, goals | `~/.claude/skills/open/References/goal.md` | Open a goal: resolve it in your goals file, census its child projects, check its done-condition and capacity, choose status and the next project. |

## Router Procedure

1. [agent][R] Parse `/open <route|alias> [args...]`; route tokens and aliases are case-insensitive, and aliases resolve before exact route tokens.
2. [agent][R] If invoked as `/open help`, show the Route Table and grammar, then end router work.
3. [agent][R] If invoked bare as `/open`, run the Bare Invocation Menu.
4. [agent][R] If the first token maps to one route, load only `~/.claude/skills/open/References/<route>.md` and pass remaining args to that pack.
5. [agent][R] If the token is unknown, run Unknown Token Handling; closest-match suggestion is required and silent fallback is forbidden.
6. [agent][R] Keep this router thin: never copy pack content into the router response.

## Bare Invocation Menu

1. [agent][R] Before asking, run `bun ~/.claude/skills/open/Tools/context-clues.ts --direction open`; it may read local time, day-of-week, `<state dir>/work.json`, `<state dir>/SPRINT.md`, and git dirty state.
2. [agent][R] If the clue script errors, is missing, `bun` is not installed, or it returns no useful ranking, fail open to the fixed grouped menu below, with no preselected option.
3. [USER-DECISION][R] AskUserQuestion Q1: "What kind of thing are you opening?" with single-select tier options, at most four:
   - Daily: `day`, `session`, `conversation`
   - Cadence: `week`, `sprint`, `direction`, `goal`
   - Engagement: `deal`, `client`, `milestone`, `project`
   - Meta/craft: `research-project`, `skill`, `experiment`, `brief`
4. [agent][R] If clues rank a route, move that route's tier to option 1 and suffix the label with "(Recommended)".
5. [USER-DECISION][R] AskUserQuestion Q2: choose the route within the selected tier, single-select only, at most four options.
6. [agent][R] If clues rank a route in the selected tier, move it to option 1 and suffix the label with "(Recommended)".
7. [agent][R] Load the chosen pack from `~/.claude/skills/open/References/<route>.md` and pass any original args through unchanged.

## Known Redirects

These tokens are known-but-rejected route names. They NEVER fall to fuzzy matching: state the one-line reminder, then run the covering route (or stop, for reminder-only rows).

| token | behavior |
|---|---|
| content | remind "content is covered by brief for now; may become its own route later" then run brief |
| quarter | remind "quarter folds into the seasonal direction loop" then run direction |
| practice | remind "practices season-shift via direction; they never open/close (a practice has a liveness, not a done state)" then run direction |
| area | remind "practices season-shift via direction; they never open/close (a practice has a liveness, not a done state)" then run direction |
| reading, learning | reminder only, no route: "reading and learning have no open/close; they surface through NMIT" |
| break, rest | reminder only: "break protocol lives inside session close (park ritual, a break of about 20% of the time worked) and day tiers" |

## Unknown Token Handling

1. [agent][R] Check Known Redirects first; if there is no match, compare the unknown token against every route token and alias after lowercasing and punctuation cleanup.
2. [agent][R] If one closest match is dominant, show: `Unknown /open route "<input>". Did you mean /open <route>?` and wait for explicit confirmation before loading a pack.
3. [USER-DECISION][R] If two or more plausible matches tie, ask one AskUserQuestion with those routes; do not choose on the user's behalf.
4. [agent][R] If no plausible match exists, show `/open help` style route table guidance and end router work.

## Guards

1. [agent][R] Altitude-cadence guard: an `/open` at one rung links upward for context but does not re-litigate higher-rung decisions off-rhythm; higher rungs reconcile at least 3x slower than the rung below.
2. [agent][R] External mirrors are always gated. If you mirror runs or tasks into another tool (an outliner, a task app), the router performs no live write to it; packs describe such a motion and wait for an explicit go. Files in the state dir and the run folder are the source of truth.
3. [agent][R] Lighter tiers trim ceremony scope, never standards: `[R]` runs fewer steps, not sloppier ones.
4. [agent][R] Open motions hydrate existing context before expanding scope.
5. [agent][R] Use offers, menus, and choice framing for the user.
6. [agent][R] One work contract per run: when an open route creates or resumes a run folder for substantive work (unsure counts as substantive), that folder's `CONTRACT.md` is the work contract for the rest of the work; creating a second contract for the same work is forbidden.

## Cross-Reference

1. [agent][R] Use the `close` skill for close motions; it shares this route set and the same pack files.
2. [agent][R] If the user asks to close while in the `open` skill, name the closest `close` route rather than running an open pack.

## Not For

1. [agent][R] Opening files, URLs, apps, editor tabs, browser tabs, or local paths.
2. [agent][R] Git operations, including opening pull requests.
3. [agent][R] Live writes to an external mirror, or schema edits in one.

## Gotchas

1. [agent][R] The shared clue script is `~/.claude/skills/open/Tools/context-clues.ts`; the `close` skill calls the same script with `--direction close`, so keep routing assumptions compatible.
2. [agent][R] Packs are owned by `~/.claude/skills/open/References/`; the `close` skill reads those same files rather than maintaining a second pack copy.
3. [agent][R] Natural-language "open" can mean file/URL/app open; those are outside this skill and should continue through the normal tool path.
4. [agent][R] The route table is operational here; packs can name their own route but should not rebuild the whole table.
5. [agent][R] Missing required pack args are pack-level questions: ask one AskUserQuestion there and keep the router from guessing.
