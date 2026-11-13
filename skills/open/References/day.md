# day — /open + /close
BLUF: Starts the day from yesterday's Flow Plan, async agent results, current capacity, and the live work surface.
Closes the day by draining open loops into tomorrow's Flow Plan, then using that Flow Plan as the dispatch brief.
DECISION BUDGET: open=2 · close=3
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
- Route tokens: `day`, `d`, `today`; direct args may include `[G]`, `[Y]`, or `[R]`.
- Read bridge first when present: `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/flow-plan.md` (below, "the state dir" means that folder).
- Agent review happens before the user is asked to choose capacity; review depth expands after capacity is known.
- Cheap reads are allowed before user interaction: `<state dir>/work.json` (optional; absent means "no active run"), `SPRINT.md` in the state dir, prior Flow Plan, local date, and current repo state.
- Missing file state degrades to a scratch start; no silent route fallback.
- Reads from external tools (a task app, a notes app) may hydrate context, but any write to them is a gated, described proposal and never automatic.

### Steps
1. [agent][R] Review agent work FIRST: inspect the prior Flow Plan's `Agent Dispatch` block and current work state, then surface at most three facts: completed, needs the user's judgment, and blocked-or-absent.
2. [agent][R] Read `flow-plan.md` and surface the first physical next move, parked WHERE/NEXT/WHEN notes, and any explicit calendar prep named by the prior close.
3. [agent][R] Read `<state dir>/SPRINT.md`; if it is absent, skip quietly. Run the sprint health check (is there an active sprint, is it still inside its dates, was it checked recently?) from `SPRINT.md`'s YAML frontmatter fields `sprint_id`, `state`, and `last_check`.
4. [USER-DECISION][R] Ask one capacity question with `[G]`, `[Y]`, and `[R]` options; this is the only `[R]` user decision.
5. [agent][R] If `[R]`, offer basics only: water, food, any daily basics the user relies on, and the single next physical move from the Flow Plan; stop after offering a later check-in.
6. [agent][Y] Expand agent review only as far as capacity allows: completed outputs, failed runs, and decisions needing the user; park deep review when it would consume the morning.
7. [agent][Y] Hydrate, do not expand: read dated commitments, current in-progress work, and the Flow Plan before introducing any new surface.
8. [USER-DECISION][Y] Offer up to three starting choices from the Flow Plan, dated commitments, and the user's NMIT list (next most important things) or low-friction list, if the user keeps either; the user picks one implementation intention or names a different one.
9. [agent][Y] Convert the chosen start into one sentence: `Today starts with <task>; next physical action is <action>; support mode is <support>`.
10. [agent][G] Add calendar/time constraints, a milestone scan (if milestones are tracked), and want-to or low-friction options as context only; do not assign from the low-friction list.
11. [agent][G] If agent outputs need review, present a small review queue sorted by decision cost, then route non-urgent items to later.
12. [agent][G] Write an `## Open` section at the top of `<state dir>/flow-plan.md` for continuity: capacity, chosen start, agent-review status, sprint state, and any external mirror proposal.
13. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
- `/open day` is the day-start routine; if you also keep a separate day-start skill or command, do not call it as a second ceremony.
- If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them.
- Context clues come from `~/.claude/skills/open/Tools/context-clues.ts`; script failure falls back to the fixed grouped menu.
- Sprint check reads the file-primary sprint state; any external sprint mirror is gated.
- Optional context reads (for example your goals file, if you keep one) may inform the day, but the Flow Plan remains the primary handoff.

## CLOSE
### Preconditions
- Route tokens: `day`, `d`, `today`; direct args may include `[G]`, `[Y]`, or `[R]`.
- Always create or refresh `<state dir>/flow-plan.md`; the file bridge comes before any external mirror.
- Close runs even if every external tool is unavailable; local file state is sufficient.
- The Flow Plan is the dispatch brief for agent work.
- Close uses offers and proposals; it does not frame carryover as failure.

### Steps
1. [agent][R] Gather the smallest closure packet: current work state, changed files, prior Flow Plan, active task names when available, and any obvious open loop.
2. [USER-DECISION][R] Ask one combined close question: choose `[G]`, `[Y]`, or `[R]`, and provide tomorrow's anchor in the same response.
3. [agent][R] Create or refresh `flow-plan.md` with tomorrow anchor, first physical action, and an explicit `Agent Dispatch` block.
4. [agent][R] Derive dispatch candidates from the Flow Plan: research, synthesis, drafting, and monitoring are eligible; decisions and client-facing finals stay with the user.
5. [agent][Y] Offer to dispatch agent work that only reads, or writes only inside its own run folder, when tooling is available; dispatch it only on the user's go (a menu pick), otherwise record candidates and review instructions in the Flow Plan.
6. [agent][R] Report closure in one line: Flow Plan saved, dispatch status, and where open loops are parked.
7. [agent][Y] Park the current task or active set using WHERE/NEXT/WHEN; batch when more than three items are active.
8. [USER-DECISION][Y] Offer one carryover choice for the active set: return tomorrow, schedule later, delegate, or leave on the low-friction list.
9. [agent][R] Run the close catechism base and route items permitted by the selected tier, presenting findings and skip reasons without handing the checklist back to the user.
10. [agent][G] Sweep completions, in-progress work, workbench and low-friction-list items, and brain-dump material; propose bins before any destination motion.
11. [USER-DECISION][G] Ask for one approval gate on the proposed bins: accept, adjust, or skip.
12. [agent][G] Summarize the full-route catechism learning, provenance, and blind spots.
13. [agent][G] If you mirror the day into an external tool (a daily note, a task app), prepare that mirror as a described proposal only after the Flow Plan and drains are complete.
14. [agent][G] Offer a work-to-leisure boundary cue: close work surfaces, capture the return path, and choose a non-screen decompression option.
15. [agent][R] Respect quiet hours (default 22:00-08:00, adjustable): suppress sound or voice notifications and defer non-urgent agent dispatch announcements to the morning review.
16. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: run `~/.claude/skills/open/References/_catechism-base.md`.

