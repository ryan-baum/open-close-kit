# research-project — /open + /close
BLUF: Bottom Line Up Front: opens a research project as a placement-first argument graph with a prior-art scan plan and sequential strategy.
Closes by verifying the graph, producing a synthesis note, filing sources, and carrying open questions into the next opening.
DECISION BUDGET: open=2 · close=2   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open research-project`, `/open rp`, or `/open research`; aliases resolve in the router before this pack loads.
2. [agent][R] Required input is a research project name or current work context plus at least one active question; if missing, spend the first open decision on a compact offer set.
3. [agent][R] Open reads `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/research-project-next.md` (below, "the state dir" means that folder) before expanding context; absence is non-fatal.
4. [agent][R] The working model is a placement-first argument graph: where an entry sits (which question, which claim) carries the spine; typed labels are added only to entries a future query needs.
5. [agent][R] The argument graph is a plain file, `ARGUMENT-GRAPH.md`, in the run folder (`${OPEN_CLOSE_WORK_DIR:-~/work}/<YYYYMMDD-HHMMSS_slug>/`): claims, evidence, objections, and open questions. It is the primary artifact; any external mirror is optional and gated.
6. [agent][R] Do not treat a read-mostly source as a research project; if the object is mainly for reading, offer the `brief` route or a source workflow instead of building a graph.
7. [agent][Y] Existing notes, source manifests, prior research, and project files are read before proposing new graph structure.
8. [agent][Y] If duplicate research-project roots are plausible (two folders or graph files for the same project), resolve the canonical root before any cross-linking or merging.
9. [agent][G] If a local project directory exists, preserve its files as primary evidence and keep the graph a derived view over them.

### Steps
1. [agent][R] Hydrate the bridge first: project root, prior scan status, top open question, source manifest path, next physical move, and evidence gaps.
2. [agent][R] Classify the object as an interrogated body of work, not a read-mostly source; if this fails, offer the nearest route and stop before graph planning.
3. [agent][R] Search visible files, recall (search recent session transcripts, run folders, contract titles and `git log`), and your knowledge notes for prior research, prior art, source lists, and existing synthesis; return a short manifest instead of a broad prose summary.
4. [agent][R] Detect duplicate project roots by title, aliases, local paths, and existing graph files in other run folders; mark root selection as blocking before any cross-linking or merging.
5. [USER-DECISION][R] If the canonical root or lead question is ambiguous, offer up to three choices: use current root, pick an existing root, or start file-first with a fresh `ARGUMENT-GRAPH.md` in a new run folder.
6. [agent][R] Build the sequential strategy: first query, source batch, evidence standard, stop condition, and the next review point.
7. [agent][R] Reserve a counter-evidence lane in the scan plan so refuting material has a named home before supporting material accumulates.
8. [agent][R] Sketch the placement spine in `ARGUMENT-GRAPH.md` with these sections in order: Questions (each question its own sub-heading), claims or hypotheses nested beneath their question, evidence lines nested beneath their claim (source plus stance: supports, refutes, or neutral), Findings (promoted only when support exists), Objections (the counter-evidence lane), and Open questions.
9. [agent][Y] Add explicit labels only where the future query needs them: short ids (Q1, C1, E1) so a search can follow evidence to its claim and a claim to its question, an explicit evidence type, and any locked decision anchor.
10. [agent][Y] Draft a source manifest (for example `SOURCES.md` in the run folder) with source title, path or URL, claim touched, evidence stance, and provenance note.
11. [USER-DECISION][Y] If more than one sequential strategy is viable, choose one: broad prior-art sweep, narrow refutation-first pass, or synthesis-first pass over known sources.
12. [agent][Y] Write or refresh a file-primary open note under the active research surface or bridge path with strategy, first source, and next physical move.
13. [agent][G] Add an optional drift-check plan: questions with no claims, evidence with no claim, findings that cite no evidence, and sources with no provenance.
14. [agent][G] If it helps, add at most one explicit warrant (why the evidence supports the claim) to one top finding in `ARGUMENT-GRAPH.md`; keep it optional.
15. [agent][R] Report the open outcome as root, lead question, first scan action, source manifest path, and any gated external-mirror proposals.
16. [agent][R] Close with: "You are set up. NMIT: <the next most important thing from this open>."

### Wiring
1. [agent][R] Router owns aliases `rp` and `research`, bare-menu placement, and context clues; this pack owns the research ceremony.
2. [agent][R] A research workflow (your deep-research or multi-source search tooling, if you have one) handles prior-art search, source gathering, and claim-checking; this pack supplies ordering, budgets, and graph gates.
3. [agent][R] The scientific method (hypothesis, prediction, test, verdict) supplies the language when the research project has experiment-shaped forks; the `experiment` route is the lean wrapper for those.
4. [agent][Y] The Learning Router in `_catechism-base.md` is used only when close routes learnings through it.
5. [agent][Y] If your setup runs SessionStart (or SessionEnd) hooks, they are complements: this pack does not duplicate them.
6. [agent][G] Future automation may generate source manifests or drift checks, but external mirrors remain gated and the files stay primary.

## CLOSE
### Preconditions
1. [agent][R] Target research project resolves from args, current directory, bridge file, source manifest, or active work context; if multiple remain, spend one target decision and stop guessing.
2. [agent][R] Close requires at least one inspectable evidence source, source manifest, or explicit evidence-gap note; absence is reported as a close finding.
3. [agent][R] The graph may close a pass without exhausting the inquiry; open questions can be carried as first-class outputs.
4. [agent][R] File artifacts lead: synthesis note, source manifest, project files, and bridge state outrank any derived external mirror.
5. [agent][R] Updates to `ARGUMENT-GRAPH.md` are direct file edits; this pack writes to no external mirror, and any mirror update is a described proposal awaiting a gate.
6. [agent][Y] If conclusions depend on contested evidence, close requires a refutation audit before synthesis language is finalized.
7. [agent][G] If git is present, commit behavior is a proposal with explicit file scope; no silent broad staging.

### Steps
1. [agent][R] Resolve the target root, source manifest, existing synthesis note, and bridge file; name any missing evidence source.
2. [agent][R] Audit the epistemic chain in `ARGUMENT-GRAPH.md`: questions, claims or hypotheses, evidence, findings, and any conclusion pointer.
3. [USER-DECISION][R] Choose the close posture if needed: finalize current pass, park with carried questions, or continue one named source before close.
4. [agent][R] Verify each top finding against cited evidence; downgrade unsupported conclusions into open questions or evidence gaps.
5. [agent][R] Audit counter-evidence: confirm refuting material is visible, named, and not hidden behind a supporting default.
6. [agent][R] Finalize the graph at the current pass level: top findings promoted, weak claims left as claims, unresolved questions preserved.
7. [agent][R] Draft the synthesis note with four parts: findings, evidence basis, limits, and open questions carried.
8. [agent][R] File sources in the manifest with provenance, stance, and which claim or question each source informs.
9. [agent][R] Run the installed catechism base plus route extensions below; agent performs sweeps first and reports findings, proposals, and skips.
10. [agent][R] Use the Learning Router in `_catechism-base.md` for reusable findings and playbook candidates.
11. [agent][Y] Build a scoped commit proposal as a dry run when local files changed (list the files this session wrote, per repo, with a message): synthesis note, source manifest, graph file, bridge, and any project-local research files. Never push; committing is a separate gated step.
12. [USER-DECISION][Y] Choose whether to accept the synthesis note as written or request one short revision before the close report.
13. [agent][R] Finalize with one full-file `Write` (not Edit, MultiEdit, or Bash, so the bridge is never left half-updated if the close stops midway) to `<state dir>/research-project-next.md` after the catechism. Include `route: research-project`, `audit_slug` (a short label you chose for the audit, or `none` if it was skipped), `audit_run_id` (any id the reviewer returned, or `none`), and a fresh timezone-qualified RFC 3339 `closed_at`.
14. [agent][G] Stage a maintenance-loop note for the next pass: dangling evidence, unresolved questions, findings needing a second look at their evidence, and source gaps.
15. [agent][R] Report close outcome as synthesis path, top findings count, carried questions count, source manifest path, bridge path, and any gated external-mirror proposals.
16. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Evidence sufficiency** -- Compare each promoted finding to cited evidence and name unsupported or under-sourced claims as findings.
2. [agent][R] **Open questions carried** -- Verify every still-open question has a home in the synthesis note, bridge, or next scan plan.
3. [agent][R] **Source filing** -- Check that every source used in synthesis appears in the source manifest with provenance and stance.
4. [agent][Y] **Graph integrity** -- Inspect placement drift, duplicate roots, dangling ids (an evidence line pointing at a claim that does not exist), and findings that cite no evidence before finalizing the graph file.
5. [agent][Y] **Refutation audit** -- Surface counter-evidence and stance assumptions before finalizing conclusions.
6. [agent][G] **Maintenance loop** -- Propose a future drift check only when it reduces graph upkeep load; otherwise state that file-primary carry-forward is enough.
7. [agent][Y] **Independent blindspot audit (optional)** -- The second lens on base item 4. Have a reviewer with a different model lineage (or, failing that, a fresh subagent with no access to this conversation) audit close-CLAIM integrity: does every "done/delivered" claim match evidence in the contract/artifacts/git, are all items waiting on the user surfaced, is any completion resting on a single self-report, is the rollback real. Hand it the draft close report (if one exists) and keep a short slug for the run plus any run id the reviewer returns for the final bridge Write. Fold or refute each finding with evidence BEFORE the close is recorded; state the verdict (pass/concerns/fail) in the close output. The audit is read-only. If no independent reviewer is available, or it errors, record `skipped` and say so: independent coverage was NOT obtained.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] A research workflow handles source completeness, prior-art coverage, and synthesis support; this pack carries the close ritual and gates.
2. [agent][R] The scientific method supplies verdict language when a hypothesis or experiment is being closed inside the research project.
3. [agent][R] The Learning Router in `_catechism-base.md` is the only learning-routing table; it is never rebuilt here.
4. [agent][Y] If you run a periodic harvest or promotion job over your notes, it may process routed artifacts later; close creates findable artifacts and does not run promotion chains itself.
5. [agent][Y] Git proposals use explicit paths only: synthesis note, manifest, graph file, bridge, and project-local research files.
6. [agent][G] Future graph-drift automation may inspect the query-bearing parts of the graph file; it must not write to an external mirror from this pack.

## BRIDGE
1. [agent][R] Close WRITES `<state dir>/research-project-next.md`; open READS the same file before source search or strategy expansion.
2. [agent][R] Bridge schema: `route`, `project_name`, `canonical_root_hint`, `local_surface`, `synthesis_note`, `source_manifest`, `top_findings`, `open_questions`, `evidence_gaps`, `next_source`, `next_query`, `next_physical_move`, `audit_slug`, `audit_run_id`, `closed_at`. `local_surface` is the run folder that holds `ARGUMENT-GRAPH.md`.
3. [agent][R] Bridge is file-primary and ungated; external mirrors, if any, remain gated and may lag without blocking the next open.
4. [agent][R] Open consumes only what lowers activation energy: root hint, lead question, next source, and next physical move.
5. [agent][Y] Close includes enough evidence context for `/open research-project` or `/open session` to resume without rebuilding the scan plan.
6. [agent][Y] If the bridge points to a stale root, preserve the text, mark the root as needs lookup, and proceed file-first.
7. [agent][G] Historical synthesis notes belong in project notes or source manifests; the active bridge keeps only the next restart handle.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "The [R] path uses no more than one `[USER-DECISION]` step."
3. [agent][R] "Lighter tiers trim ceremony scope, never standards."
4. [agent][R] "Open hydrates existing context before adding ceremony."
5. [agent][R] "Close verifies, drains, and reduces scope before declaring the research pass landed."
6. [agent][R] "Placement carries the argument spine; typed labels serve only entries a query needs."
7. [agent][Y] "File-primary bridge wins when mirrors disagree."
8. [agent][G] "Reuse over rebuild; packs carry ordering, glue, and gotchas."

## GOTCHAS
1. [agent][R] Duplicate project roots (two folders or graph files for the same project) must be resolved before any cross-linking or merging; wiring up the wrong root creates a later re-migration.
2. [agent][R] Evidence stance can silently invert if counter-evidence is not named; explicitly surface refuting material and audit the stance before synthesis.
3. [agent][Y] Over-labeling every assertion with typed attributes turns the graph into bureaucracy; keep most entries as plain text under the right heading and add labels only for real queries.
4. [agent][Y] Placement drift can make a graph readable but not queryable; close should inspect moved entries and carry drift checks only where useful.
5. [agent][Y] Source-like objects should stay source-like; building a research-project graph for read-mostly material imports unnecessary graph upkeep.
6. [agent][G] Agent-authored questions, claims, and evidence entries may carry no authorship marker; mark who wrote or proposed each entry (for example `by: agent` or `by: user`) and prefer staged wording and provenance notes over pretending the graph is the user's own.
