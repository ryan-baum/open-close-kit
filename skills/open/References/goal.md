# goal — /open + /close
BLUF: Bottom Line Up Front: a goal is the rung that drives every project, milestone and task under it, so opening one
is a quality check on the goal itself before anything is built beneath it: is it measurable, what does it serve, what
already hangs off it, and what is the smallest next project. Closing one verifies the done-condition, harvests what
the goal taught, and reconciles every child project so nothing is left orphaned.
DECISION BUDGET: open=2 · close=2   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open goal <ref>` or `/open g <ref>`; `<ref>` is a goal id from your goals file (for example `G1`) or a title fragment.
2. [agent][R] Altitude: goal sits between `direction` (seasonal frame) and `project` (execution). A goal open never re-opens the seasonal frame and never decomposes past the next project set.
3. [agent][R] Cadence guard: a goal reconciles at least 3x slower than its projects. If the goal was opened or reviewed recently, this open becomes a check-in receipt and offers `/open project` instead.
4. [agent][R] Canonical home: your goals file (for example `GOALS.md`) is the canonical and only home for a goal's statement and status; there is no second mirror. A goal found only elsewhere (a stray note, a task in another tool) is a finding: propose its entry in the goals file as an edit, never a second home.
5. [agent][R] The goals file is optional. If you keep none, `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/goal-next.md` becomes the canonical home for the goal's statement, status and done-condition (still one home, no mirror), and every "goals file" edit below writes there instead.

### Steps
1. [agent][R] Read `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/goal-next.md` if present; hydrate only this goal's prior state.
2. [agent][R] Resolve the goal in the goals file; quote its statement, status, done-condition and parent links (the larger aims it serves, where your file keeps them) verbatim.
3. [agent][R] **Child census:** list every project/milestone that names this goal as parent (a registry `parent_goal` field, a `parent_goal:` line in a project's `CONTRACT.md` frontmatter, or `project-next.md` and `goal-next*.md` in the state dir). Mark each active / stalled / done / orphaned, and offer to re-parent each orphan as a file edit, one project at a time. This is the "drives everything else" check — a goal whose children are stalled is information, not a to-do.
4. [agent][R] **Goal quality sweep**, agent-answered, never asked as questions:
   - Done-condition: is there a binary, observable "done" (or, for a practice goal, a PACT-shaped process commitment: a repeatable action with a threshold)? If not, draft one.
   - What it serves: which larger aim in your goals file, if it keeps any; a goal serving nothing on that map is flagged, not deleted.
   - Maintenance test: does this goal need regular manual tending to stay on track? If so, propose an automated reminder or check, or a smaller version of the goal.
   - Glass or rubber (a dropped glass ball breaks, a rubber one bounces): what is lost, and when, if this goal stays parked as "maybe later".
   - Antecedent (experiential goals only): what reliably produces the feeling the goal is after.
5. [agent][R] **Capacity check:** count goals currently Active and their active child projects, and state the number plainly. Report only; no WIP limit is enforced.
6. [USER-DECISION][R] Decision 1 — status and done-condition: activate / keep parked ("maybe later") / drop; accept or edit the drafted done-condition. The user decides; the agent recommends and states its confidence.
7. [agent][R] Propose the smallest next project set (1–3) that moves the done-condition, each with its first milestone named but not opened. Existing child projects come first; new ones only when no child covers the gap.
8. [USER-DECISION][Y] Decision 2 — which next project opens now (hands off to `/open project`), or none.
9. [agent][R] Write `goal-next.md` with goal ref(s), home, status, done-condition, child census, capacity count, chosen next project, and next review date.
10. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
1. [agent][R] Router: Route Table row `goal | g, goals` in both `open` and `close` SKILL.md.
2. [agent][R] `project.md` (Preconditions item 5) reads `goal-next*.md` as a parent-goal source; `direction.md` (OPEN step 2) reads the goal census from the same files for season review.
3. [agent][Y] The agent reads and edits the goals file directly; a goals-management skill, if you have one, is an optional delegate.

## CLOSE
### Preconditions
1. [agent][R] Status candidates: achieved, dropped, paused, or superseded by another goal.
2. [agent][R] Files lead: `goal-next.md`, the child census and project contracts; any external mirror is never the sole close source.

### Steps
1. [agent][R] Re-run the child census; every child must end closed, re-parented, or deliberately kept — a goal never closes over live orphans.
2. [agent][R] Verify the done-condition against evidence (probe, file, count); "achieved" without evidence is reported as "claimed".
3. [USER-DECISION][R] Decision 1 — close status, with the agent's recommendation.
4. [agent][R] Run `_catechism-base.md` in full plus the extensions below.
5. [USER-DECISION][Y] Decision 2 — successor goal, if any (offered, never assumed).
6. [agent][R] Write `goal-next.md` close receipt; close with "What stays open: …".

### Wiring
1. [agent][R] The agent edits the goals file directly, and your lessons file (for example a `LESSONS.md`) if you keep one; a goals-management skill is an optional delegate.
2. [agent][R] No independent blindspot-audit item: a goal close makes no build or delivery claims of its own; its child projects' closes carry that audit.

### Catechism
Base: [agent][R] Run `~/.claude/skills/open/References/_catechism-base.md`.

<!-- route-catechism-extension:start -->
1. [agent][R] **Goal reconciliation** -- update the goals file status as a gated edit; a goal marked closed in one place (registry, child contracts, bridge) and open in the goals file is a finding.
2. [agent][R] **What the goal taught** -- one paragraph: did the done-condition measure the thing the user wanted? Route a wrong-measure lesson to your lessons file as a proposal if you keep one; it always goes in the bridge `lesson` field.
3. [agent][Y] **Celebrate in the user's terms** -- name what was achieved in the user's own terms; compare it with where things started, not with a newer, higher bar.
<!-- route-catechism-extension:end -->

## BRIDGE
1. [agent][R] Open READS then WRITES, close WRITES the state dir's `goal-next.md`; `/open project` and `/open direction` READ it (one file per goal slug if more than one goal is active: `goal-next-<slug>.md`).
2. [agent][R] Schema: `route`, `goal_refs`, `home`, `status`, `done_condition`, `child_census`, `capacity_count`, `next_project`, `next_review`, `successor_goal`, `lesson`, `closed_at`.

## GATES
1. Decision budget per direction; menu navigation excluded.
2. A goal open never decides values; it drafts and recommends.
3. No goal closes over live orphaned children.

## GOTCHAS
1. The goals file is the canonical home and there is no second mirror. Goals have no work contract of their own: `goal-next.md` plus the goals-file entry hold their state; child projects carry the contracts.
2. Many goals sit parked ("maybe later"); opening one is the moment it moves, so the status move is always Decision 1, never inferred from the open itself.
3. Goals that are practices (a daily writing habit, regular cooking) need PACT-shaped done-conditions, not outcomes.
