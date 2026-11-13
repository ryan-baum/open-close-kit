# sprint — /open + /close
BLUF: Sprint open locks a small, dated container around Core Focus, do-NOT, and capacity; sprint close reviews that container and decides what carries forward.
DECISION BUDGET: open=2 · close=2   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
- Route tokens: `sprint`, alias `sp`.
- Optional args may include date range, Core Focus, or an existing sprint name.
- Canonical state file is `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/SPRINT.md` (below, "the state dir" means that folder); create parent dirs if absent.
- If calendar or task reads are unavailable, open from local file state plus user-provided constraints.
- If a current sprint exists and its state is not ready for normal continuation, use the restore-vs-new decision; no default.

### Steps
1. [agent][R] Start a 15-minute planning container, state the open decision budget, and keep the ceremony to the smallest viable plan before adding support fields.
2. [agent][R] Read `<state dir>/SPRINT.md`; if it is absent, report that no sprint file exists yet.
3. [agent][R] Display current fields when present: `sprint_id`, `state`, `started`, `ends`, `last_check`, `broken_reason`, `restart_count`, Core Focus, do-NOT, and date range.
4. [USER-DECISION][R] Make the single `[R]` open choice: if an interrupted sprint exists, choose exactly restore or new; if no current sprint exists, approve the minimal new packet.
5. [agent][R] If restore is chosen, write only the canonical file fields needed to resume: `state: Active`, fresh `last_check`, blank `broken_reason`, `restart_count` plus one, unchanged `sprint_id`, dates, Core Focus, do-NOT, and selected work.
6. [agent][R] If no sprint exists or new is chosen, draft a minimal sprint with a generated `sprint_id`, `state: Active`, `started`, `ends`, Core Focus, do-NOT, reward, and `sprint_immune_system: active`.
7. [agent][R] Keep the `[R]` packet to Core Focus, do-NOT, date range, and first next action; carry optional fields as blank or copied values with reasons.
8. [agent][Y] Scan the sprint period calendar and local task surfaces for blocked days, active revenue or client work, commitments, and energy constraints; summarize without expanding the plan.
9. [agent][Y] Gather candidate work openly for five minutes or less, in precedence order: (1) your task list or tracker, if reachable (in-progress and due-soon views), (2) the optional `<state dir>/work.json` active work contracts, (3) open-session entries in your project registry (for example a `PROJECTS.md`), if you keep one, (4) the workbench (your holding area for candidate work), if you keep one; include active milestones, client obligations, and maintenance only as found in those sources.
10. [agent][Y] Draft one capacity-aware packet: one Core Focus, one to three do-NOT guardrails, the date range, maintenance notes, and the single fallback focus for low-capacity days.
11. [USER-DECISION][Y] Accept the packet, choose the alternate packet, or edit one field; this is the second and final open decision.
12. [agent][Y] Add a `mid_sprint_check_in` line at the date midpoint with the two-minute check: Core Focus still true, scope still humane, displacing work named.
13. [agent][G] Add support fields only after the load-bearing fields are locked: pre-mortem (how this sprint could fail), inspiration and guardrails (what keeps it motivating, what keeps it in bounds), blocks (known obstacles), space and grace (planned slack), and reward details.
14. [agent][G] Map the selected work by energy fit: deep-focus candidates, admin-friendly candidates, and optional pull-from-later candidates.
15. [agent][G] Record why the sprint matters in one sentence and which temptation the do-NOT field protects against.
16. [agent][R] Write the canonical `SPRINT.md` atomically as file-primary state, with YAML frontmatter `sprint_id`, `state: Active`, `started`, `ends`, `last_check: <now>`, `restart_count: 0`, `broken_reason:` (blank), and Core Focus, do-NOT and selected work in the body; do not keep a second active sprint state file.
17. [agent][R] Present a compact open receipt: sprint ID, date range, Core Focus, do-NOT, midpoint check date, and first next action.
18. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
- [agent][R] Router resolves `sp` before route match and loads this pack from `~/.claude/skills/open/References/sprint.md`.
- [agent][R] The `close` skill loads the same canonical pack by absolute path; the bridge lives here once.
- [agent][R] Context clues come from `~/.claude/skills/open/Tools/context-clues.ts`; sprint ranking may use day-of-week and `SPRINT.md` state, and script failure falls back to a flat menu.
- [agent][R] State-machine shape: restore keeps identity and selected work; new generates a fresh ID and counter.
- [agent][Y] Provide a read-only status display for field visibility without mutation.
- [agent][Y] The day route reads the same `SPRINT.md` for its sprint health check, so keep the canonical path stable.
- [agent][G] If your setup runs SessionStart (or SessionEnd) hooks, they are complements: this pack does not duplicate them; it owns sprint state only, not general session learning.

## CLOSE
### Preconditions
- Canonical state file is `<state dir>/SPRINT.md`.
- If the canonical file is absent, close produces a short "no active sprint file found" receipt and a next-open seed rather than inventing history.
- Close reviews against locked criteria: Core Focus, do-NOT, dates, and any selected work forecast.
- Close may run at the sprint endpoint or as an early retro when reality has displaced the plan.

