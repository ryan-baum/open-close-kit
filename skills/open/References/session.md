# session — /open + /close
BLUF: Start a work block from a preloaded next move, then land it with a clean park note; close prepares the downhill entry and open executes one chosen session.
DECISION BUDGET: open=1 · close=1
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Accept optional args as a session label, project slug, or task hint; if absent, use the bridge and NMIT (next most important thing) context.
2. [agent][R] Read `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/session-next.md` first when present (below, "the state dir" means that folder); if absent, continue with a short NMIT-derived offer set.
3. [agent][R] Treat `<state dir>/work.json` as context only; it is optional, absence means "no active run" and does not block the ceremony.
4. [agent][R] Require no external tool access (task app, notes app) to open a session; the file bridge is sufficient, and any external mirror is a gated, described proposal only.
5. [agent][Y] If a ceiling was already parked by close, preserve it unless the user changes the single session choice.
6. [agent][G] If multiple plausible session targets remain after bridge plus args, present up to three offers, most likely first.

### Steps
1. [agent][R] Surface the parked downhill note first: WHERE, NEXT, WHEN, and any named project or task context.
2. [agent][R] Convert the parked note or args into one implementation intention: task, first physical action, session envelope (default ≈ 4 hours unless args or the bridge say otherwise; flowtime cycles with count-up and ceiling alarms run INSIDE the envelope), and stopping condition.
3. [USER-DECISION][R] Offer one compact choice: accept the proposed session target or pick one alternate from the NMIT list.
4. [agent][R] Start from count-up timing semantics: stopwatch counts up; no fixed countdown is assumed.
5. [agent][R] Set the ceiling offer (Flowtime-style: work until a natural stop, with a cap): shorter for routine work (about 40 minutes), longer for absorbing work (about 90 minutes).
6. [agent][R] Name the deep-focus exit ramp before work begins: near the ceiling, prepare to pause with a five-minute metacognitive check.
7. [agent][R] State the transition anchor in plain language: session opened; work is one thing until natural focus drop or ceiling.
8. [agent][Y] Mark up to two or three tasks as deep-focus-eligible only when they are already visible in the NMIT context; do not invent a queue.
9. [agent][Y] Add support offers when useful: working alongside someone, music, environmental cue, or a lower-friction start ramp.
10. [agent][Y] If focus drops early, route directly to park rather than treating the block as unfinished.
11. [agent][Y] If energy drop signals cluster, offer low-friction mode: park current work and switch to lower-friction tasks.
12. [agent][G] For a high-energy block, allow two or three deep-work passes, each with its own park or continuation check.
13. [agent][G] For a low-energy block, keep the scope to one thing and one short pass while preserving the same park standard.
14. [agent][G] Keep planning out of the open ceremony; open hydrates the prior plan instead of expanding it.
15. [agent][G] If the bridge points to a stale surface, offer one NMIT fallback and keep the stale note as context only.
16. [agent][G] Echo the selected first action back to the user as the body-double cue before the block begins.
17. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
1. [agent][R] No automation is built or invoked by this pack.
2. [agent][R] Future wiring point only: pomodoro-style timer start, preserving count-up semantics and a ceiling alarm.
3. [agent][R] Future wiring point only: Shortcuts action to start the timer and set the ceiling alarm.
4. [agent][R] Future wiring point only: Focus mode activation for the selected work context.
5. [agent][Y] If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them.
6. [agent][G] Any future automation must keep the one-choice open budget and file-first bridge.

## CLOSE
### Preconditions
1. [agent][R] Accept optional args as the session label or target being landed; if absent, infer from work context and recent bridge/open state.
2. [agent][R] Close can run after a full block, an early natural stop, an energy drop, or a planned mode switch.
3. [agent][R] Require no external tool access to close; the file bridge is sufficient and authoritative for next open.
4. [agent][R] Before asking the user anything, draft the park note from visible work: WHERE, NEXT, WHEN.
5. [agent][Y] If the ceiling alarm rings while flow remains useful, run the metacognitive check before proposing an extension.
6. [agent][G] If multiple work surfaces changed, sweep them in priority order and keep only restart-critical detail in the bridge.

### Steps
1. [agent][R] Summarize plan versus actual in one or two lines: intended target, actual work done, and current stop reason.
2. [agent][R] Draft the 15-second Park Ritual: WHERE the user was, NEXT literal physical action, WHEN likely return window.
3. [USER-DECISION][R] Offer one edit point: accept the drafted park note or replace NEXT/WHEN with the user's chosen version.
4. [agent][R] Write the final park note to `<state dir>/session-next.md`.
5. [agent][R] Compute the break offer as about 20 percent of work time and specify no screens.
6. [agent][R] State the transition anchor: session closed; every restart-critical loop has a home.
7. [agent][Y] If a ceiling alarm ended active flow, run the five-minute check: food, hydration, movement, priority, and whether one short extension is warranted.
8. [agent][Y] If basics or priority do not support extension, park and transition to break without adding more work.
9. [agent][Y] Triage the distraction parking lot into keep, defer, or discard; do not expand the next session plan.
10. [agent][Y] If energy drop signals show up, note the mode switch cue and offer low-friction mode for any remaining work.
11. [agent][G] Capture one small win or concrete completed unit so the close has a positive completion marker.
12. [agent][G] If useful, stage a next-session plan in a different sitting by writing only the first move now and leaving planning detail to a later open or day route.
13. [agent][G] If agent work should continue after the user stops, produce a compact handoff note outside any external tool and point to the bridge.
14. [agent][G] Verify, drain, reduce: every open loop gets either a trusted home, a bridge line, or an explicit skip reason.
15. [agent][G] If close happens before work begins, still write a bridge that says what was attempted and what the next physical action is.
16. [agent][G] If the next return time is unknown, use a neutral placeholder such as next session and leave the exact timing to open.
17. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: run `~/.claude/skills/open/References/_catechism-base.md`.

