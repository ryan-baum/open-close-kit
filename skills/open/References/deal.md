# deal — /open + /close
BLUF: Bottom Line Up Front: runs the Weiss sales motion (Alan Weiss's Conceptual Agreement method) after discovery interest is real, builds Conceptual Agreement (CA), routes stakeholders and proposal work, then closes with a won/lost/no-decision verdict and the right bridge.
DECISION BUDGET: open=1 · close=1   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open deal` or `/open dl`; aliases resolve in the router before this pack loads.
2. [agent][R] This route starts only after discovery happened and the buyer signaled continuation beyond the initial discovery call.
3. [agent][R] If interest is premature, stop and point the user to discovery prep (preparing the discovery call); do not run this route.
4. [agent][R] The deal target resolves from args, current surface, discovery artifacts, meeting-recording titles, or an existing state file.
5. [agent][R] If multiple deal candidates remain, ask one target question and return before ceremony.
6. [agent][R] `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/deal-<slug>.md` (below, "the state dir" means that folder) is the file-primary state path for this pack's OWN routing/bridge record. **It is a derived pointer/summary, not the canonical home for CA, deal-intelligence or deal-strategy content.** That canonical home is the deal directory: one folder per buyer holding the Conceptual Agreement, deal intelligence, deal strategy, transcripts and recaps, owned by the deal recap and Conceptual Agreement workflow (see BRIDGE item 2's `deal_dir` field). A suggested default is `${OPEN_CLOSE_WORK_DIR:-~/work}/deals/<buyer-slug>/`. This file never forks its own copy of CA rows.
7. [agent][Y] The discovery-prep ledger, if present, is evidence; absence narrows the packet instead of blocking.
8. [agent][Y] Meeting-recorder transcripts are source evidence when available; this pack names them but does not assume an application programming interface (API).
9. [agent][Y] Stakeholder work runs only when more than one buyer-side person is in the motion.

### Steps
1. [agent][R] Confirm post-discovery interest: discovery call happened, buyer asked for or accepted a continuation, and there is a plausible next commercial step.
2. [agent][R] If the post-discovery test fails, stop with: "This is still pre-interest; use discovery prep before `/open deal`."
3. [agent][R] Gather the context packet: discovery artifacts, the discovery-prep ledger if present, meeting-transcript list, recap notes, buyer messages, and current proposal fragments.
4. [agent][R] Name evidence gaps explicitly: no discovery artifact found, no ledger found, no meeting transcript found, no buyer continuation evidence found, or no proposal context found.
5. [agent][R] Start from the consulting-practice front door: a written agreement on objectives, measures and value with the buyer (Alan Weiss's Conceptual Agreement method), and route CA framing to a deal recap (what changed in the deal, verbatim quotes, open questions).
6. [agent][R] Have the deal recap frame Weiss objectives, measures, value, buyer language, open questions, and CA risk. Always point the recap at the deal directory (the canonical folder from precondition 6), never the invoking session's own run folder; otherwise the next call-processing session will not find this deal's CA and will silently start it over.
6a. [agent][R] If no transcript exists yet for this call cycle but real prior-engagement evidence does (a closed SOW, delivery audit, prior CA, prior recap, or comparable), write a deal recap from that evidence alone (no call transcript) to seed a hypothesis-only CA, labelled as hypothesis, rather than skipping CA seeding entirely. Otherwise name the absence as an evidence gap (step 4) and proceed with no CA seeded.
6b. [agent][R] Before any live call with the buyer inside this open deal for which no fresh call-prep artifact exists, do call prep (the discovery-prep method, applied to a deal that is already open) to produce the meeting-prep artifact (ledger, agenda, questions, homework signals, red flags) from current CA and deal-intelligence state. This pack has no meeting-prep engine of its own by design; do not build a competing one here (see Wiring, below).
7. [agent][R] Write or refresh `<state dir>/deal-<slug>.md` with target, source packet, CA state, people, next commercial step, and updated timestamp. `ca_state` (and `stakeholder_state`, `proposal_pointer`) are short status summaries plus a `deal_dir` path pointer at the canonical deal directory (BRIDGE item 2), never a forked copy of CA, deal-intelligence or deal-strategy content.
8. [agent][R] Keep file state primary; stage any external mirror only as a preview packet with source, target, field, evidence, and gate.
9. [agent][Y] If committee size is greater than one, build a stakeholder map of the buying committee with people, roles, interests, objections, and decision process.
10. [agent][R] If your stakeholder-map method has a Conceptual Agreement (CA) completeness gate (for example 80% of the agreement fields filled with evidence), honor it; do not bypass it from this pack.
11. [agent][Y] Update the deal state with stakeholder map status, decision process, missing people, and next relationship move.
12. [agent][R] When CA is incomplete, report the minimum next evidence needed before proposal work.
13. [agent][R] When CA is complete, route proposal work to your proposal workflow by name only.
14. [agent][R] Never copy fee anchors, multipliers, pricing formulas, or proposal economics from your proposal workflow into this pack or the deal state.
15. [agent][Y] Preserve proposal pointers as artifact paths, names, links, and state only: not started, outline, drafted, reviewed, sent, or stale.
16. [agent][Y] Stage a three-option open menu: strengthen CA, map stakeholders, or move to proposal.
17. [USER-DECISION][Y] Decision 1: if multiple next commercial moves are valid, the user chooses recap, stakeholder navigation, or proposal.
18. [agent][G] If committing open artifacts, stage explicit files only and use a scoped message such as `open(deal): <deal-slug>`.
19. [agent][R] Close with: "You are set up. NMIT: <the next most important thing>."

### Wiring
1. [agent][R] Router owns alias `dl`, direct-arg handling, target disambiguation, and premature-interest redirect to discovery prep.
2. [agent][R] Discovery prep owns discovery-call prep and any pre-interest ledger; this route reads its outputs only after interest exists. It also owns post-interest live-call prep once this deal is open (step 6b); this pack does not build or maintain a competing meeting-prep engine.
3. [agent][R] The Conceptual Agreement front door (step 5) owns consulting-practice framing before deal-specific recap work.
4. [agent][R] The deal recap owns Weiss objectives, measures, value, buyer language, and CA delta.
5. [agent][R] The stakeholder map owns committee mapping and its own CA completeness gate when committee size is greater than one.
6. [agent][R] Your proposal workflow owns proposal build, review, fee anchors, multipliers, and pricing logic.
7. [agent][Y] A meeting recorder is a source lane for transcripts and meeting evidence; this pack does not claim a direct integration with it.
8. [agent][G] If your setup runs SessionStart hooks, they are complements: this pack records route state rather than rebuilding startup context.

## CLOSE
### Preconditions
1. [agent][R] Invocation is `/close deal` or `/close dl`; aliases resolve in the router before this pack loads.
2. [agent][R] Target deal resolves from args, current surface, active work state, proposal pointer, or `<state dir>/deal-<slug>.md`.
3. [agent][R] Close verdict must be one of: won, lost, or no-decision.
4. [agent][R] A deal may close without becoming a client; won is the only verdict that bridges to `/open client`.
5. [agent][R] The close report names available sources before interpretation: state file, CA artifact, proposal artifact, meeting transcript, buyer message, or user note.
6. [agent][Y] If the buyer will talk after loss or no-decision, run a de-biased debrief; if not, preserve the re-engage trigger without pretending certainty.

### Steps
1. [agent][R] Read the deal state, CA artifact, proposal pointer, stakeholder notes, buyer messages, and the available meeting-transcript list.
2. [agent][R] Report evidence inventory first, including missing source classes.
3. [USER-DECISION][R] Decision 1: choose verdict `won`, `lost`, or `no-decision`.
4. [agent][R] For won, write the client-open handoff with state path, CA pointer, proposal pointer, buyer org, people, deal value context by pointer, and next delivery-intake move.
5. [agent][R] For won, bridge to `/open client`; state plus CA plus proposal are the first-open inputs for the client route.
6. [agent][R] For lost or no-decision, run a Story/Proof/Product/Procurement loss retro (Story: did the buyer believe the problem and the outcome? Proof: was the evidence enough? Product: did the offer fit? Procurement: did the buying process, budget or timing block it?); answer each lens from evidence, and do not copy text from a template.
7. [agent][Y] For lost or no-decision, separate facts, buyer-stated reasons, agent inferences, and unanswered questions.
8. [agent][Y] If the buyer will talk, prepare a de-biased debrief script that asks for decision process, missing proof, risk, timing, and procurement blockers.
9. [agent][R] Write a re-engage trigger with both date and condition, or state which half is missing.
10. [agent][R] Close the state file with verdict, verdict date, source inventory, handoff or re-engage trigger, and next route offer.
11. [agent][R] Run installed catechism base plus route extensions below; the agent performs sweeps first and reports findings, proposals, and skips.
12. [agent][Y] Run the Learning Router in `_catechism-base.md` over deal learnings, proposal gotchas, stakeholder notes, and skill Gotchas.
13. [agent][Y] Stage relationship-note updates for buyer people, objections, decision process, and future opportunity only from named evidence.
14. [agent][G] If committing close artifacts, stage explicit files only and use a scoped message such as `close(deal): <deal-slug>`.
15. [agent][G] If not committing, name the exact artifacts preserved and the next safe handling step.
16. [agent][R] Finalization write (post-catechism, mandatory): after the catechism has run, perform one full-file `Write` (not Edit, MultiEdit, or a Bash append, so the state file is never left half-updated) to `<state dir>/deal-<slug>.md`. Include `route: deal`, the terminal verdict/date, and a fresh timezone-qualified RFC 3339 `closed_at` taken from the system clock. When an independent close audit ran (catechism extension 6), also include `audit_slug` (a short label you chose) and `audit_run_id` (any id the reviewer returned, or `none`); otherwise write `none` in both. The earlier state-close write (step 10) is pre-catechism and cannot qualify.
17. [agent][R] Report close outcome as verdict, evidence inventory, bridge path, catechism KEEP/SKIP inventory, and next available route.
18. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Proposal integrity** -- Verify no fee values, fee anchors, multipliers, pricing formulas, or economics were copied outside your proposal workflow's own artifacts; preserve pointers only.
2. [agent][R] **Pipeline hygiene** -- Verify `<state dir>/deal-<slug>.md` is closed with verdict, verdict date, source inventory, and bridge target.
3. [agent][R] **Won handoff** -- Verify close-won wrote the client-open handoff with state, CA, proposal pointer, people, and next delivery-intake move.
4. [agent][R] **Loss retro** -- For lost/no-decision, verify the Story/Proof/Product/Procurement retro is present, with each lens answered from evidence and no copied template text.
5. [agent][Y] **Re-engage trigger** -- Verify lost/no-decision includes a date plus condition, or explicitly names the missing half.
6. [agent][Y] **Independent close audit (optional)** -- If a second reviewer is available (a different model, or a fresh-context subagent with no stake in the work), have it audit close-claim integrity: does every "done/delivered" claim match evidence in the work contract, artifacts and git; are all open items surfaced; does any completion rest on a single self-report; is the rollback real. It is read-only. Fold or refute each finding with evidence BEFORE the close is recorded, and state the verdict (pass, concerns, or fail) in the close output. Keep its slug and run id for the finalization write (step 16). If it was skipped or errored, say that independent coverage was NOT obtained.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] `/open client` owns delivery engagement intake after won; this pack writes the handoff and stops.
2. [agent][R] The deal recap owns CA review and transcript recap mining; this pack consumes its outputs for verdict and retro.
3. [agent][R] Your proposal workflow owns proposal state and economics; this pack checks pointers and status only.
4. [agent][R] The stakeholder map owns committee map interpretation; this pack records close implications without bypassing its gate.
5. [agent][Y] A meeting recorder remains a source lane for transcript evidence and buyer language.
6. [agent][G] Git commit behavior is explicit staging only; no hidden bulk add.
7. [agent][R] The Learning Router in `_catechism-base.md` is the routing table; this pack does not rebuild it.

## BRIDGE
1. [agent][R] Open READS and WRITES `<state dir>/deal-<slug>.md` as the active sales-motion state. **This file is a derived pointer/summary record for the open/close ceremony, not the canonical home for a deal's substantive artifacts.** The canonical home for the Conceptual Agreement, deal intelligence, deal strategy, transcripts, recaps, and any engagement-state file is the deal directory (suggested default `${OPEN_CLOSE_WORK_DIR:-~/work}/deals/<buyer-slug>/`), owned by the deal recap and Conceptual Agreement workflow. Keeping one canonical home closes a real three-way disagreement about where deal content lives.
2. [agent][R] Deal state schema: `route`, `deal_slug`, `buyer_org`, `people`, `source_packet`, `deal_dir`, `ca_state`, `stakeholder_state`, `proposal_pointer`, `next_commercial_move`, `verdict`, `verdict_date`, `audit_slug`, `audit_run_id`, `closed_at`, `bridge_target`, `reengage_trigger`, `updated_at`. **`deal_dir`** is the path pointer at the canonical deal directory above. **`ca_state`** (and `stakeholder_state`, `proposal_pointer`) are short status summaries (a completeness/trust snapshot and an artifact path pointer), never a forked copy of CA rows, deal-intelligence content, or deal-strategy content; the canonical directory is the single source of truth for that content and wins on any disagreement. `audit_slug` and `audit_run_id` are `none` when no independent close audit ran.
3. [agent][R] Close-won WRITES a client-open handoff into the same deal state and offers `/open client`.
4. [agent][R] Close-won handoff includes state path, CA pointer, proposal pointer, buyer org, people, source inventory, and next delivery-intake move.
5. [agent][R] Close-lost and close-no-decision WRITE a re-engage trigger with date, condition, evidence, and owner.
6. [agent][R] File bridge is primary and ungated; any external mirror is gated and may lag.
7. [agent][Y] If a bridge target conflicts with source evidence, preserve both sources and name the conflict rather than overwriting continuity.
8. [agent][G] Bridge updates include source paths when CA artifacts or proposal artifacts shape the decision.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "This route requires post-discovery interest; pre-interest work redirects to discovery prep and stops."
3. [agent][R] "Deal is sales motion; client is delivery engagement."
4. [agent][R] "Close-won bridges to `/open client`; close-lost/no-decision writes a re-engage trigger."
5. [agent][R] "Money and legal terms verify first through your proposal workflow or named source evidence before any agent summary."
6. [agent][R] "Fee values, fee anchors, multipliers, and pricing formulas stay inside your proposal workflow unless it explicitly writes the artifact."
7. [agent][Y] "Before any push, run `git remote -v` and verify the correct repository."
8. [agent][Y] "File-primary bridge wins when mirrors disagree."
9. [agent][Y] "Offers stay menus; opting out remains a valid outcome."

## GOTCHAS
1. [agent][R] Deal and client are different altitudes: deal is the sales motion from post-discovery interest to won/lost/no-decision; client is delivery after won.
2. [agent][R] If your stakeholder-map method has its own Conceptual Agreement (CA) completeness gate, this pack can invoke it, not override it.
3. [agent][R] Proposal economics are wire-by-pointer: fee anchors, multipliers, pricing formulas, and money logic stay in your proposal workflow.
4. [agent][R] Discovery prep is pre-interest and this route is post-interest; using deal too early creates fake pipeline certainty. Discovery prep, if you use it, can be re-applied as call prep once this route is open (step 6b); that does not reopen the pre-interest gate.
5. [agent][Y] Lost and no-decision are different outcomes; preserve the buyer's state without flattening both into failure.
6. [agent][Y] Meeting transcripts can sharpen CA and loss retro, but absence of a transcript is a source gap, not a blocker.
7. [agent][R] This pack's own state file (`<state dir>/deal-<slug>.md`) is a pointer/summary, not the canonical deal-artifacts home; never let `ca_state` drift into carrying full CA content, which lives only at `deal_dir`.
8. [agent][R] Do not invoke the deal recap with an omitted or run-folder project directory; always pass the canonical `deal_dir` path (step 6), or the next call-processing session will not find this deal's CA and will silently start it over.