### Steps
1. [agent][R] Read canonical `SPRINT.md`, then display `sprint_id`, `state`, `started`, `ends`, `last_check`, `broken_reason`, `restart_count`, Core Focus, do-NOT, and date range.
2. [agent][R] Compute days running, days left or elapsed since end, and days since `last_check`; keep this display read-only until the close write step.
3. [agent][R] Review the locked criteria: Core Focus moved, do-NOT held or bent, dates matched reality, and selected work forecast versus actual pull.
4. [agent][R] Run the five-minute retro spine: GATHER what moved, SENSE what had energy or friction, DECIDE what carries, drops, or gets scheduled.
5. [USER-DECISION][R] Approve one carryover packet: carry into next sprint, move to later, drop, or schedule outside the sprint.
6. [agent][R] Write the canonical close record to `SPRINT.md`: `state: Closed`, `closed_at`, retro summary, carryover packet, next sprint seed, and `last_check`.
7. [agent][R] Present a close receipt with Core Focus result, carryover decision, next-open seed, and any missing evidence explicitly named.
8. [agent][Y] Review items that remained in the workbench for two or more sprint cycles; propose move-to-later or drop as part of the carryover packet, not as an extra decision.
9. [agent][Y] Check whether midpoint adjustment happened; if absent, record that as a process finding without adding blame language.
10. [USER-DECISION][Y] Choose one next-sprint seed only if the user wants to pre-seed the next sprint now; otherwise leave the seed as agent-proposed.
11. [agent][G] Add a velocity-honesty note: what work size, energy pattern, or calendar constraint should inform the next sprint.
12. [agent][G] Add a "surprise harvested" note for any work that displaced the plan or revealed a better direction.
13. [agent][R] Run the close catechism base and route extensions permitted by the selected tier, presenting findings and proposals.
14. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: run `~/.claude/skills/open/References/_catechism-base.md`.

<!-- route-catechism-extension:start -->
1. [agent][R] **Sprint criteria audit** -- Compare the close evidence against Core Focus, do-NOT, and date range; present moved / unmoved / intentionally parked as findings.
2. [agent][R] **Carryover integrity** -- Verify every carried item has an explicit destination: next sprint seed, later list, scheduled work, or drop; present unknown destinations as findings.
3. [agent][Y] **Midpoint check learning** -- Report whether the midpoint check changed scope, named displacing work, or stayed unused; stage one process learning if useful.
4. [agent][G] **Capacity calibration** -- Extract one planning heuristic for the next sprint from calendar load, energy pattern, task size, or client obligations.
<!-- route-catechism-extension:end -->

### Wiring
- [agent][R] The `close` skill loads this pack from `~/.claude/skills/open/References/sprint.md`; there is no separate close copy.
- [agent][R] Reuse the read-only field display from open before any close write.
- [agent][R] Reuse the restore-vs-new semantics from open only when close discovers the current sprint should be replaced rather than closed normally.
- [agent][Y] Learning routing lives in the base catechism: use the Learning Router in `_catechism-base.md`.
- [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This close still performs the deliberate sprint review, carryover decision, and file bridge write.
- [agent][G] No auto-commit promise is made here; if commit proposals appear, they come from the catechism base after inspecting the worktree.

## BRIDGE
- Canonical file: `<state dir>/SPRINT.md`.
- Close writes: state, `closed_at`, retro summary, carryover packet, next sprint seed, `last_check`, and any missing-evidence notes.
- Open reads: current state, prior retro summary, carryover packet, next sprint seed, restart counter, Core Focus, do-NOT, dates, and midpoint check date.
- Conflict rule: canonical file wins over any external mirror.
- External mirror: any sprint mirror in an external tool remains staged and gated; no bridge data depends on a live external write.
- Mid-sprint bridge: open writes `mid_sprint_check_in`; day/week routines may surface it, but sprint state remains in the canonical file.

## GATES
- "Decision budget: `/open sprint` open=2 and `/close sprint` close=2; menu navigation is excluded."
- "`[R]` path: at most one user decision per direction."
- "File primary: `<state dir>/SPRINT.md` wins; any external sprint mirror is staged."
- "External mirror: describe the proposal and report that no external write occurred from this pack."
- "Load-bearing fields: Core Focus, do-NOT, and dates are locked before support fields."
- "Carryover gate: carried work receives an explicit destination; it is not auto-rolled."
- "Standards gate: lighter tiers contract ceremony scope while standards remain intact."
- "Restore-vs-new gate: when invoked, present exactly those two choices and no default."

## GOTCHAS
- Restore-vs-new is a single decision with exactly two choices; adding a third option or choosing a default violates the state machine.
- Status display is read-only until the explicit open or close write step; field inspection alone must not mutate `SPRINT.md`.
- The sprint protocol is intentionally timeboxed; extending planning before Core Focus, do-NOT, and dates are locked turns support fields into activation cost.
- A sprint mirror in an external tool is derived; a mismatch between it and file state is reported as mirror drift, not resolved by an external write from this pack.
- The two-cycle workbench review is a triage prompt, not a moral judgment; proposals must route to next sprint seed, later, scheduled work, or drop.
- **Interrupted is a state, not a failure.** When the user stops a sprint before its end (illness, a client fire, a changed priority), write `state: Interrupted` and a one-line `broken_reason` to `SPRINT.md`; the next `/open sprint` then offers restore or new (open step 4).
