# skill — /open + /close
BLUF: Bottom Line Up Front: this is a routing-only glue pack for skill lifecycle work. Open delegates scaffold, validation, and test sequencing to your skill-authoring workflow (for example Anthropic's `skill-creator` skill); close delegates test, description tuning, and layout/documentation consistency to it.
DECISION BUDGET: open=1 · close=1   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open skill` or `/open sk`; aliases resolve in the router before this pack loads.
2. [agent][R] Required input is a skill name, skill intent, or existing skill path; if absent, use the bridge and current work context before asking.
3. [agent][R] This pack does not scaffold directly; your skill-authoring workflow (for example Anthropic's `skill-creator` skill: scaffold, validate, test with-skill against a baseline, tune the description) owns scaffold, validation, structure cleanup, test, improvement, and description tuning. Below, "the skill-authoring workflow" means that.
4. [agent][R] Open sequence is routing-only: scaffold, then validate, then test, all through the skill-authoring workflow.
5. [agent][R] `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/skill-next.md` (below, "the state dir" means that folder) is the file-primary bridge; absence is allowed.
6. [agent][Y] Use a work contract (`CONTRACT.md` in the run folder, `${OPEN_CLOSE_WORK_DIR:-~/work}/<YYYYMMDD-HHMMSS_slug>/`) only when the skill effort is large enough to need explicit criteria or a work surface.
7. [agent][Y] Use a repeatable evaluation harness (your own eval scripts, or the with-skill versus baseline runs of the skill-authoring workflow) only when behavior needs repeatable model, prompt, or system checks beyond the workflow's test step.
8. [agent][G] Use a document review (a clarity pass over the plan or documentation) only when the skill plan or documentation surface needs it.

### Steps
1. [agent][R] Read `<state dir>/skill-next.md` if present, then hydrate only skill name, target path, prior test state, and next physical move.
2. [agent][R] Resolve the target from args, current directory, bridge file, or known skill roots; if multiple plausible targets remain, prepare one compact choice.
3. [USER-DECISION][R] Choose the target only when evidence cannot disambiguate: new skill name, existing skill path, or defer with a smaller discovery pass.
4. [agent][R] Delegate scaffold creation (or the update of an existing skill) to the skill-authoring workflow; pass a compressed intent packet rather than full source dumps.
5. [agent][R] Delegate validation through the skill-authoring workflow and report only blocking findings, explicit skips, and files to inspect.
6. [agent][R] Delegate testing through the skill-authoring workflow after validation so scaffold defects are not hidden by test noise.
7. [agent][R] Write or update `<state dir>/skill-next.md` with route, skill name, target path, validation state, test state, and next physical move.
8. [agent][R] Report open outcome as target, delegated workflow order, current blocker if any, and first next move.
9. [agent][Y] If a work contract exists, link the skill work to its criteria without recreating contract logic inside this pack.
10. [agent][Y] If repeatable behavior checks are needed, hand the test question to the evaluation harness and keep the result as evidence for the test step.
11. [agent][Y] If prior learning or playbook context is needed, read the knowledge library's `INDEX.md` for skill-authoring patterns before changing scope.
12. [agent][Y] If documentation quality is the blocker, route the document surface to a document review and return with findings.
13. [agent][G] If the skill has personal customizations kept separately, note their path and keep personal context out of generic scaffold assumptions.
14. [agent][G] If the skill belongs in a plugin or private namespace, name the namespace rule and hand it to the skill-authoring workflow rather than deciding here.
15. [agent][G] If the open reveals a larger product or route problem, offer the next route instead of expanding this glue pack.
16. [agent][G] Keep all generated status short enough to become the next close bridge without re-summarizing.
17. [agent][R] Close with: "You are set up. NMIT: <the next most important thing from this open>."

### Wiring
1. [agent][R] Router handles aliases `sk`, bare-menu placement, and direct invocation; this pack handles only skill lifecycle ordering.
2. [agent][R] The skill-authoring workflow owns scaffold, validation, test, improvement, description tuning, and structure cleanup.
3. [agent][R] If your setup runs hooks that observe outputs (documentation integrity, completion-claim checks), they are complements: this pack does not duplicate them.
4. [agent][Y] A work contract supplies criteria only when the effort is large enough to justify one.
5. [agent][Y] The evaluation harness supplies repeatable behavior checks when the test step needs a stronger harness.
6. [agent][Y] The knowledge library (`_knowledge.md`) supplies prior skill-authoring patterns; retrieved material is context, not automatic scope.
7. [agent][G] A document review supplies clarity review for planning or documentation surfaces.
8. [agent][R] The Learning Router in `_catechism-base.md` is used only at close, for learning routing.

## CLOSE
### Preconditions
1. [agent][R] Target skill resolves from args, current directory, `<state dir>/skill-next.md`, or visible changed files; if multiple remain, ask one target choice.
2. [agent][R] Close sequence is routing-only: test, then description tuning, then layout and documentation consistency.
3. [agent][R] Close can run for a new skill, repaired skill, description-only change, or deferred skill proposal.
4. [agent][R] Git is inspected only when the skill lives in a repository; unrelated changes stay outside the close proposal.
5. [agent][Y] Consistency checks use your skill conventions (directory naming, frontmatter, description rules, progressive disclosure; for Claude Code, Anthropic's skills documentation), the skill-authoring workflow's output, and the changed skill files as evidence.
6. [agent][Y] If the test step cannot run, close reports the blocker and still writes a next-open bridge.
7. [agent][G] If the skill effort expanded into product work, close records the route mismatch and offers a follow-on route.

### Steps
1. [agent][R] Resolve the skill name, path, changed files, workflow outputs, and current lifecycle state from visible evidence.
2. [agent][R] Delegate the test (with-skill against a baseline) to the skill-authoring workflow; report pass, fail, skipped, or blocked with evidence.
3. [agent][R] Delegate description tuning to the skill-authoring workflow; ensure description output stays single-line and activation-focused.
4. [agent][R] Run layout and documentation consistency checks against your skill conventions: directory name, `SKILL.md`, description length, a clear when-to-use trigger, and progressive disclosure.
5. [agent][R] Run the installed catechism base plus skill extensions below; the agent performs the sweeps first and reports findings, proposals, and skips.
6. [agent][R] Use the Learning Router in `_catechism-base.md` to route reusable skill learnings or gotchas.
7. [USER-DECISION][R] Offer one close choice only when needed: accept the proposed close state, choose a smaller follow-up, or keep the skill in draft.
8. [agent][R] Write `<state dir>/skill-next.md` with close state, test state, description state, consistency findings, and next physical move.
9. [agent][R] Report close outcome as skill path, test state, description state, consistency state, learning routes, bridge path, and next move.
10. [agent][Y] If the skill's layout needs cleaning up to your conventions, delegate it to the skill-authoring workflow and re-run only the affected consistency checks.
11. [agent][Y] If test findings recommend an improvement pass, keep it as a follow-up proposal unless the current close scope already included repair.
12. [agent][Y] Build a scoped commit proposal as a dry run (list the files this session wrote, per repo, with a message), only for touched skill files, bridge notes, and explicitly related documentation. Never push; committing is a separate gated step.
13. [agent][Y] If committing is useful, propose a message such as `close(skill): <skill-name>` with test and description evidence.
14. [agent][G] If evaluation evidence exists, attach the evaluation result path or summary to the close report.
15. [agent][G] If a documentation mismatch remains, record it as a named follow-up rather than treating the whole close as invalid.
16. [agent][G] If no material changes exist, close with a no-change receipt and preserve the next-open bridge.
17. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Test result** -- Verify the latest skill test result is named as pass, fail, skipped, or blocked with evidence and owner.
2. [agent][R] **Description tuning** -- Verify description tuning ran or was explicitly skipped with reason; keep the final description single-line and activation-focused.
3. [agent][R] **Layout consistency** -- Check skill directory name, `SKILL.md`, when-to-use trigger, description length, and progressive disclosure against your skill conventions.
4. [agent][Y] **Workflow surface** -- Confirm validation, test, improvement, description-tuning, and structure-cleanup steps are routed through the skill-authoring workflow, not copied here.
5. [agent][Y] **Gotcha promotion** -- Identify any skill-authoring failure mode worth adding to the changed skill's gotchas or to a reusable playbook through the Learning Router.
6. [agent][G] **Evaluation handoff** -- If behavior needs repeatable checks, record the evaluation handoff and the smallest useful test question.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] The skill-authoring workflow owns the test, description tuning, structure cleanup, and repair recommendations.
2. [agent][R] Your skill documentation owns naming, frontmatter, description, and progressive-disclosure rules; this pack only checks consistency.
3. [agent][R] If your setup runs hooks that observe documentation changes or completion claims, they are complements: this pack does not duplicate them.
4. [agent][R] This pack reports evidence before claiming close state.
5. [agent][Y] The evaluation harness is optional evidence support when the test step needs repeatable behavioral coverage.
6. [agent][Y] The knowledge library and the skill-authoring workflow's own test guidance can supply context before route-specific lessons are applied.
7. [agent][Y] The Learning Router in `_catechism-base.md` is the only learning-routing table; it is never rebuilt here.
8. [agent][G] Git commit proposals name exact files and skip unrelated changes.

## BRIDGE
1. [agent][R] Close WRITES `<state dir>/skill-next.md`; open READS the same file before target resolution.
2. [agent][R] Bridge schema: `route`, `skill_name`, `skill_path`, `lifecycle_state`, `validation_state`, `test_state`, `description_state`, `consistency_findings`, `learning_routes`, `next_physical_move`, `closed_at`.
3. [agent][R] The bridge is file-primary and ungated; external mirrors, if any, remain gated and can lag without blocking continuity.
4. [agent][R] Open consumes only activation-lowering fields: skill name, path, prior workflow state, blocker (if close recorded one), and next physical move.
5. [agent][Y] Close includes enough context for `/open skill`, `/open session`, or `/open project` to resume without re-reading the whole effort.
6. [agent][Y] If bridge and an external mirror disagree, the bridge wins for the next open.
7. [agent][G] If the bridge points to a missing skill path, preserve the note and record a fresh lookup gap.
8. [agent][G] Bridge content stays compact; long test logs belong with the skill or workflow output.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "The [R] close subset uses no more than one user decision."
3. [agent][R] "Reuse over rebuild: the skill-authoring workflow owns lifecycle workflows; this pack owns ordering and handoff."
4. [agent][R] "Open hydrates existing context before adding ceremony."
5. [agent][R] "Close verifies test, description, and consistency before landing the skill."
6. [agent][Y] "Lighter tiers trim ceremony scope, never standards."
7. [agent][Y] "File-primary bridge wins when mirrors disagree."
8. [agent][G] "Skill lifecycle findings become gotchas or Learning Router candidates only when evidence supports reuse."

## GOTCHAS
1. [agent][R] Duplicating the skill-authoring workflow's internals here creates a second skill lifecycle system; this route is ordering glue only.
2. [agent][R] Running the test before validation can turn scaffold defects into noisy behavior failures.
3. [agent][R] A description can pass locally but still fail activation expectations if the when-to-use trigger is vague or the line is too long.
4. [agent][R] Consistency is a documentation contract, not a mirror contract; do not create external-mirror work to compensate for file issues.
5. [agent][Y] A repeatable evaluation harness can become a scope expansion; use it only when the test step needs repeatable evidence beyond the lifecycle workflow.
6. [agent][Y] A work contract is useful for larger skill efforts, but small description or validation work should stay inside the skill-authoring workflow.
7. [agent][Y] Hook-owned checks (documentation integrity, completion-claim verification) should be named as evidence support, not reimplemented in this pack.
8. [agent][G] Skill work can turn into project work; when criteria, stakeholders, or multiple milestones appear, offer `/open project` instead of expanding this route.