<!-- route-catechism-extension:start -->
1. [agent][R] **Flow Plan bridge integrity** -- Verify `flow-plan.md` exists, contains tomorrow anchor, first physical action, WHERE/NEXT/WHEN when available, and agent dispatch status or an explicit no-dispatch note.
2. [agent][R] **Drain-before-stamp** -- Confirm the file bridge and open-loop drain are complete before any external day-note mirror is proposed; if the external tool is unavailable, keep the file as source of truth.
3. [agent][Y] **Agent dispatch packet** -- Present launched, parked, and skipped agent work with source, expected output, and next open review path.
4. [agent][Y] **Carryover as decision** -- Show what moved forward, what moved later, and what stayed on the low-friction list as explicit choices.
5. [agent][G] **Day pattern harvest** -- Extract reusable startup/shutdown friction, support-mode choices, and sequencing lessons for the Learning Router in `_catechism-base.md`.
<!-- route-catechism-extension:end -->

### Wiring
- `/close day` has no dependency on a separate shutdown skill; if you keep one, do not call it as a second closing ceremony.
- If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This pack performs the deliberate closeout, the Flow Plan, and dispatch selection.
- Agent dispatch uses the Flow Plan block as the brief; do not create a parallel dispatch taxonomy.
- Learning routing uses the Learning Router in `_catechism-base.md`; this pack does not reconstruct its table.
- Lighter tiers trim ceremony scope, never standards.

## BRIDGE
- Close writes and open reads: `<state dir>/flow-plan.md`.
- File shape:
  - Top line: `# Flow Plan`
  - `Date:`
  - `Closed from:`
  - `Tomorrow anchor:`
  - `First physical action:`
  - `WHERE/NEXT/WHEN:`
  - `Agent Dispatch:`
  - `External mirror:`
  - `Open questions:`
- `Agent Dispatch` is part of the Flow Plan, not a second bridge.
- Open reads the prior file before asking the user for capacity.
- Close refreshes the file before any external mirror proposal.
- If an external mirror and the file disagree, file wins and the mirror is treated as stale until the user gates a correction.
- Flow Plan sections stay sparse; blank sections mean "none found" rather than failure.
- `Closed from` names the route invocation and capacity tier.
- `Tomorrow anchor` is a plain-language focus, not a task mandate.
- `First physical action` names the next visible move.
- `WHERE/NEXT/WHEN` can hold one item on `[R]`, one current item on `[Y]`, and a batch on `[G]`.
- `Agent Dispatch` lists launched agents, candidate briefs, and skip reasons.
- `External mirror` records only whether a mirror was proposed, gated, or skipped.
- `Open questions` lists decisions for the user, not chores.
- Blank sections are valid when no data exists.

## GATES
- "External mirrors are described-gated; the Flow Plan file stays authoritative."
- "decision budget; G/Y/R tiers; close->open bridge; offers-not-demands."
- "drain-before-stamp (day: move every open loop into the Flow Plan or a bridge before anything marks the day done), hydrate-don't-expand (open: load the context that exists before adding any new surface), verify-drain-reduce (close: verify the work, drain the open loops, reduce what carries over)."
- "Route tokens case-insensitive; aliases resolve first."
- "Unknown token -> suggest closest match(es) via the route table; NEVER silently fall back to a default route."

## GOTCHAS
- A separate day-start skill, if you have one, is absorbed here, not delegated; calling both creates two morning ceremonies.
- Agent review comes before capacity selection, but deep review waits for `[Y]` or `[G]`; `[R]` only preserves the review path.
- Flow Plan is the dispatch brief; a separate dispatch artifact would split the handoff and violate the day bridge.
- Context-clue script failure cannot block the route; fall back to the fixed grouped menu and continue.
- Both OPEN (the `## Open` section, step 12) and CLOSE write `flow-plan.md`, so the file's mtime cannot tell you which ran today; to detect "did today's OPEN happen", read the date inside the `## Open` section.
