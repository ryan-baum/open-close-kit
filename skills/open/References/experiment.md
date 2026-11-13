# experiment — /open + /close
BLUF: Bottom Line Up Front: opens a small falsifiable experiment by naming the question, hypothesis, prediction, measure, and kill criteria before action.
Closes by comparing result to prediction, recording the verdict, filing supported findings, and harvesting surprise into the next test.
DECISION BUDGET: open=1 · close=1   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open experiment`, `/open ex`, or `/open exp`; aliases resolve in the router before this pack loads.
2. [agent][R] Args can name the experiment topic, question, target metric, artifact path, parent project, or current work context.
3. [agent][R] Open reads `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/experiment-next.md` (below, "the state dir" means that folder) before expanding context; absence is allowed.
4. [agent][R] The route is a lean glue pack: it stages hypothesis, prediction, measure, and kill criteria, then wires heavier investigation to a structured experiment-design workflow or to `research-project`.
5. [agent][R] The experiment is falsifiable enough that one observable result could change the next move.
6. [agent][R] File artifacts are primary; any external mirror is optional and gated.
7. [agent][Y] If the experiment belongs to a project, session, client, or research project, open hydrates that parent only enough to name the test boundary.
8. [agent][G] If several tests are plausible, prefer the smallest one that can change a decision and park the rest as alternatives.

### Steps
1. [agent][R] Hydrate the bridge first: prior question, prior prediction, evidence source, carried surprise, next physical move, and any parent context.
2. [agent][R] Normalize the opening into one compact card: question, hypothesis, prediction, measure, kill criteria, run window, and who owns the test.
3. [agent][R] Check falsifiability: name what observation would support, refute, or leave the hypothesis unresolved.
4. [USER-DECISION][R] If the question or hypothesis is unclear, offer up to three compact experiment frames and use the selected frame for the open card.
5. [agent][R] Define the prediction before the run: expected direction, threshold or observable marker, and when the comparison will happen.
6. [agent][R] Define kill criteria before the run: stop condition, evidence threshold, and the action that becomes available if the criterion is met.
7. [agent][R] Bound the bet before the run — four fields, one question each, none of them inferable after the result is visible: **guardrail** (the metric that must NOT move — a bet that can only be won is not a bet); **practical-significance bound** (the effect size that would justify the cost, set by what makes the change worth making, not by what is easiest to observe); **trust check** (what asserts the instrument was alive across the whole window — named at open, read BEFORE the result, and independent of the outcome it is vouching for: a check the result itself could satisfy is not a check); **cannot-establish** (one sentence naming a *specific* rival explanation or scope this window does not rule out — "it may not generalize" is boilerplate and does not count).
8. [agent][R] Record the experiment in `ARGUMENT-GRAPH.md` in the run folder (`${OPEN_CLOSE_WORK_DIR:-~/work}/<YYYYMMDD-HHMMSS_slug>/`); if the parent research project already has one, add to that file instead of starting a second. The question goes in as a question entry, the hypothesis as a claim beneath it, and the prediction as plain text on the claim. Leave an empty evidence slot until a result exists.
9. [agent][R] Name the evidence source that will count: local file, metric, transcript, test output, user observation, or explicit no-signal note.
10. [agent][R] Keep the first action physical and narrow: run the test, inspect the artifact, ask the source, or collect one measurement.
11. [agent][R] Write or refresh `<state dir>/experiment-next.md` with the open card and first action.
12. [agent][Y] Add one alternate hypothesis or null hypothesis when it will make the result easier to interpret.
13. [agent][Y] Add a counter-evidence lane so disconfirming observations have a named home before the run starts.
14. [agent][Y] If the test needs a structured protocol, hand it to a structured experiment-design workflow (goal, hypothesis, design, measurement, analysis, iteration) and keep this pack as the routing wrapper; the four bounding fields travel with the handoff.
15. [agent][G] Connect the experiment to a parent artifact path, project, or research graph only when that lowers restart cost.
16. [agent][G] Add a small review plan: evidence location, comparison time, close route, and what not to expand during the run.
17. [agent][R] Report the open outcome as question, hypothesis, prediction, kill criteria, the four bet bounds, evidence source, first action, bridge path, and any gated external-mirror proposals.
18. [agent][R] Close with: "You are set up. NMIT: <the next most important thing from this open>."

### Wiring
1. [agent][R] Router owns aliases `ex` and `exp`, bare-menu placement, and context clues; this pack owns only the experiment open and close ceremony.
2. [agent][R] A scientific-method workflow (goal, hypothesis, experiment design, measurement, analysis, iteration) supplies vocabulary when the test needs more than this lean wrapper.
3. [agent][R] The argument graph supplies the chain question -> claim -> evidence -> finding; the pack records placement in `ARGUMENT-GRAPH.md` and avoids heavy labeling.
4. [agent][R] If your setup runs SessionStart (or SessionEnd) hooks, they are complements: this pack does not duplicate them.
5. [agent][Y] The Learning Router in `_catechism-base.md` is used only on close, when reusable learnings need routing.
6. [agent][Y] A research workflow or the `research-project` route takes over if the experiment becomes prior-art work, source synthesis, or a long-running inquiry.
7. [agent][G] Git behavior remains a close proposal with explicit paths; open never stages a commit.

## CLOSE
### Preconditions
1. [agent][R] Target experiment resolves from args, current context, or `<state dir>/experiment-next.md`; if multiple targets remain, spend the single close decision.
2. [agent][R] Close needs an inspectable result, a named evidence source, or an explicit no-signal note; absence becomes a close finding.
3. [agent][R] The prediction and kill criteria from open are the comparison standard; close does not rewrite them after seeing the result.
4. [agent][R] Verdicts are allowed to be supported, refuted, inconclusive, not run, void, or continue-one-measure; each still produces a receipt. `not run` and `void` are different states and never substitute for each other: `not run` means the experiment never happened, `void` means it happened and its reading is inadmissible.
5. [agent][R] File receipt and bridge state are authoritative; any external mirror is a gated derivative.
6. [agent][Y] If the experiment touched a repository or artifact set, inspect local changes before proposing a scoped commit.
7. [agent][G] If the result suggests a larger inquiry, close records the handoff instead of expanding this route.

### Steps
1. [agent][R] Read the bridge, result source, open card, prediction, kill criteria, and any parent artifact before judging the outcome.
2. [agent][R] Run the admissibility pair BEFORE reading the result: apply the **trust check** captured at open — an instrument that was not alive across the whole window makes the reading inadmissible, and the verdict is `void`, never a weak result and never `not run` (the experiment did happen; only its reading is unusable) — then restate the **cannot-establish** sentence unchanged, so whatever comes next is read inside its stated limit.
3. [agent][R] Compare actual result to prediction using the measure named at open, and against the **practical-significance bound**: an effect that beats the prediction but misses the bound is a null result, not a win. Report source, observed time when known, and uncertainty.
4. [agent][R] Apply the kill criteria and the **guardrail** as written — report the guardrail's actual movement whichever way it went — and separate result, interpretation, and next action.
5. [agent][R] Classify the verdict as supported, refuted, inconclusive, not run, void, or continue-one-measure.
6. [agent][R] Harvest surprise: name what happened that the prediction did not anticipate and whether it changes the next hypothesis.
7. [USER-DECISION][R] If verdict or next action remains ambiguous after evidence review, offer up to three choices: accept verdict, run one more measure, or route to `research-project`.
8. [agent][R] File a finding (in the Findings section of `ARGUMENT-GRAPH.md`) only when evidence supports it; otherwise keep the item as a claim, evidence gap, or carried question.
9. [agent][R] Draft an experiment receipt with question, hypothesis, prediction, result, verdict, kill-criteria outcome, guardrail movement, practical-significance bound and whether the effect cleared it, trust-check outcome, cannot-establish sentence, surprise, finding threshold, and next physical move.
10. [agent][R] Run the installed catechism base plus route extensions below; the agent performs sweeps first and reports findings, proposals, and skips.
11. [agent][R] Use the Learning Router in `_catechism-base.md` for reusable findings, playbook candidates, and skill gotchas.
12. [agent][R] Write `<state dir>/experiment-next.md` with the receipt digest, next hypothesis or stop note, open question, and next physical move.
13. [agent][Y] Build a scoped commit proposal as a dry run when files changed (list the files this session wrote, per repo, with a message): experiment receipt, bridge, result artifact, and any parent note touched. Never push; committing is a separate gated step.
14. [agent][Y] Stage no commit automatically; present the proposal and skip reason when committing is not useful.
15. [agent][G] Compare the result against any alternate hypothesis or null hypothesis parked at open.
16. [agent][G] Add a follow-up experiment only if it is smaller than the new question and has its own prediction.
17. [agent][R] Report close outcome as verdict, evidence source, surprise, filed finding or skip reason, bridge path, learning routes, and any gated external-mirror proposals.
18. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Prediction check** -- Compare the result to the exact prediction captured at open and state whether the prediction held, failed, or stayed unresolved.
2. [agent][R] **Kill criteria honesty** -- Apply the pre-run stop condition without moving the threshold after the result is visible.
3. [agent][R] **Bet-bounds honesty** -- Report the guardrail's actual movement whichever way it went, the trust check's outcome before the verdict, and the cannot-establish sentence unchanged from open. A guardrail reported only when it stayed put is not a guardrail, and a bound rewritten to fit the effect is not a bound.
4. [agent][R] **Surprise harvest** -- Extract one reusable surprise, contradiction, or null result and route it as a finding, claim, or carried question.
5. [agent][Y] **Evidence threshold** -- Verify that every proposed finding has a named evidence source; unsupported statements remain claims or questions.
6. [agent][Y] **Next-test compression** -- Reduce the next experiment to one question, one prediction, one measure, and one first action.
7. [agent][G] **Protocol reuse** -- Identify any test template, metric, or interpretation rule worth routing through the Learning Router.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] A scientific-method workflow supplies analysis and iteration language; this pack supplies the close ritual, decision budget, and bridge.
2. [agent][R] The Learning Router in `_catechism-base.md` is the only learning-routing table; it is never rebuilt here.
3. [agent][R] If you run a periodic harvest or promotion job over your notes, it may process routed artifacts later; close creates findable receipts and findings only.
4. [agent][R] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them.
5. [agent][Y] Git proposals use explicit paths only: receipt, bridge, result artifact, parent note, and no unrelated files.
6. [agent][Y] Route to `research-project` when the result creates a broader evidence graph, source review, or multi-question inquiry.
7. [agent][G] Future automation may inspect experiment receipts, but any write to an external mirror still requires a gate.

## BRIDGE
1. [agent][R] Close WRITES `<state dir>/experiment-next.md`; open READS the same file before framing a new test.
2. [agent][R] Bridge schema: `route`, `experiment_id`, `parent_context`, `question`, `hypothesis`, `prediction`, `measure`, `kill_criteria`, `guardrail`, `practical_significance_bound`, `trust_check`, `cannot_establish`, `evidence_source`, `verdict`, `surprise`, `finding_or_skip`, `next_hypothesis`, `next_physical_move`, `closed_at`.
3. [agent][R] The bridge is file-primary and ungated; external mirrors, if any, remain gated and may lag without blocking the next open.
4. [agent][R] Open consumes only activation-lowering fields: question, next hypothesis, prior surprise, evidence source, and next physical move.
5. [agent][Y] Close includes enough result context for `/open experiment`, `/open session`, or `/open research-project` to resume without rebuilding the reasoning.
6. [agent][Y] If the bridge points to a missing evidence artifact, preserve the receipt summary and mark the evidence source as needing lookup.
7. [agent][G] Historical receipts belong beside the parent artifact or notes destination; the active bridge keeps only the next restart handle.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "The [R] subset uses no more than one user decision."
3. [agent][R] "Open captures hypothesis, prediction, measure, kill criteria, and the four bet bounds — guardrail, practical-significance bound, trust check, cannot-establish — before action."
4. [agent][R] "Close compares result to the pre-run prediction before interpretation."
5. [agent][R] "A finding needs evidence; otherwise the item stays a claim, question, or gap."
6. [agent][Y] "Lighter tiers trim ceremony scope, never standards."
7. [agent][Y] "File-primary bridge wins when mirrors disagree."
8. [agent][G] "Reuse over rebuild: the pack carries ordering, glue, gates, and gotchas."

## GOTCHAS
1. [agent][R] A hypothesis without a prediction leaves close with no comparison standard; open captures the expected observation before the run.
2. [agent][R] Kill criteria written after the result can smuggle interpretation into the threshold; close applies the pre-run criterion as captured.
3. [agent][R] Filing a finding without a named evidence source turns an experiment into note pollution; unsupported outputs stay as claims, questions, or gaps.
4. [agent][Y] Over-building the graph defeats the lean route; if the test needs many sources or questions, hand off to `research-project`.
5. [agent][G] Surprise can be more valuable than verdict; close harvests it even when the result is inconclusive or no-signal.