<!-- route-catechism-extension:start -->
1. [agent][R] **Session park integrity** -- Verify `session-next.md` contains WHERE, NEXT, WHEN, and no expanded planning load; repair the draft before close completes.
2. [agent][R] **Restart friction audit** -- Check whether the next open can begin from a literal first action; if not, compress NEXT until it is physical and visible.
3. [agent][Y] **Deep-focus exit review** -- Report whether the ceiling, metacognitive check, and break offer were used; name any skipped piece with reason.
4. [agent][Y] **Parking-lot routing** -- Sort distractions and side quests into keep, defer, discard, or Learning Router candidate (see `_catechism-base.md`) without writing to any external tool.
5. [agent][G] **Planning separation check** -- Confirm any next-session planning was staged for a different sitting and not mixed into the work block.
6. [agent][G] **Completion marker check** -- Confirm the close surfaced one concrete finished unit, even if the unit is only a clean park note.
7. [agent][G] **Support cue check** -- Note which support cue helped initiation or exit, and route reusable cues to the Learning Router when useful.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] No automation is built or invoked by this pack.
2. [agent][R] Future wiring point only: pomodoro-style stop, elapsed-time readout, and break offer.
3. [agent][R] Future wiring point only: Shortcuts action to write elapsed minutes and set a break cue.
4. [agent][R] Future wiring point only: Focus mode release or switch after the close anchor.
5. [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them.
6. [agent][G] Future wiring must keep external mirrors gated and bridge writes file-primary.
7. [agent][G] Future wiring must not turn the session route into a tracker; elapsed time supports the park note only.

## BRIDGE
1. [agent][R] Close writes `<state dir>/session-next.md`.
2. [agent][R] Open reads `<state dir>/session-next.md` before NMIT, args, or context clues.
3. [agent][R] The bridge schema is plain markdown: `WHERE`, `NEXT`, `WHEN`, `CEILING`, `BREAK`, `SOURCE`.
4. [agent][R] `NEXT` is a literal physical action, not a project outcome or broad intent.
5. [agent][R] `WHEN` can be approximate, such as after break, next session, tomorrow morning, or named calendar block.
6. [agent][Y] `SOURCE` cites the local work surface or route context, not a fabricated external-tool reference.
7. [agent][Y] If an external mirror and the file bridge disagree, file bridge wins for next open and the mirror is treated as derived.
8. [agent][G] A useful bridge is short; the open ceremony hydrates it and does not expand it into a full plan.
9. [agent][G] If a bridge is superseded by a later close, keep only the latest usable restart note in the active file.
10. [agent][G] Historical session notes belong in normal memory routing, not in the active bridge file.
11. [agent][G] The active bridge should fit in one screen so open can load it without a new triage pass.

## GATES
1. [agent][R] "External mirrors are described-gated: describe the intended change and wait for an explicit gate; the file bridge stays authoritative."
2. [agent][R] "Hydrate, do not expand: `/open session` starts from the bridge before adding context."
3. [agent][R] "Verify, drain, reduce: `/close session` lands loops before adding new structure."
4. [agent][R] "Offers and menus preserve autonomy; opting out is a valid outcome."
5. [agent][R] "Lighter tiers trim ceremony scope, never standards."
6. [agent][Y] "Reuse over rebuild: Flowtime doctrine (count-up timing, a ceiling alarm, proportional breaks) supplies the timing rules; do not invent a new timer scheme."
7. [agent][G] "Planning and doing happen in separate sittings whenever possible."
8. [agent][G] "The active bridge is a restart handle, not an archive."

## GOTCHAS
1. [agent][R] Flowtime is count-up with a ceiling alarm; converting it into a rigid countdown silently changes the doctrine.
2. [agent][R] The close path must write `session-next.md` even after a short or interrupted block; small landings still need a restart handle.
3. [agent][Y] Deep focus can make stopping feel expensive; the exit ramp is a metacognitive check, not an abrupt stop.
4. [agent][Y] Breaks are proportional and screenless; treating the break as another work surface defeats the transition.
5. [agent][G] NMIT can become a planning rabbit hole; open should choose one session target, then stop choosing.
6. [agent][G] Planning during open raises activation cost; close should stage the first move for a later session instead.
7. [agent][G] A bridge that says only the project name is too vague; NEXT must name the visible first motion.
8. [agent][G] A future timer integration that hides elapsed time would break the break-ratio rule.
9. [agent][G] A future Focus mode integration that blocks the parking surface would make close harder, so it must allow the bridge file.
10. [agent][G] A park note copied into an external tool without the file path can look primary; always name the bridge file when copying it.
