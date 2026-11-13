# project — /open + /close
BLUF: Bottom Line Up Front: opens a project-altitude work surface by choosing the work-contract (`CONTRACT.md`) home, linking the parent goal, and creating a registry stub (for example in a `PROJECTS.md`) when needed. Closes by verifying the contract, routing learnings into findable memory, informing successor projects, checking the parent goal, and writing a drain handoff for reusable but uncurated output.
DECISION BUDGET: open=2 · close=3   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open project`, `/open p`, or `/open proj`; aliases resolve in the router before this pack loads.
2. [agent][R] Required input is a project name or existing project hint; if absent, ask one combined question for name plus desired home.
3. [agent][R] Project home options are existing repository, `${OPEN_CLOSE_WORK_DIR:-~/work}/<project-slug>`, or current work surface; present only viable options.
4. [agent][R] The opening path hydrates context before adding structure: parent goal, current milestones, human-unblock queue, and existing artifacts.
5. [agent][Y] Parent goal comes from explicit args, `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/goal-next*.md` (written by `/open goal`), your project registry (for example a `PROJECTS.md`), if you keep one, `CONTRACT.md`, `work.json` (optional), or recall (search recent session transcripts, run folders, contract titles and `git log`); ambiguity can consume the second open decision.
6. [agent][Y] The registry is optional. If you keep one, it is created or updated file-first only when the project lacks a registry stub.
7. [agent][G] Git is optional for opening; if unavailable, preserve file artifacts and park the commit proposal in the bridge file.
8. [agent][G] The project route does not decompose every milestone; it records the smallest useful next milestone set and leaves execution to later routes.

### Steps
1. [agent][R] Read `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/project-next.md` if present, then hydrate only parent goal, current project state, and next physical move.
2. [agent][R] Resolve target from args, current directory, `work.json`, the registry, and recall; if multiple matches remain, ask one target/home question.
3. [USER-DECISION][R] Choose project home only when the agent cannot infer it: existing repository, the work root, or current work surface.
4. [agent][R] Slugify any new project path: lowercase, whitespace to hyphen, strip characters outside `a-z`, `0-9`, and hyphen, compress repeated hyphens, trim edge hyphens.
5. [agent][R] Check for path collision before creation; append a numeric suffix for the first clear collision and ask before any further alternate.
6. [agent][R] Create or reconcile the project's work contract (`CONTRACT.md` in the project home: frontmatter `phase: open`; sections Goal, Criteria as `- [ ] C-1 ...`, Decisions, Changelog); minimum surface is `CONTRACT.md` plus whatever files already define the project.
7. [agent][R] If you keep a registry, create or update the stub with project name, home path, parent goal, active status, and first next route offer.
8. [agent][R] Link upward to the parent goal without re-deciding that goal; if the goal is unclear, record `goal: unresolved` and offer a goal check.
9. [agent][Y] Search your knowledge notes for project-status and closeout patterns before adding new structure; use hits as context, not as requirements.
10. [agent][Y] Recall prior work, matching directories, and git history; attach only high-signal findings to the contract.
11. [agent][Y] Identify current milestones and true human-unblock handoffs; do not turn every agent step into a project task.
12. [agent][Y] If the project is client-facing, research-oriented, or hobby-shaped, offer the matching route family instead of silently converting it.
13. [USER-DECISION][Y] If parent goal or route family remains ambiguous after evidence, choose one link or choose "file-first, link later."
14. [agent][G] Run a document review (a structured read of the plan) and check your goals file only when the contract lacks a coherent goal-output-current-state spine.
15. [agent][G] Initialize git only for a new file surface, stage explicit scaffold files, and propose `open(project): <project-slug>`.
16. [agent][R] Write `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/project-next.md` with route, project home, parent goal, current milestone set, and next physical move.
17. [agent][Y] Record cadence guard: the project open links to the goal altitude, but does not re-open goal strategy outside its review rhythm.
18. [agent][G] Report project home, parent goal state, registry stub state, and one offered next route.
19. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
1. [agent][R] Router handles aliases `p` and `proj`, bare-menu placement, and deterministic clue gathering; this pack handles only project ceremony.
2. [agent][R] The work contract owns scaffold, completeness check, and reconcile; the agent edits it directly and this pack carries ordering and gates.
3. [agent][R] Recall recovers prior project surfaces. If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them.
4. [agent][Y] Your knowledge notes (if any) can supply project-status and seam playbooks when relevant.
5. [agent][Y] Your goals file (for example `GOALS.md`), if you keep one, can show goal/project dependency state; treat it as advisory evidence.
6. [agent][G] A document review of an unclear contract or plan surface is an optional delegate, not a mandatory ceremony step.
7. [agent][G] `work.json` is optional. If you keep one and nothing syncs it from the contract, update it by hand; this pack does not create a second sync path.
8. [agent][G] Git open commit is a scoped proposal with explicit staging, not a hidden side effect.

## CLOSE
### Preconditions
1. [agent][R] Target project resolves from explicit args, current directory, your project registry, or the active contract in `work.json` (if you keep one); if multiple remain, ask one target question.
2. [agent][R] `CONTRACT.md` is the primary file source for criteria, status, evidence, and project phase; if absent, name the gap and use available artifacts.
3. [agent][R] The registry, if you keep one, is the file-primary registry surface; if absent, close can still run and propose a stub.
4. [agent][R] Status options are complete, pause, abandon, or wait; the status is carried into the bridge and commit preview.
5. [agent][Y] Current milestones, child tasks, and artifacts are inspected before any status proposal.
6. [agent][Y] Any scheduled harvest you run owns machine drain; this pack records wiring and status, not a rebuilt drain.
7. [agent][G] Check existing verification commands, tests, or evidence listed in the contract before reporting criteria count.
8. [agent][R] File state and evidence artifacts lead; a mirror in an external tool is never the sole close source.
9. [agent][Y] If git status includes unrelated files, present scoped staging groups before the commit decision.

### Steps
1. [agent][R] Resolve project home and show close preview: project name, home path, status candidate, contract source, and registry stub state.
2. [agent][R] Run a final check on the contract: criteria evidence, child milestones, remaining human-unblock handoffs, artifacts, sources, and unsupported claims.
3. [agent][R] Inspect the registry (if any) and prepare a file-first status update with outcome, parent goal, successor signals, and next route offer.
4. [USER-DECISION][R] Decision 1: choose status only when evidence allows multiple honest states; otherwise agent proposes status with skip reason.
5. [agent][R] Run the installed catechism base plus project extensions below; agent performs the sweeps first and reports findings, proposals, and skips.
6. [agent][R] Route learnings over project artifacts through the Learning Router in `_catechism-base.md`.
7. [agent][R] Promote only high-reuse learnings toward playbook candidates; low-certainty reusable material goes to the drain handoff (a `Drained/` folder in your knowledge notes, or a queue note) for a later harvest.
8. [agent][Y] When proposing a new curated playbook, use retrieval frontmatter: `title`, `slug`, `type: playbook`, `description`, and inline-array `tags` and `related` (a multi-line YAML list can be silently dropped by simple frontmatter parsers).
9. [agent][R] Surface saturation upward: if execution is blocked or capacity-bound, write that signal to the parent-goal handoff instead of stacking more child work.
10. [agent][Y] Goals check: compare project outcome to the parent goal in your goals file (for example `GOALS.md`), if you keep one; propose any goal edit as a gated file edit, and let the file note lead until the user approves.
11. [agent][Y] Next-projects-informed: identify successor, dependency, or follow-on project candidates and record them as offers in the bridge and the registry.
12. [agent][Y] Metabolic drain (moving reusable outputs out of the project so they can feed later work): place reusable but uncurated outputs into the drain handoff or a queue note; a later harvest does the drain and relevance work.
13. [USER-DECISION][Y] Decision 2: choose whether to capture one additional Finding to Evidence to Rule entry if the agent found a reusable lesson not already written.
14. [agent][Y] If captured, append exactly one indexed entry to the selected learning surface and include a pointer to the artifact, commit, or session.
15. [agent][Y] Build commit message preview with trailers: `Criteria-met: N/N`, `Learnings: N`, `Closed-at: YYYY-MM-DD`.
16. [USER-DECISION][Y] Decision 3: commit now or preserve close artifacts for later.
17. [agent][Y] If committing, stage explicit files only and use `close(project): <project-slug> — <status>` plus the three trailers.
18. [agent][R] Finalize with one full-file `Write` (not Edit, MultiEdit, or Bash, so the bridge is never left half-updated if the close stops midway) to `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/project-next.md` after the catechism. Include `route: project`, `audit_slug` (a short label you chose for the audit, or `none` if it was skipped), `audit_run_id` (any id the reviewer returned, or `none`), terminal status, and a fresh timezone-qualified RFC 3339 `closed_at`.
19. [agent][G] Run a formal root-cause analysis only when the close reveals a repeated failure pattern or an unexpected result worth it.
20. [agent][G] Write an executive summary only when the project produced a handoff-grade artifact for future retrieval.
21. [agent][R] Report close outcome as status, criteria count, learning routes, bridge path, goal-check note, and next physical move.
22. [agent][Y] Preserve uncommitted close artifacts if the user skips the commit; name exactly what remains in the workdir.
23. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Goals check** -- Compare project evidence to the parent goal and propose any goals-file update as a gated edit.
2. [agent][R] **Next projects informed** -- Produce successor, dependency, and follow-on project offers; record skips when no useful successor exists.
3. [agent][R] **Metabolic drain** -- Identify reusable outputs for the drain handoff, a `Drained/` folder in your knowledge notes, or a curated playbook proposal; a later harvest owns machine drain.
4. [agent][Y] **Findable playbooks** -- Ensure any new playbook proposal uses inline-array `tags` and `related` frontmatter before it enters your playbooks folder.
5. [agent][Y] **Saturation upward** -- Surface blocked or capacity-bound state to the parent goal handoff with evidence and one offered adjustment.
6. [agent][Y] **Independent blindspot audit (optional)** -- The second lens on base item 4. Have a reviewer with a different model lineage (or, failing that, a fresh subagent with no access to this conversation) audit close-CLAIM integrity: does every "done/delivered" claim match evidence in the contract/artifacts/git, are all open decisions and loops surfaced, is any completion resting on a single self-report, is the rollback real. Hand it the draft close report (if one exists) and keep a short slug for the run plus any run id the reviewer returns for the final bridge Write. Fold or refute each finding with evidence BEFORE the close is recorded; state the verdict (pass/concerns/fail) in the close output. The audit is read-only. If no independent reviewer is available, or it errors, record `skipped` and say so: independent coverage was NOT obtained.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] The work contract carries the criteria; the agent runs the final criteria and reconcile checks and this pack reports findings and commit proposals.
2. [agent][R] The Learning Router in `_catechism-base.md` handles learning destinations.
3. [agent][R] A later harvest (yours, if you run one) owns drain, queue movement, and relevance recomputation; this pack writes only handoff notes and status.
4. [agent][Y] Search your knowledge notes for prior closeout patterns before the catechism; apply retrieved playbooks only when evidence matches.
5. [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This pack handles deliberate project closeout.
6. [agent][G] A root-cause analysis and an executive summary are optional high-signal delegates, not default steps.
7. [agent][R] Git commit behavior follows explicit staging and the three close trailers; no silent broad staging.
8. [agent][G] A verification gate, if you run one, may shadow completion claims; this pack records concrete evidence before final status regardless.

## BRIDGE
1. [agent][R] Close WRITES `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/project-next.md`; open READS the same file before target and home selection.
2. [agent][R] Bridge schema: `route`, `project_slug`, `project_home`, `parent_goal`, `status`, `criteria_met`, `learnings_count`, `successor_offers`, `drain_handoff`, `next_physical_move`, `audit_slug`, `audit_run_id`, `closed_at`.
3. [agent][R] Bridge is file-primary and ungated; any external mirror stays gated and can lag without blocking continuity.
4. [agent][Y] On open, consume only what lowers activation energy: home hint, parent goal, current milestone set, and next physical move.
5. [agent][Y] On close, include enough context for `/open project`, `/open milestone`, or `/open session` to resume without re-reading the whole project.
6. [agent][R] If the bridge file is missing, open proceeds from args, context clues, and project files; absence is named, not treated as a blocker.
7. [agent][Y] If bridge points to a removed path, preserve the text and write a fresh note with the new target path.
8. [agent][G] Bridge updates include source lines for files that influenced routing.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "Lighter tiers trim ceremony scope, never standards."
3. [agent][R] "Open hydrates existing context before adding ceremony."
4. [agent][R] "Close verifies, drains, and reduces scope before marking the project closed."
5. [agent][R] "File-primary bridge wins when mirrors disagree."
6. [agent][Y] "Reuse over rebuild; packs carry ordering, glue, and gotchas."
7. [agent][R] "The [R] close path uses no more than one user decision."
8. [agent][Y] "Project close surfaces saturation upward instead of stacking child work."

## GOTCHAS
1. [agent][R] A project is higher altitude than a milestone; opening it should link parent goal and current milestones, not create a full milestone tree.
2. [agent][R] Project home selection replaces milestone-only folder creation; only slug and collision discipline carry over from the milestone route.
3. [agent][R] The three-decision close ceremony is a budget discipline; catechism sweeps are agent-run and do not become extra user decisions.
4. [agent][R] Goal checks against an external mirror are gated; file notes and bridge handoff lead until the user explicitly approves the mirror.
5. [agent][Y] Curated playbooks require inline-array frontmatter; multi-line `tags` or `related` can become parser-invisible.
6. [agent][Y] Metabolic drain is a wiring point for a later harvest; rebuilding drain logic inside this pack creates duplicate lifecycle machinery.
7. [agent][Y] Per-criterion checkpoint automation can exist in one setup and be absent in another; check that it is actually running before claiming automatic criteria commits.
8. [agent][G] Parent goal ambiguity can spend the second open decision quickly; combine home, goal, and route-family choice into one menu when possible.
