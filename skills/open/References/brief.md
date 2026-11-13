# brief — /open + /close
BLUF: Opens a personal brief with typed intake, evidence manifest, and claim-check BEFORE generation; closes with a receipt packet that proves what changed, what claims were used, and what remains unknown.
DECISION BUDGET: open=2 · close=1   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open brief` or `/open b`; aliases resolve in the router before this pack loads.
2. [agent][R] Args can name the brief topic, audience, target artifact, or source path; absent args start from the bridge and current work context.
3. [agent][R] Open produces a `brief_input` intake packet before any claim-bearing draft or artifact work begins.
4. [agent][R] `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/brief-next.md` (below, "the state dir" means that folder) is the file-primary bridge; absence is allowed.
5. [agent][R] Nothing outside local files is needed to open; any external mirror stays gated.
6. [agent][Y] Source paths, notes, prior claims, and evidence references are read only when they lower activation cost for this brief.
7. [agent][Y] If factual claims will be made, at least one source or explicit unknown is captured before generation.
8. [agent][G] If multiple output shapes are plausible, keep the default as an intake packet plus first draft plan, then offer alternatives.
9. [agent][R] The typed wrapper (an intake packet carrying a route manifest) is a shape, not a vocabulary; no tokens from any other system are imported.

### Steps
1. [agent][R] Read `<state dir>/brief-next.md` if present, then hydrate only topic, audience, source hints, open unknowns, and the next physical move.
2. [agent][R] Build a minimal `brief_input` with `brief_id`, `opened_at`, `owner`, `task_type`, `audience`, `decision_needed`, `target_artifact`, `deadline_or_cadence`, `risk_tier`, `allowed_outputs`, `source_refs`, `evidence_refs`, `claim_refs`, `context_refs`, and `unknowns`.
3. [agent][R] Declare a route manifest inside the packet: route, reads, writes or outputs, evidence need, determinism, energy tier, and claim policy.
4. [USER-DECISION][R] If the brief goal is unclear, ask one compact choice: choose audience plus target artifact, or accept the agent-proposed default from context.
5. [agent][R] Collect the evidence manifest before generation: source reference, source type, observed time when known, locator, evidence type, supported claim or question, access note, and staleness limit.
6. [agent][R] Run claim-check BEFORE generation by classifying each planned assertion as existing claim, new claim candidate, unsupported claim, judgment, or unknown.
7. [agent][R] Move unsupported factual claims into `unknowns` or a clearly marked proposal draft; do not present them as finished copy.
8. [agent][R] Run the absence check: name missing information that would change the brief, then decide whether the uncertainty is acceptable for this pass.
9. [agent][R] Define done before drafting: artifact type, acceptance checks, must-include items, must-exclude items, citation rule, review owner, close receipt need, and learning capture need.
10. [agent][Y] If sources are stale or partial, add qualifiers to the brief plan rather than expanding research automatically.
11. [agent][Y] If the output can be produced as a proposal envelope, separate proposed text from accepted facts and cite the read set.
12. [USER-DECISION][Y] If two materially different brief directions remain, offer up to three options with consequences and keep the recommended option first.
13. [agent][Y] Write or update the file-primary intake at `<state dir>/brief-next.md` with the wrapper, manifest, claim-check, absence check, and done definition.
14. [agent][G] Run a quick source locator sweep for explicitly named files, notes, or URLs; record unavailable sources as unknowns instead of blocking open.
15. [agent][G] Add a lightweight review plan for higher-risk briefs: who reviews, what evidence must be visible, and what cannot ship without a close receipt.
16. [agent][G] Report the open result as topic, audience, artifact, sources found, claims needing proof, unknowns, and first physical move.
17. [agent][R] Close with: "You are set up. NMIT: <the next most important thing from this open>."

### Wiring
1. [agent][R] Router handles aliases `b`, bare-menu placement, and deterministic context clues; this pack handles only brief ceremony.
2. [agent][R] Claim-check and evidence manifest run before generation; downstream writing skills receive the checked packet as input.
3. [agent][Y] Recall (search recent session transcripts, run folders, contract titles and `git log`), local file reads, and source-specific tools may gather evidence, but the route manifest records what was read.
4. [agent][Y] If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them.
5. [agent][G] Git is optional; if a brief artifact lives in a repository, commit behavior remains an explicit close proposal.
6. [agent][R] The Learning Router in `_catechism-base.md` is used only at close for learning routing, not during open intake.

## CLOSE
### Preconditions
1. [agent][R] Target brief resolves from args, current artifact path, or `<state dir>/brief-next.md`; if multiple targets remain, ask one target choice before close.
2. [agent][R] Close can run for shipped, paused, superseded, or proposal-only briefs; each still receives a receipt packet.
3. [agent][R] The open `brief_input` is preferred, but close still runs from visible sources and artifact paths if intake is absent.
4. [agent][R] Evidence, claim, and unknown lists are checked before any completion statement.
5. [agent][R] No external mirror is written by default; any such write is a gated preview.
6. [agent][Y] Git status is inspected when an artifact lives in a repository; unrelated changes stay outside the close proposal.
7. [agent][G] If the brief produced no artifact, close records a negative receipt with search scope and reason.

### Steps
1. [agent][R] Identify the brief ID, artifact paths, source refs used, evidence refs used, claim refs used, and open unknowns from the intake, artifact, and local context.
2. [agent][R] Produce a `brief_receipt` with `brief_id`, `closed_at`, `artifact_paths`, `work_performed`, `source_refs_used`, `evidence_refs_used`, `claim_refs_used`, `claim_candidates_made`, `unknowns_remaining`, `decisions_made`, owner review note, and digest.
3. [agent][R] Attach an evidence-used manifest that maps final claim-bearing text to sources, evidence, qualifiers, and any correction or lineage notes available.
4. [agent][R] Verify final claims as proved, qualified, judgment, unknown, or remove-before-publish; name the evidence source or absence for each factual claim.
5. [agent][R] Record negative receipts where evidence was sought and not found: search scope, searched time, source set, and result set.
6. [USER-DECISION][R] Offer one close choice when needed: accept the receipt status or choose a supported status such as shipped, paused, superseded, or proposal-only.
7. [agent][R] Run the installed catechism base plus route extensions below; the agent performs the sweeps first and reports findings, proposals, and skips.
8. [agent][R] Run the Learning Router in `_catechism-base.md` and route reusable brief learnings, playbook candidates, source additions, and claim promotions.
9. [agent][R] Write `<state dir>/brief-next.md` with receipt summary, remaining unknowns, next physical move, and next-route offer.
10. [agent][Y] Build a scoped commit proposal (a dry run) when repository artifacts changed: files touched, receipt path, evidence manifest path, and proposed message.
11. [agent][Y] Stage no commit automatically; present the commit proposal with provenance and skip reason if committing is not useful.
12. [agent][G] If the artifact will be reused, add a retrieval note for the future opener: audience, use case, strongest evidence, and known caveats.
13. [agent][G] Run a final absence sweep: missing sources, missing owner review, stale inputs, unsupported claims, and open loops without a home.
14. [agent][R] Report close outcome as receipt status, artifact paths, claims verified or qualified, unknowns remaining, learning routes, bridge path, and first next move.
15. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Claim-check** -- Re-run the claim-check over final artifact text and receipt fields; report each unsupported factual claim as unknown or remove-before-publish.
2. [agent][R] **Receipt completeness** -- Verify the receipt names work performed, artifacts, source refs, evidence refs, claim refs, decisions, unknowns, and digest; repair the receipt before close completes.
3. [agent][Y] **Evidence-used manifest** -- Confirm claim-bearing artifact sections point to evidence and qualifiers; stage missing evidence as an exception, not as finished copy.
4. [agent][Y] **Negative receipt** -- When evidence was searched and absent, record search scope, searched time, and result set so absence is explicit.
5. [agent][G] **Reusable brief pattern** -- Identify any wrapper, source set, review rule, or claim policy worth promoting through the Learning Router.
6. [agent][G] **Future-open handle** -- Confirm the bridge gives the next opener a topic, artifact path, unknowns, and first physical move without reopening the whole brief.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] Learning routing uses the Learning Router in `_catechism-base.md` and does not reconstruct the table.
2. [agent][R] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This pack handles deliberate proof, claim, receipt, and bridge checks.
3. [agent][Y] Anything that processes routed learnings after close (your knowledge-note upkeep, if any) is outside this pack; it only prepares the packet.
4. [agent][Y] Git commit proposals use explicit file lists and receipt provenance; no hidden staging.
5. [agent][G] External publishing, send, or upload actions remain outside this pack unless the user separately invokes the appropriate tool or route.
6. [agent][R] Any external mirror is optional and derived; the receipt and bridge files remain authoritative.

## BRIDGE
1. [agent][R] Close WRITES `<state dir>/brief-next.md`; open READS the same file before args expansion or source gathering.
2. [agent][R] Bridge schema: `route`, `brief_id`, `topic`, `audience`, `target_artifact`, `artifact_paths`, `source_refs`, `evidence_refs`, `claim_refs`, `unknowns`, `receipt_status`, `next_physical_move`, `next_route_offer`, `closed_at`.
3. [agent][R] The bridge is file-primary and ungated; any external mirror remains gated and can lag without blocking continuity.
4. [agent][R] Open consumes only activation-lowering fields: topic, audience, artifact path, source hints, unknowns, and next physical move.
5. [agent][Y] Close includes enough proof for a future brief opener to know what was done and what still needs evidence.
6. [agent][Y] If an external mirror and the file bridge disagree, the file bridge wins for next open and the mirror is treated as derived.
7. [agent][G] If the bridge points to a missing artifact, preserve the receipt summary and add a fresh source gap instead of erasing history.
8. [agent][G] A useful bridge fits on one screen; archive-length receipts live beside the artifact or in your knowledge notes folder.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "The [R] subset uses no more than one user decision."
3. [agent][R] "Claim-check runs BEFORE generation for every claim-bearing brief."
4. [agent][R] "Open hydrates existing context before adding ceremony."
5. [agent][R] "Close verifies claims, drains unknowns, and reduces scope before marking the brief landed."
6. [agent][Y] "Lighter tiers trim ceremony scope, never standards."
7. [agent][Y] "Reuse over rebuild: the pack carries ordering, wrapper, receipt, and gotchas."
8. [agent][G] "A negative receipt is valid proof that the route looked and found no evidence."

## GOTCHAS
1. [agent][R] Claim-check after drafting is too late for this route; the point is to separate supported claims, judgment, and unknowns before generation.
2. [agent][R] A polished artifact without evidence-used mapping can look complete while hiding which claims are sourced, qualified, or unknown.
3. [agent][R] The typed wrapper is a shape, not a vocabulary import; tokens from other systems stay out of the brief packet.
4. [agent][Y] A negative receipt is not failure; it distinguishes "looked and found none" from "never looked."
5. [agent][Y] An external mirror without the receipt path can appear primary; every mirror motion names the file path that remains authoritative.
6. [agent][G] Briefs can drift into broad research; keep open to typed intake and route larger investigation work to a separate research project with its own stated terminal condition.
7. [agent][G] Claim candidates and finished claims need different labels; mixing them makes later receipt review ambiguous.
8. [agent][R] Missing owner review does not block a close receipt; it becomes an explicit unknown or exception in the receipt packet.
