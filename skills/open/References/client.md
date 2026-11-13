# client — /open + /close
BLUF: Bottom Line Up Front: opens a client engagement by hydrating the client record, people, active project, and next commercial motion; closes by mining evidence, draining open controls, verifying invoice state from user-named data, and staging testimonial/access follow-through.
DECISION BUDGET: open=2 · close=3   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open client` or `/open c`; aliases resolve in the router before this pack loads.
2. [agent][R] Input needed is a client org, client project, or enough args to identify one active client surface; if multiple candidates remain, the router asks one target question and returns before ceremony.
3. [agent][R] `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/client-next.md` (below, "the state dir" means that folder) is optional but read first when present.
4. [agent][R] First-open detection is record-first: if no client org, people, and project note exist yet in your project registry (for example a `PROJECTS.md`, if you keep one) or client folder, it is a first open; an existing project note means a subsequent open.
5. [agent][Y] Meeting-transcript, recap, proposal, and Voice of Customer (VOC) sources are optional at open; absence narrows scope instead of blocking.
6. [agent][Y] Client work may live outside the current repository; local git state is context, not a needed source.
7. [agent][G] If a matching client folder or project note exists, it is read as evidence before creating any new file-local stub.

### Steps
1. [agent][R] Read `<state dir>/client-next.md` and hydrate only client name, project hint, people hint, next physical move, invoice source hint, and open relationship loop.
2. [agent][R] Resolve target candidates from args, active work state (the optional `<state dir>/work.json`; absent means no active run), current path, recent meeting-recording titles, and existing client-project notes; list evidence sources, not guesses.
3. [USER-DECISION][R] Decision 1: if target remains ambiguous, choose one client/project or choose "file-first stub, link later."
4. [agent][R] Detect first-open versus subsequent-open by checking whether the org+people+project set is already represented; first open stages the whole set, subsequent open stages project-only hydration.
5. [agent][R] On first open, assemble the minimum client packet: org name, known people, active project, current commercial state, relevant source links, and next relationship motion.
6. [agent][R] On subsequent open, assemble the project packet only: client project, current delivery state, latest recap/proposal/VOC artifact, and next physical move.
7. [agent][Y] Read the knowledge library's `INDEX.md` for prior client close mining and client playbooks; attach only high-signal hits to the open packet.
8. [agent][Y] If meeting-recording artifacts exist, prepare a source list for a deal recap (what changed in the deal, verbatim quotes, open questions); include title/date/source path and skip transcript expansion until the recap needs it.
9. [agent][Y] If proposal or statement-of-work context exists, prepare a compact handoff for your proposal workflow with agreement state, deliverables, timeline, and constraints.
10. [USER-DECISION][Y] Decision 2: when commercial state is unclear, choose the next available track: recap, proposal, delivery, Voice of Customer (VOC), or closeout prep.
11. [agent][Y] Route recap-ready material to a deal recap; proposal-ready material to your proposal workflow; customer-language material to voice-of-customer mining (extracting the customer's own words from transcripts, feedback and recaps).
12. [agent][G] If stakeholder context is rich enough, stage input for a stakeholder map of the buying committee with people, roles, tensions, and next relationship motion.
13. [agent][R] Write or refresh `<state dir>/client-next.md` with route, target, first-open flag, source packet, next physical move, and `next_route_offer` (the suggested next route).
14. [agent][R] Present the open outcome as a three-option menu: start recap, start proposal/delivery, or inspect controls before work.
15. [agent][G] Record any missing source class explicitly: no meeting-transcript source found, no proposal source found, no Voice of Customer (VOC) source found, or no project note found.
16. [agent][R] Close with: "You are set up. NMIT: <the next most important thing from this open>."

### Wiring
1. [agent][R] Router owns alias `c`, menu placement under Engagement, direct-arg handling, and target disambiguation.
2. [agent][R] A written agreement on objectives, measures and value with the buyer (Alan Weiss's Conceptual Agreement method) is the consulting-practice front door when the next motion is commercial or relationship-sensitive.
3. [agent][R] A deal recap owns transcript-to-recap, Conceptual Agreement delta, and account research; this pack prepares source packets only.
4. [agent][R] Your proposal workflow owns proposal and statement-of-work build or review once agreement quality is ready.
5. [agent][Y] Voice-of-customer mining owns customer-language extraction; this pack points to sources and records selected destinations.
6. [agent][Y] A meeting recorder (whichever you use) is treated as a source surface for transcripts and meetings; this pack does not claim a direct integration with it.
7. [agent][Y] The knowledge library (`_knowledge.md`) supports prior-pattern retrieval and later routing; this pack carries ceremony and controls.
8. [agent][G] If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them.

## CLOSE
### Preconditions
1. [agent][R] Target client/project resolves from args, current surface, active work state, or bridge; if multiple remain, the router asks one target question and returns before close ceremony.
2. [agent][R] Close status is one of: completed cleanly, paused with next step, or ended with caveats; wording stays neutral and evidence-based.
3. [agent][R] No invoicing system integration exists in this pack; invoice verification always names the user-provided data source checked during close.
4. [agent][R] Access-removal check uses source evidence from client docs, repos, apps, calendars, password manager notes, or user-named systems; absent evidence is reported as absent.
5. [agent][R] Testimonial ask runs only at positive closure: handed off, accepted, and no known caveat blocking the ask.
6. [agent][Y] Meeting-transcript/recap/proposal/VOC artifacts are mined when available; close still completes with explicit evidence gaps when absent.
7. [agent][Y] Case-study capture is a staged option, not a default publication step.
8. [agent][G] Relationship-network updates (including any external mirror of them) stay gated previews with file evidence first.

### Steps
1. [agent][R] Read bridge, active work state, client notes, proposal/statement-of-work files, recap files, and the available meeting-transcript list; report the evidence inventory first.
2. [agent][R] Run a deal recap on eligible transcripts or recaps, or state why no recap source was available.
3. [agent][R] Build the externalized controls checklist: deliverable acceptance, file transfer, invoice verification, record retention, access removal, testimonial/feedback ask, and relationship next step.
4. [USER-DECISION][R] Decision 1: name the invoice evidence source to check now, or choose "no invoice source yet"; do not imply an integration.
5. [agent][R] Verify invoice state against the named source: not applicable, not started, drafted, sent, paid, or evidence absent; preserve source name in the close report.
6. [agent][R] Verify deliverable acceptance from contract, message, email, meeting recap, or explicit user note; if absent, stage an acceptance follow-up rather than treating it as done.
7. [agent][R] Verify file transfer or handoff package from source evidence; if absent, stage the smallest handoff next move.
8. [agent][R] Verify access-removal status by source class; list each known access surface as removed, retained with reason, or evidence absent.
9. [agent][R] Run installed catechism base plus route extensions below; the agent performs sweeps first and reports findings, proposals, and skips.
10. [agent][R] Run the Learning Router in `_catechism-base.md` over client learnings, playbooks, relationship notes, and skill Gotchas.
11. [agent][Y] Mine Voice of Customer (VOC) candidates from transcript quotes, recap phrasing, proposal language, and client feedback; run them through voice-of-customer mining before staging destinations.
12. [agent][Y] If completed cleanly, draft a concise testimonial/feedback ask using the freshest positive closure evidence; otherwise park the ask with the blocker named.
13. [USER-DECISION][Y] Decision 2: send or park the testimonial/feedback ask; case-study permission remains a separate staged option.
14. [agent][Y] Build case-study/VOC capture packet: problem, stakes, before state, intervention, outcome evidence, permission state, and usable quotes.
15. [agent][Y] Stage relationship-note updates for people, org, buying committee, preferences, and future-opportunity hints.
16. [USER-DECISION][G] Decision 3: choose commit/archive action for close artifacts, or preserve staged files and bridge without a commit.
17. [agent][R] Write `<state dir>/client-next.md` with close status, invoice source/state, access status, testimonial state, next relationship move, and next physical move.
18. [agent][R] Report close outcome as evidence inventory, controls checklist status, Learning Router KEEP/SKIP inventory, bridge path, and next available route.
19. [agent][G] If committing, stage explicit files only and use a scoped message such as `close(client): <client-project>`.
20. [agent][G] If not committing, name the exact files/artifacts preserved and the next safe handling step.
21. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run installed path `~/.claude/skills/open/References/_catechism-base.md`; this pack adds only the delimited route extensions below.

<!-- route-catechism-extension:start -->
1. [agent][R] **Invoice verification** -- Check the user-named invoice evidence source and report source name, state, and confidence limits without implying system integration.
2. [agent][R] **Access removal** -- Sweep known access surfaces and report removed, retained-with-reason, or evidence-absent states with the source used for each.
3. [agent][Y] **Testimonial/feedback ask** -- If closure is positive and accepted, draft the ask at that moment; otherwise park it with the specific blocker.
4. [agent][Y] **Case-study and Voice of Customer (VOC)** -- Route quotes, outcomes, and permission state through voice-of-customer mining before staging any public-use packet.
5. [agent][G] **Relationship network** -- Stage relationship updates for org, people, project, and future opportunity only from named evidence.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] A deal recap owns transcript/recap mining; this pack invokes it when sources exist and records skip reasons when they do not.
2. [agent][R] Your proposal workflow owns proposal and statement-of-work state; this pack checks close controls against those artifacts without rebuilding them.
3. [agent][R] Voice-of-customer mining owns customer-language extraction; this pack stages source packets and permission state.
4. [agent][Y] A meeting recorder is a source lane for transcript and meeting evidence; this pack names it honestly and does not assume an application programming interface (API).
5. [agent][Y] If your setup runs SessionEnd hooks, they are complements: this pack does not duplicate them. This pack handles the deliberate business controls.
6. [agent][G] Git commit behavior is explicit staging only; no hidden bulk add.
7. [agent][R] The Learning Router in `_catechism-base.md` is the routing table; this pack does not rebuild it.

## BRIDGE
1. [agent][R] Close WRITES `<state dir>/client-next.md`; open READS the same file before target detection and source hydration.
2. [agent][R] Bridge schema: `route`, `client_org`, `client_project`, `first_open`, `people`, `source_packet`, `invoice_source`, `invoice_state`, `access_state`, `testimonial_state`, `relationship_next`, `next_physical_move`, `next_route_offer`, `updated_at`.
3. [agent][R] Bridge is file-primary and ungated; any external mirror is gated and may lag without blocking continuity.
4. [agent][R] Open reads only activation-lowering fields: target, people hint, source packet, next physical move, and `next_route_offer` (the suggested next route).
5. [agent][R] Close writes enough controls state for a future `/open client` to restart without re-mining all transcripts.
6. [agent][Y] If bridge points to a missing project note, preserve bridge text and stage a file-first stub rather than dropping continuity.
7. [agent][Y] If source evidence conflicts, file bridge names the conflict and keeps the named source list for the next ceremony.
8. [agent][G] Bridge updates include source paths when a specific source shaped the decision.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "Lighter tiers trim ceremony scope, never standards."
3. [agent][R] "Open hydrates existing context before adding ceremony."
4. [agent][R] "Close verifies, drains, and reduces scope before marking the client route closed."
5. [agent][R] "Invoice verification names the checked source; no invoicing integration is implied."
6. [agent][R] "Offers stay menus; opting out remains a valid outcome."
7. [agent][Y] "File-primary bridge wins when mirrors disagree."
8. [agent][Y] "Reuse over rebuild; packs carry ordering, glue, and gotchas."

## GOTCHAS
1. [agent][R] A client can have an org, several people, and several projects; first open stages the org+people+project set, while later opens hydrate the project only unless evidence shows missing links.
2. [agent][R] Invoice state has no direct system connector here; the close report is only as strong as the user-named source checked during the ceremony.
3. [agent][R] Access can live in repos, docs, apps, calendars, or ad hoc accounts; absence of evidence is a finding, not proof of removal.
4. [agent][Y] Testimonial timing is high-leverage only after positive acceptance; when closure has caveats, park the ask with the blocker rather than spending a decision.
5. [agent][Y] A meeting recorder is a source lane, not a guaranteed integration; if transcripts are missing, route close mining through recaps, proposals, messages, and notes.
6. [agent][Y] If voice-of-customer mining lives in a separate skill, read that skill's description and trigger conditions before relying on automatic invocation.
7. [agent][G] Relationship updates can overreach if drawn from memory alone; stage only evidence-backed people/org/project motions.
