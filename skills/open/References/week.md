# week — /open + /close
BLUF: Bottom Line Up Front: weekly open previews the calendar, aligns with sprint state, and names the glass balls before the week hardens.
Weekly close compresses GATHER/SENSE/DECIDE into a celebrate-and-reroute review; carryover is an explicit decision, not a failure.
DECISION BUDGET: open=2 · close=2   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Route tokens: `week`, alias `w`; optional args may include a date range, named focus, or calendar constraint.
2. [agent][R] Read bridge file `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/week.md` first when present (below, "the state dir" means that folder).
3. [agent][R] Read `<state dir>/SPRINT.md` when present; if absent, treat sprint alignment as file-unavailable rather than blocking open.
4. [agent][R] Read your project registry (for example a `PROJECTS.md`), if you keep one, from the active workspace; if absent, continue from calendar and bridge context.
5. [agent][R] Calendar reads are context-gathering only; a calendar outage leaves the route usable from file state and user-provided constraints.
6. [agent][Y] If direct args conflict with prior week bridge, show the conflict as a choice inside the open decision budget.
7. [agent][G] If multiple calendar weeks are plausible, use local date as default context and offer the other range as an edit, not a hidden assumption.

### Steps
1. [agent][R] State the open decision budget and load the prior week bridge before any new planning surface.
2. [agent][R] Surface last close's carryover packet first: chosen carry, parked later, dropped, and next-week seed when present.
3. [agent][R] Sweep the calendar for fixed commitments, travel, meetings, recovery windows, and immovable work blocks; summarize in one compact block.
4. [agent][R] Read `SPRINT.md` and report only the current Core Focus, do-NOT, date range, midpoint check, and any visible mismatch with the week.
5. [agent][R] Run the glass-ball scan: identify obligations whose mishandling would have real consequence this week, plus one graceful escape hatch when known.
6. [USER-DECISION][R] Choose the single `[R]` week anchor: accept the proposed anchor, name a different anchor, or run the week as maintenance-only.
7. [agent][R] Write a minimal open receipt to the bridge file: week range, anchor, first visible move, sprint alignment note, glass-ball note, and external mirror status.
8. [agent][R] Keep the `[R]` path complete after the receipt; no second user choice is needed.
9. [agent][Y] Sweep active project surfaces for client commitments, active milestones, waiting states, and project work that needs calendar protection.
10. [agent][Y] Build up to three offer packets: focused week, maintenance week, or recovery-biased week; each packet includes one first move and one thing to leave out.
11. [USER-DECISION][Y] Pick one packet or edit exactly one field; this is the second and final open decision.
12. [agent][Y] Align the chosen packet with sprint state: either confirm fit, propose a sprint check-in, or mark a bridge note for sprint close/open.
13. [agent][Y] Convert the chosen packet into a weekly preview: anchor, calendar constraints, glass balls, optional focus blocks, and first physical move.
14. [agent][G] Add a lightweight risk scan: hidden dependencies, admin clusters, travel friction, energy load, and any useful sequencing note.
15. [agent][G] Add a "do-not-expand" guardrail so the week open hydrates context without turning into full sprint planning.
16. [agent][G] If calendar and project surfaces disagree, mark the disagreement as a bridge note and keep file state primary until the user chooses later.
17. [agent][G] Close the open with a transition cue: week preview opened; first move and glass balls have a trusted home.
18. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
1. [agent][R] Router resolves alias `w` before route match and loads this pack from `~/.claude/skills/open/References/week.md`.
2. [agent][R] The `close` skill loads the same canonical pack by absolute path; there is no separate week close file.
3. [agent][R] Context clues come from `~/.claude/skills/open/Tools/context-clues.ts`; script failure falls back to the fixed grouped menu.
4. [agent][R] Calendar reads support the weekly preview, but they do not create calendar edits from this pack.
5. [agent][R] `SPRINT.md` remains the sprint source; week open may surface sprint mismatch but does not rewrite sprint state.
6. [agent][Y] The project registry is an input for active commitments and context; this route does not create or close projects.
7. [agent][Y] If your setup runs SessionStart (or SessionEnd) hooks, they are complements: this pack does not duplicate them. This route owns the weekly bridge and decision receipt only.
8. [agent][G] When learning routing is needed at close, use the Learning Router in `_catechism-base.md`.

## CLOSE
### Preconditions
1. [agent][R] Route tokens: `week`, alias `w`; optional args may include the week range or a named focus to review.
2. [agent][R] Read `<state dir>/week.md`; if absent, produce a short no-prior-week receipt and create a next-week seed from visible context.
3. [agent][R] Read `SPRINT.md` when present to compare the week against sprint Core Focus and do-NOT without altering sprint state.
4. [agent][R] Read calendar and the project registry when available; absence becomes an explicit evidence gap, not a blocker.
5. [agent][R] Close uses compressed GATHER/SENSE/DECIDE: gather what moved, sense energy/friction, decide carry/drop/schedule.
6. [agent][R] Carryover is handled as a choice with a destination; it is not treated as a hidden roll-forward.
7. [agent][Y] Any external week-closure mirror remains described-gated; the file bridge closes the loop even when external tools are unavailable.
8. [agent][G] If the week close is early, state the scope of evidence and keep the next-week seed provisional.

