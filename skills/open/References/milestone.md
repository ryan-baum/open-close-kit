# milestone — /open + /close
BLUF: Bottom Line Up Front: opens a flat immutable milestone work surface with work-contract (`CONTRACT.md`) scaffolding; closes by checking criteria evidence, routing learnings, informing the parent, and writing the next-open bridge.
DECISION BUDGET: open=2 · close=3   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open milestone`, `/open m`, or `/open ms`; aliases resolve in the router before this pack loads.
2. [agent][R] Creation input is a milestone title plus enough project context to form `YYYYMMDD-HHMMSS_PROJECT--kebab-slug`; if either is absent, ask one combined question.
3. [agent][R] `${OPEN_CLOSE_WORK_DIR:-~/work}` is the target root; if unavailable, present the proposed path and return before file mutation.
4. [agent][R] The naming check uses regex example `^20[0-9]{6}-[0-9]{6}_[a-z0-9][a-z0-9-]*--[a-z0-9][a-z0-9-]*(-[23])?$`.
5. [agent][Y] Parent project can come from explicit args, current work surface, `work.json` (optional), or your project registry (for example a `PROJECTS.md`), if you keep one; if ambiguous, use the second open decision to choose among candidates.
6. [agent][G] Git is optional for opening; if unavailable, preserve the scaffold and park the commit proposal in the bridge file.
7. [agent][Y] Existing scaffold files inside a target path are treated as a collision, not as a merge destination.
8. [agent][G] If a template is absent, create the smallest file-local fallback and record the fallback in `LEARNING.md`.

### Steps
1. [agent][R] Read `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/milestone-next.md` if present, then hydrate only parent hint, prior criteria state, and next physical move.
2. [agent][R] Detect zoom from current path: inside an existing milestone or task surface means "use context, still create a new flat milestone under the work root unless the user selects another route."
3. [agent][R] If you keep a classifier note for choosing folder and milestone altitude (search the knowledge library's `INDEX.md`), apply it; if it clearly points away from `milestone`, surface the closest route and return without creating a workdir.
4. [USER-DECISION][R] If creation input is missing, ask one combined question: project key plus milestone title; direct args consume no decision.
5. [agent][R] Slugify title and project key: lowercase, whitespace to hyphen, strip characters outside `a-z`, `0-9`, and hyphen, compress repeated hyphens, trim edge hyphens.
6. [agent][R] Build directory name as `YYYYMMDD-HHMMSS_PROJECT--kebab-slug`; example `20260708-141530_open-close--milestone-pack`.
7. [agent][R] Check collision at target path; on first collision append `-2`, on second append `-3`, and after that use the second open decision for an alternate slug.
8. [agent][R] Create the workdir and the work contract; the minimum file surface is `CONTRACT.md` (frontmatter `phase: open`; sections Goal, Criteria as `- [ ] C-1 ...`, Decisions, Changelog), `LEARNING.md`, and `.gitignore`.
9. [agent][Y] Recall prior work (search recent session transcripts, run folders, contract titles and `git log`), then attach only high-signal context to the contract instead of expanding the ceremony.
10. [USER-DECISION][Y] If more than one parent project remains plausible, choose one parent or choose "file-first, link later."
11. [agent][G] Initialize git when absent, stage explicit scaffold files, and propose `open(milestone): <directory-name>` as the opening commit.
12. [agent][R] Write `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/milestone-next.md` with route, target path, parent hint, and first physical move for session pickup.
13. [agent][Y] Add a `source` note in the contract pointing back to the open invocation args and the generated directory name.
14. [agent][G] Run a quick file listing after scaffold and report only created paths plus any skipped optional file.
15. [agent][R] Close with: "You are set up. NMIT (next most important thing): <the next most important thing from this open>."

### Wiring
1. [agent][R] Router handles aliases `m` and `ms`, bare-menu placement, and deterministic context clues; this pack handles only milestone ceremony.
2. [agent][R] The work contract owns scaffold, completeness check, and reconcile; the agent edits it directly and the pack carries ordering and gates.
3. [agent][R] The knowledge library (`_knowledge.md`) can hold the folder and milestone classifier and relevant playbooks; the classifier table is not reconstructed here.
4. [agent][Y] Recall (transcripts, run folders, contract titles, `git log`) recovers prior work. If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them.
5. [agent][G] `work.json` is optional (absent means "no active run"). If you keep one and no hook syncs it, update it by hand from the contract's frontmatter and criteria.
6. [agent][G] Git open commit is a proposal, not a hidden side effect; explicit staging keeps scope visible.

## CLOSE
### Preconditions
1. [agent][R] Target milestone resolves from current directory, explicit args, or the active contract in `work.json` (if you keep one); if multiple targets remain, the router asks one target question and returns before close ceremony.
2. [agent][R] Status is `complete` by default; `--status pause` and `--status abandon` are accepted and carried into file bridge and commit title.
3. [agent][R] Current workdir is a git repository or has a parked commit proposal; if not, close still runs learning, criteria, and bridge steps.
4. [agent][R] `CONTRACT.md` is primary for criteria; if absent, use `LEARNING.md` and git history as available evidence and name the evidence gap.
5. [agent][Y] `LEARNING.md` exists in the run folder or is created with one line per entry, `- Finding: <what was seen> · Evidence: <where> · Rule: <what to do next time>`, before any capture.
6. [agent][G] Do not promise automatic per-criterion checkpoint commits unless a checkpoint mechanism is verifiably running in your setup; otherwise propose commits manually.
7. [agent][R] File state and evidence artifacts lead; a mirror in an external tool is never the sole close source.
8. [agent][Y] If git status includes unrelated files, present scoped staging groups before the commit decision.
9. [agent][G] If tests or verification commands exist in the contract, run or cite them before final criteria count.

### Steps
1. [agent][R] Detect milestone zoom from the flat name regex and confirm the directory basename, target path, and status in the close preview.
2. [agent][R] Count contract criteria and existing `LEARNING.md` entries; show counts and evidence sources before any capture prompt.
3. [USER-DECISION][R] Decision 1: choose "capture one learning" or "close without capture"; `pause` and `abandon` status skip directly to criteria and bridge.
4. [USER-DECISION][Y] Decision 2: if capturing, run one sequential Finding→Evidence→Rule flow and append exactly one indexed entry to `LEARNING.md`.
5. [agent][R] Run a completeness check on the contract: compare checked criteria to cited evidence, list Criteria-met as `N/N`, and name any unsupported claims.
6. [agent][R] Run the installed catechism base plus route extensions below; agent performs the sweeps first and reports findings, proposals, and skips.
7. [agent][R] Route milestone learnings through the Learning Router in `_catechism-base.md`; do not invent a separate promotion chain.
8. [agent][Y] Update file-primary milestone state: contract `phase:` (set `complete` on a complete close) and status, `LEARNING.md` count, bridge note, and parent-project handoff text.
9. [agent][Y] Build commit message preview with trailers: `Criteria-met: N/N` · `Learnings: N` · `Closed-at: YYYY-MM-DD`
10. [USER-DECISION][Y] Decision 3: commit now or preserve the staged close artifacts for later.
11. [agent][Y] If committing, stage explicit files only and use `close(milestone): <directory-name> — <status>` plus the three trailers.
12. [agent][R] Finalize with one full-file `Write` (not Edit, MultiEdit, or Bash, so the bridge is never left half-updated if the close stops midway) to `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/milestone-next.md` after the catechism. Include `route: milestone`, `audit_slug` (a short label you chose for the audit, or `none` if it was skipped), `audit_run_id` (any id the reviewer returned, or `none`), terminal status, and a fresh timezone-qualified RFC 3339 `closed_at`.
13. [agent][G] Run a final parent-informed sweep: project status and useful playbook candidates.
14. [agent][R] Report close outcome as status, Criteria-met, Learnings count, bridge path, and next physical move.
15. [agent][Y] Preserve uncommitted close artifacts if the user skips the commit; name exactly what remains in the workdir.
16. [agent][G] If status is `complete`, verify that no criteria claim depends only on intent rather than evidence.
17. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Verification honesty** -- Compare every claimed criterion completion to evidence in the contract, tests, artifacts, or git history; report unsupported claims as findings.
2. [agent][R] **Parent informed** -- Produce the parent-project handoff: what changed, what remains open, and which next route is suggested.
3. [agent][G] **Classifier lesson** -- If the milestone changed altitude during work, record whether your folder and milestone classifier (if you keep one) would route it differently next time.
4. [agent][Y] **Independent blindspot audit (optional)** -- The second lens on base item 4. Have a reviewer with a different model lineage (or, failing that, a fresh subagent with no access to this conversation) audit close-CLAIM integrity: does every "done/delivered" claim match evidence in the contract/artifacts/git, are all open decisions and loops surfaced, is any completion resting on a single self-report, is the rollback real. Hand it the draft close report (if one exists) and keep a short slug for the run plus any run id the reviewer returns for the final bridge Write. Fold or refute each finding with evidence BEFORE the close is recorded; state the verdict (pass/concerns/fail) in the close output. The audit is read-only. If no independent reviewer is available, or it errors, record `skipped` and say so: independent coverage was NOT obtained.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] The work contract carries the criteria; the agent runs the completeness and reconcile checks and this pack reports findings and commit proposals.
2. [agent][R] The Learning Router in `_catechism-base.md` handles learning destinations.
3. [agent][R] Read the knowledge library's `INDEX.md` for prior closeout patterns before the catechism; apply only relevant patterns.
4. [agent][Y] Any scheduled job that harvests routed notes runs later; close does not run a separate promotion chain.
5. [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This pack handles deliberate close decisions only, and still presents its own scoped commit preview.
6. [agent][G] Git commit behavior follows explicit staging and the three close trailers; no silent `git add .`.
7. [agent][G] A verification gate, if you run one, may shadow completion claims; this pack records concrete evidence before final status regardless.

## BRIDGE
1. [agent][R] Close WRITES `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/milestone-next.md`; open READS the same file before classifier and scaffold steps.
2. [agent][R] Bridge schema: `route`, `workdir`, `directory_name`, `parent_project`, `status`, `criteria_met`, `learnings_count`, `next_physical_move`, `evidence_gaps`, `next_route_offer`, `audit_slug`, `audit_run_id`, `closed_at`.
3. [agent][R] Bridge is file-primary and ungated; any external mirror stays gated and can lag without blocking file continuity.
4. [agent][Y] On open, consume only what lowers activation energy: parent hint, slug hint, prior criteria, and next physical move.
5. [agent][Y] On close, include enough context for `/open session` or `/open milestone` to resume without re-reading the whole workdir.
6. [agent][R] If bridge file is missing, open proceeds from args and context clues; absence is noted, not treated as a blocker.
7. [agent][Y] If bridge points to a removed workdir, preserve the bridge text and create a fresh note with the new target path.
8. [agent][G] Bridge updates include source lines for files used during close when those sources influenced routing.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "Lighter tiers trim ceremony scope, never standards."
3. [agent][R] "Open hydrates existing context before adding ceremony."
4. [agent][R] "Close verifies, drains, and reduces scope before marking the milestone closed."
5. [agent][R] "File-primary bridge wins when mirrors disagree."
6. [agent][Y] "Reuse over rebuild; packs carry ordering, glue, and gotchas."
7. [agent][G] "Checkpoint automation is verified before it is promised."

## GOTCHAS
1. [agent][R] Fast repeated opens can collide even with second-level timestamps; suffix only `-2`, then `-3`, then ask for a different slug.
2. [agent][R] Current directory can look like task zoom; this route still creates a flat milestone surface and uses the existing path only as context.
3. [agent][R] A `pause` or `abandon` close is still a valid close status; it skips learning capture but still writes bridge, criteria state, and commit trailers when committing.
4. [agent][Y] Per-criterion checkpoint automation can exist in one setup and be absent in another; check that it is actually running before claiming criteria checkpoint automation.
5. [agent][G] External mirror drift never overrides file-primary milestone state; resolve by reading the workdir, contract, and bridge file, then proposing the mirror correction as a gated step.
6. [agent][R] Parent-project ambiguity can consume the second open decision quickly; combine title and project collection when possible.
