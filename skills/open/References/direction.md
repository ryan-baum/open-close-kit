# direction — /open + /close
BLUF: Seasonal frequency: direction open reviews the prior season and sets the next directional frame without re-litigating lower-rung execution.
Direction close locks the frame, chooses 1-3 affordable-loss probes, and writes the prediction that the next season can compare against.
DECISION BUDGET: open=2 · close=1   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open direction` or `/open dir`; aliases resolve in the router before this pack loads.
2. [agent][R] Direction is a seasonal route; use it for season-scale review and orientation, not daily, weekly, sprint, or project execution.
3. [agent][R] Read `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/direction.md` first when present; absence means start from visible season evidence.
4. [agent][R] Read active goal, project, sprint, and recent close receipts only enough to review season signal and avoid expanding the surface.
5. [agent][R] The Direction Loop has six seasonal steps: generate-from-means, affordable-loss probes, written prediction, run as project, harvest two axes, kill/keep/promote.
6. [agent][R] Exploration budget is always 1-3 probes for the season; zero probes is not a valid direction open.
7. [agent][R] Altitude cadence guard applies: this rung reconciles at least 3x slower than the rung below unless a glass-ball urgency is visible.
8. [agent][R] If the last direction close is too recent for cadence, open shifts to a check-in receipt and offers `week`, `sprint`, or `project` as the right rung.
9. [agent][Y] If multiple life/work domains compete, the agent proposes up to three frames and spends one user decision to choose or edit the frame.
10. [agent][G] If evidence is thin, state the missing evidence and open with a provisional frame plus a probe that creates contact with reality.

### Steps
1. [agent][R] State the open decision budget and load the direction bridge before any new directional framing.
2. [agent][R] Summarize the current season evidence (goal census from the state dir's `goal-next*.md` when present): active goals, projects, shipped artifacts, stalled surfaces, recurring energy signal, and ignored opportunities.
3. [agent][R] Separate altitude levels: goal, project, milestone, task, sprint, week, day; keep this route at seasonal direction altitude.
4. [agent][R] Apply the cadence guard and report whether a full direction open is in-rhythm, urgency-bypassed, or better routed downward.
5. [agent][R] Generate-from-means: list existing assets, relationships, capabilities, constraints, and curiosity vectors already present.
6. [agent][R] Draft one seasonal direction frame with desired state, not-to-expand boundary, and why it fits the evidence.
7. [USER-DECISION][R] Choose the seasonal frame: accept the draft, edit one field, or route downward to a closer rung.
8. [agent][R] Reserve a nonzero exploration lane and propose 1-3 affordable-loss probes that create contact with reality.
9. [agent][R] Write the open receipt to the state dir's `direction.md` with frame, cadence status, probe budget, candidate probes, evidence gaps, and next review trigger.
10. [agent][R] Keep the `[R]` path complete after the receipt; the chosen frame has a trusted home and the next step is visible.
11. [agent][Y] Review prospective goals marked "maybe later" (parked, not dropped) and active project surfaces for candidates that match the frame without adding bulk.
12. [agent][Y] Convert probes into project-shaped or hobby-shaped candidates with affordable loss, who owns the test, evidence source, and review date.
13. [USER-DECISION][Y] Choose the probe budget and probe set: one, two, or three probes; this is the second and final open decision.
14. [agent][Y] Draft the written prediction for close to lock later: expected world-signal, expected personal signal, and comparison date.
15. [agent][Y] Add anti-windup notes when lower-rung execution is saturated: what will pause, shrink, or wait so the direction does not stack pressure.
16. [agent][G] Compare the frame against the prior direction, current goals, active projects, and recurring evidence from closes.
17. [agent][G] Add one explicit non-goal: a tempting direction that stays out this season.
18. [agent][G] Identify the earliest signal that would cause a season check-in without reopening the whole direction.
19. [agent][G] Report the open outcome as frame, cadence status, probe budget, candidate probes, draft prediction, anti-windup note, and bridge path.
20. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
1. [agent][R] Router owns alias `dir`, bare-menu placement under Cadence, and closest-match suggestions.
2. [agent][R] The `open` skill loads this pack from `~/.claude/skills/open/References/direction.md`; the `close` skill loads the same canonical file by absolute path.
3. [agent][R] Context clues come from `~/.claude/skills/open/Tools/context-clues.ts`; script failure falls back to the fixed grouped menu.
4. [agent][R] This pack carries the Direction Loop protocol itself (Preconditions item 5); no new schema is introduced.
5. [agent][R] Open may route probe execution to `project`, `research-project`, `experiment`, or `brief`; it does not run those routes inside direction open.
6. [agent][Y] If your setup runs SessionStart or SessionEnd hooks, they are complements: this pack does not duplicate them. This pack owns seasonal frame, probe budget, prediction, and bridge receipt.
7. [agent][Y] Learning Router citation, when needed at close, resolves to the Learning Router in `_catechism-base.md`.
8. [agent][G] Git behavior remains catechism-proposed only; direction open never stages or commits files by itself.

## CLOSE
### Preconditions
1. [agent][R] Invocation is `/close direction` or `/close dir`; aliases resolve in the router before this pack loads.
2. [agent][R] Read the state dir's `direction.md`; if absent, close writes a no-prior-open receipt and asks for the single close decision only if needed.
3. [agent][R] Close needs a seasonal frame, candidate probe set, and draft or recoverable prediction; if absent, the agent drafts them from visible evidence before the user decides.
4. [agent][R] Direction close locks the seasonal frame, chosen probes, and written prediction; it does not execute the probes.
5. [agent][R] Close harvests two axes: world-signal and personal signal, then kills, keeps, or promotes only at seasonal cadence.
6. [agent][R] Exploration budget remains 1-3 probes; at least one probe must stay protected from pure efficiency pressure.
7. [agent][R] If cadence says the full seasonal close is early, close can write a check-in receipt and preserve the existing direction.
8. [agent][Y] If probes need project homes, the handoff is proposed and routed to `/open project`, `/open research-project`, or `/open experiment`.
9. [agent][G] If the season produced conflicting evidence, keep the evidence split visible rather than smoothing it into a single story.

### Steps
1. [agent][R] Load the direction bridge, recent closes, active goals/projects, and any probe evidence before asking the user for the close decision.
2. [agent][R] Compare the season against the open frame: what the frame made easier, what it constrained, what never met reality, and what surprised.
3. [agent][R] Harvest world-signal: external response, market/client/user signal, artifact performance, evidence, constraints, and opportunity cost.
4. [agent][R] Harvest personal signal: energy, interest, friction, avoidance, momentum, values fit, and whether the frame invited better work.
5. [agent][R] Draft the lock packet: seasonal frame, 1-3 probes, written prediction, comparison date, anti-windup note, and next route for each probe.
6. [USER-DECISION][R] Approve or edit the lock packet; this is the single `[R]` close decision.
7. [agent][R] Write the locked receipt to the state dir's `direction.md` with locked frame, probes, prediction, comparison date, evidence split, and next review trigger.
8. [agent][R] Run the installed catechism base plus route extensions below; the agent performs sweeps first and reports findings, proposals, and skips.
9. [agent][R] Present the close receipt as locked frame, probes chosen, written prediction, next route per probe, evidence gaps, and bridge path.
10. [agent][Y] For each chosen probe, draft a project-shaped handoff with affordable loss, expected evidence, first physical move, and stop/continue comparison point.
11. [agent][Y] Route reusable directional findings through the Learning Router in `_catechism-base.md`.
12. [agent][G] Compare the locked direction to prior season frames and note continuity, pivot, or intentional pause.
13. [agent][G] Identify one non-goal that remains outside the season so the probe set stays small.
14. [agent][G] Add a future blind-spot check: what missing evidence would change the next direction close.
15. [agent][G] Close with a boundary cue: direction is locked, probes have homes, and the next comparison standard is written.
16. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Direction lock integrity** -- Verify the close receipt contains seasonal frame, 1-3 probes, written prediction, comparison date, anti-windup note, and next route per probe.
2. [agent][R] **Prediction present-before-probe** -- Confirm the written prediction is recorded before probes execute; if missing, draft it from evidence and include it in the single lock decision.
3. [agent][R] **Exploration lane protected** -- Confirm at least one affordable-loss probe remains active for the season and that zero-probe closure was not accepted.
4. [agent][Y] **Two-axis harvest** -- Separate world-signal from personal signal and keep disagreement visible as evidence for the next season.
5. [agent][Y] **Cadence guard** -- Verify this lock respects the altitude cadence rule or names the urgency that justified an early close.
6. [agent][G] **Promotion discipline** -- Classify each candidate as kill, keep, or promote with evidence, not fluency.
7. [agent][G] **Anti-windup sweep** -- Identify lower-rung load that should shrink, pause, or wait so the new direction does not stack pressure.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] The `close` skill loads this pack from `~/.claude/skills/open/References/direction.md`; ownership stays in the open reference directory.
2. [agent][R] Direction close writes the bridge before routing probes to lower-rung opens.
3. [agent][R] The base catechism owns commits and provenance, memory routing, collaboration, and missing-items sweeps; this pack adds only directional extensions.
4. [agent][R] Probe execution routes to `project`, `research-project`, `experiment`, or `brief` after close; this pack records the handoff.
5. [agent][Y] Learning Router citation resolves to the Learning Router in `_catechism-base.md` and is not reconstructed in this pack.
6. [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This pack handles seasonal evidence split, lock packet, and prediction.
7. [agent][G] No auto-commit promise is made; commit proposals come only from the catechism base after worktree inspection.
8. [agent][G] Lighter tiers (`[R]`) trim ceremony scope, never standards.

## BRIDGE
1. [agent][R] Canonical file: `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/direction.md`.
2. [agent][R] Open reads: prior seasonal frame, cadence status, probe budget, candidate probes, draft prediction, anti-windup note, evidence gaps, and next review trigger.
3. [agent][R] Close writes: locked frame, 1-3 probes, written prediction, comparison date, world-signal, personal signal, kill/keep/promote notes, and next route per probe.
4. [agent][R] Bridge schema is plain markdown: `Season`, `Cadence`, `Frame`, `Means`, `Probe budget`, `Probes`, `Prediction`, `World-signal`, `Personal signal`, `Anti-windup`, `Next routes`, `Evidence gaps`.
5. [agent][R] File bridge is authoritative and ungated; any external mirror is a derivative and may lag without blocking the next open.
6. [agent][R] Open consumes only activation-lowering fields: frame, means, probe budget, next review trigger, and next physical move per probe.
7. [agent][R] Close leaves each probe with a lower-rung route destination so direction does not become the execution surface.
8. [agent][Y] Historical season detail belongs in memory routing after close; the active bridge keeps only the current or next seasonal handle.
9. [agent][Y] If the bridge and any mirror disagree, use the bridge and propose a mirror correction only as a gated step.
10. [agent][G] A useful bridge fits in one screen; deep evidence links can live beside source artifacts and be cited from the bridge.

## GATES
1. [agent][R] "Decision budget: `/open direction` open=2 and `/close direction` close=1; menu navigation is excluded."
2. [agent][R] "`[R]` subset: at most one user decision per direction."
3. [agent][R] "Direction is seasonal frequency; lower-rung execution routes to week, sprint, project, experiment, research-project, or brief."
4. [agent][R] "Exploration budget is 1-3 probes per season, never zero."
5. [agent][R] "Altitude cadence: direction reconciles at least 3x slower than the rung below unless urgency is visible."
6. [agent][R] "Written prediction is captured before probe execution and compared at close."
7. [agent][Y] "File-primary bridge (the state dir's `direction.md`) wins over any mirror."
8. [agent][Y] "Lighter tiers trim ceremony scope while standards stay intact."
9. [agent][G] "Close harvests world-signal and personal signal separately before kill, keep, or promote."

## GOTCHAS
1. [agent][R] Direction can sprawl into life planning; keep it seasonal, evidence-based, and tied to 1-3 probes.

2. [agent][R] A zero-probe season turns direction into preference only; the route requires at least one affordable-loss contact with reality.

3. [agent][R] Reopening direction too often breaks altitude cadence; route downward unless seasonal cadence or visible urgency justifies the move.

4. [agent][Y] Written prediction after probe execution weakens the comparison standard; capture it before lower-rung work begins.

5. [agent][Y] External mirrors are not the source of truth; the file bridge carries the seasonal lock and probe handoffs.

6. [agent][G] World-signal and personal signal can disagree; preserving the split is more useful than forcing a clean verdict.