### Steps
1. [agent][R] Load the week bridge, calendar summary, `SPRINT.md`, and visible project context before asking the user for any decision.
2. [agent][R] GATHER: summarize finished work, moved obligations, calendar reality, sprint alignment, and glass balls now safely parked.
3. [agent][R] SENSE: identify where the week had energy, friction, surprise, and constraint; use neutral language and concrete evidence.
4. [agent][R] DECIDE draft: propose carry, park later, schedule, delegate, or drop destinations for each open loop found.
5. [USER-DECISION][R] Approve or edit the carryover packet; this is the single `[R]` close decision.
6. [agent][R] Write the close record to `<state dir>/week.md`: close summary, carryover packet, next-week seed, first visible move, evidence gaps, and mirror status.
7. [agent][R] Present a completion receipt that names what moved, what is parked, and the next open's first visible move.
8. [agent][R] Run the `[R]` catechism extensions after the bridge write so the blind-spot sweep has a current source.
9. [agent][Y] Review carryover against sprint and project context; merge obvious destinations into the existing packet rather than adding a new decision.
10. [agent][Y] Identify one process learning about capacity, calendar shape, or weekly cadence; route it through the Learning Router in `_catechism-base.md` when useful.
11. [USER-DECISION][Y] Choose whether to pre-seed next week now or leave the agent-proposed seed for `/open week`; this is the second and final close decision.
12. [agent][Y] Run the `[Y]` catechism extensions and stage any external mirror proposal as described-gated.
13. [agent][G] Add a higher-resolution review of project drift, recurring friction, calendar compression, and helpful constraints.
14. [agent][G] Harvest one celebrate-and-reroute note: what deserves acknowledgement, and what gets a cleaner path next week.
15. [agent][G] Run full route extensions and record skips when no useful action exists.
16. [agent][G] Close with a boundary cue: week closed; carryover has a chosen home and next week starts from the bridge.
17. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: run `~/.claude/skills/open/References/_catechism-base.md`.

<!-- route-catechism-extension:start -->
1. [agent][R] **Weekly bridge integrity** -- Verify the bridge contains week range, close summary, carryover packet, next-week seed, first visible move, evidence gaps, and mirror status.
2. [agent][R] **Carryover destination audit** -- Confirm every carried item has one destination: next week seed, later list, scheduled block, delegate path, or drop.
3. [agent][Y] **Sprint alignment review** -- Compare the week close against `SPRINT.md`; report fit, mismatch, or no sprint evidence without changing sprint state.
4. [agent][Y] **Celebrate-and-reroute retro** -- Name one concrete win and one route adjustment for next week; route reusable findings through the Learning Router in `_catechism-base.md` when useful.
5. [agent][G] **Calendar shape learning** -- Extract a capacity or sequencing heuristic from the week for future weekly preview.
6. [agent][G] **Glass-ball residue scan** -- Check whether any consequence-bearing obligation lacks a trusted home and add it to the carryover packet before close completes.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] The `close` skill loads this pack from `~/.claude/skills/open/References/week.md`; ownership stays in the open reference directory.
2. [agent][R] Weekly close writes the file bridge before catechism extensions and before any external mirror proposal.
3. [agent][R] Calendar reads, `SPRINT.md`, and the project registry are evidence sources; this pack does not mutate them.
4. [agent][Y] Learning routing uses the Learning Router in `_catechism-base.md`.
5. [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This route still performs weekly GATHER/SENSE/DECIDE and carryover routing.
6. [agent][G] No auto-commit promise is made here; commit proposals come only from the catechism base after worktree inspection.
7. [agent][G] Lighter tiers trim ceremony scope, never standards.

## BRIDGE
1. [agent][R] Canonical file: `<state dir>/week.md`.
2. [agent][R] Close writes: week range, close summary, sprint alignment, glass balls, celebrate-and-reroute note, carryover packet, next-week seed, first visible move, evidence gaps, and mirror status.
3. [agent][R] Open reads: prior carryover packet, next-week seed, first visible move, sprint alignment note, glass-ball residue, and evidence gaps.
4. [agent][R] The bridge schema is plain markdown: `Week`, `Anchor`, `Calendar`, `Sprint alignment`, `Glass balls`, `Carryover`, `Next-week seed`, `First visible move`, `Evidence gaps`, `External mirror`.
5. [agent][R] `First visible move` must be physical or directly executable, not a broad outcome.
6. [agent][R] File bridge wins over any external mirror when they disagree.
7. [agent][Y] `SPRINT.md` remains a separate source; this bridge may link or quote it but does not replace it.
8. [agent][Y] The project registry supplies context; weekly bridge writes weekly surfacing state only.
9. [agent][G] Keep active bridge current and compact; historical review detail belongs in normal memory routing after close.
10. [agent][G] A useful bridge should fit in one screen so `/open week` starts from context rather than triage.

## GATES
1. [agent][R] "Decision budget: `/open week` open=2 and `/close week` close=2; menu navigation is excluded."
2. [agent][R] "`[R]` path: at most one user decision per direction."
3. [agent][R] "Week bridge is file-primary: `<state dir>/week.md` wins over any external mirror; mirrors are described-gated."
4. [agent][R] "Carryover receives an explicit destination; it is a decision, not a failure."
5. [agent][Y] "Weekly open hydrates calendar, sprint, and project context without becoming sprint planning."
6. [agent][Y] "Weekly close uses compressed GATHER/SENSE/DECIDE before catechism extensions."
7. [agent][G] "Lighter tiers trim ceremony scope while standards stay intact."

## GOTCHAS
1. [agent][R] Weekly review is protected review time; turning it into execution work raises activation cost and blurs the close boundary.
2. [agent][R] Calendar outage cannot block the route; file bridge plus user-provided constraints are enough to open or close.
3. [agent][Y] Sprint mismatch is surfaced as a routing finding; week pack does not rewrite `SPRINT.md` or replace sprint close.
4. [agent][Y] Carryover without destination becomes a new open loop; close must choose next week seed, later list, scheduled block, delegate path, or drop.
5. [agent][G] Glass-ball scan can sprawl; keep it to consequence-bearing obligations and graceful escape hatches.
