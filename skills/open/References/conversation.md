# conversation — /open + /close
BLUF: Bottom Line Up Front: `/open conversation` is minimal recall plus intent capture. `/close conversation` is the agent-run Close Catechism plus one Learning Router execution.
DECISION BUDGET: open=1 · close=0   (per direction; menu navigation excluded)
COUNTERPART: both directions live in this file; bridge below.

## OPEN
### Preconditions
1. [agent][R] Invocation is `/open conversation`, `/open conv`, or `/open chat`; aliases resolve in the router before this pack loads.
2. [agent][R] Open is intentionally minimal: recall plus intent capture only; it does not perform day, session, or milestone startup.
3. [agent][R] Optional args are treated as the conversation intent, topic, project hint, client hint, or handoff phrase. An arg that names a bridge variant (`conversation-next-<topic>.md`) selects that file instead of the global slot.
4. [agent][R] If args are absent, read `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/conversation-next.md` before asking for any intent.
5. [agent][R] Absence of the bridge file, the state dir, or any external mirror never blocks open.
6. [agent][Y] If the bridge points to an active run, preserve that context but do not advance its work-contract phase during open.
7. [agent][G] If several plausible intents remain after bridge plus args, present at most three offers with the most likely first.

### Steps
1. [agent][R] Read the conversation bridge first and extract only restart-critical fields: last intent, open loops, active run pointer, and next useful prompt.
2. [agent][R] Run recall only for a cold start: search recent session transcripts, run folders, work-contract titles, and `git log` for the topic.
3. [agent][R] Summarize recall in a compact Bottom Line Up Front: what seems active, what is uncertain, and what the next conversational move could be.
4. [agent][R] Capture the current intent as one sentence: what the user appears to want from this conversation now.
5. [USER-DECISION][R] If intent remains ambiguous, offer one compact choice: accept the inferred intent or pick one alternate.
6. [agent][R] Set the conversation frame from that intent and stop; this open hydrates context and does not expand ceremony.
7. [agent][Y] If recall finds a likely project, client, milestone, research, brief, skill, or experiment route, offer that route as a handoff instead of silently switching.
8. [agent][Y] If a prior close left open loops, surface them as context with one offered next move, not as obligations.
9. [agent][Y] If the active run already has a work-contract phase, keep the phase unchanged during open and leave completion semantics to close.
10. [agent][Y] Read the knowledge library's `INDEX.md` (`_knowledge.md`) and attach only the notes whose line matches this conversation's topic; open a note's full text only on a match. No match is normal.
11. [agent][G] If the topic is client-facing, research-heavy, or executive-summary shaped, name the relevant method and keep the current route as the front door.
12. [agent][G] Write a tiny refreshed bridge only when the open changes the intent or active run pointer; otherwise leave the existing bridge untouched.
13. [agent][R] Close with: "You are set up. NMIT: <the next most important thing from this open>."

### Wiring
1. [agent][R] The router handles aliases `conv` and `chat`, bare-menu placement, and deterministic context clues; this pack handles only conversation ceremony.
2. [agent][R] Recall is the only default open delegate: it recovers prior sessions, run folders, work-contract titles, and git history.
3. [agent][R] If your setup runs SessionStart hooks, they are complements: this pack does not duplicate them, and it does not become a second startup ritual.
4. [agent][Y] Reading the knowledge library's index is a `[Y]` step: it is skipped at `[R]`, and a match is context, never a requirement.
5. [agent][G] No commit, external write, or work-contract change is required for open.

## CLOSE
### Preconditions
1. [agent][R] `/close conversation` is the fullest Close Catechism path and the learn step for the current conversation.
2. [agent][R] The default close path asks the user zero questions; the agent sweeps, reports findings, and presents proposals with explicit skip reasons.
3. [agent][R] If `<state dir>/work.json`, the current working directory, or a `CONTRACT.md` shows an active run, this close is that run's learn step and no separate learning ceremony runs.
4. [agent][R] If an active run is present, the Learning Router in `_catechism-base.md` runs exactly once, and work-contract completion happens inside that run.
5. [agent][R] If no active run is present, run the catechism standalone over the conversation, changed files, visible artifacts, and bridge state.
6. [agent][R] External mirrors are optional; every mirror motion is described-gated and never required for close completion.
7. [agent][Y] If git status has unrelated changes, propose scoped groups and skip any commit action unless the user later gates it outside the default close path.
8. [agent][G] If source evidence is missing for a claim, flag the absence and route only the claims that can be evidenced.
9. [agent][R] `--checkpoint` (args contain it): a mid-conversation close, run when the conversation went idle near the prompt-cache lifetime (the warm-close mod submits `/close conversation --checkpoint`; the user may type it too). It runs every step EXCEPT work-contract completion: never set `phase: complete` (step 7), never mark the run done. Instead append one Decisions line to the contract, `checkpoint close <UTC stamp>: <n> learnings routed, bridge written`, and leave the phase as found. The conversation may continue afterwards; a later checkpoint routes only what is new since the last one (read the bridge's `keep_inventory` first and skip what it already lists).

### Steps
1. [agent][R] Resolve the close target from explicit args, current directory, recent assistant response, `work.json`, contract path, and bridge file.
2. [agent][R] Print a close preview: inferred conversation topic, active run state, changed files, likely memory surfaces, and evidence gaps.
3. [agent][R] Run `~/.claude/skills/open/References/_catechism-base.md` in full; the agent answers every item first and returns findings, proposals, staged motions, and skips.
4. [agent][R] Run the Learning Router in `_catechism-base.md` (base item 2 points at it).
5. [agent][R] Execute that Learning Router table exactly once over candidate learnings from the conversation; do not reconstruct a parallel taxonomy.
6. [agent][R] Inventory each candidate as KEEP or SKIP with reason, then route only KEEP items to the destinations the table names.
7. [agent][R] If an active run exists, append the learnings summary to its `CONTRACT.md` Changelog and set `phase: complete` inside this single learn execution, but only when every criterion is checked; a run with open criteria keeps its phase and gets a Decisions line naming what is open. Under `--checkpoint` (precondition 9): append the checkpoint Decisions line and leave the phase unchanged.
8. [agent][R] Sweep commits and provenance: inspect changed files, identify ported logic, and present the dry-run commit proposal of base item 1, or explicit skip reasons. Committing stays a gated follow-up (step 18).
9. [agent][R] Sweep project-registry state: identify whether any current project, open session, or successor handoff needs a file-first note.
10. [agent][R] Run the blind-spot sweep: dangling references, unsupported claims, open loops without a home, and active commitments lacking a bridge.
11. [agent][R] Write `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/conversation-next.md` with active intent, open loops, next useful prompt, routed memory summary, and active-run state (see GOTCHAS 7 and 8 before writing).
12. [agent][Y] Prepare collaboration meta-insights for relationship memory, playbooks, or skill Gotchas when evidence supports reuse.
13. [agent][Y] Promote playbook candidates into the knowledge library (`type: playbook`, with an index line whose description search will find); otherwise route to lower-ceremony knowledge or skip.
14. [agent][Y] If the conversation included client or deal intelligence, offer a deal recap or voice-of-customer note as a follow-up proposal, not a default action.
15. [agent][G] If the conversation produced a handoff-grade summary, offer an executive summary and keep the catechism report concise.
16. [agent][G] If a recurring skill failure appears, prepare a Gotcha candidate for the relevant skill with source evidence.
17. [agent][G] If a knowledge artifact is created or proposed, name its source evidence and the Learning Router type that selected it.
18. [agent][R] Keep any optional live write, commit, or mirror motion as a separately gated follow-up outside the zero-question default path.
19. [agent][R] Report the close outcome as: base items 1-4 (each DONE, BLOCKED or SKIPPED), the Learning Router inventory, the commit proposal, memory routes, the bridge path, and the next prompt.
20. [agent][R] Close with: "What stays open: <the loops deliberately not closed, stated neutrally>."

### Catechism
Base: [agent][R] Run `~/.claude/skills/open/References/_catechism-base.md` IN FULL.

<!-- route-catechism-extension:start -->
No route-specific extension items. `conversation` is the exception to the two-extension rule because it runs the base catechism in full.
<!-- route-catechism-extension:end -->

### Wiring
1. [agent][R] The Learning Router in `_catechism-base.md` is the canonical learning table; this pack cites it and does not rebuild it.
2. [agent][R] If your setup runs SessionEnd hooks that capture learnings or clean up state automatically, they are complements: this pack handles only the deliberate close work hooks cannot infer, and it writes the bridge before any cleanup can remove useful context.
3. [agent][G] Git commits remain scoped proposals with explicit file groups; no automatic commit behavior is promised.

## BRIDGE
1. [agent][R] Close WRITES `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/conversation-next.md`; open READS the same file before recall.
2. [agent][R] Bridge schema (YAML frontmatter): `route`, `last_intent`, `active_run`, `contract_path` (the run's `CONTRACT.md`, or `none`), `learning_router_version` (write `catechism-base`), `keep_inventory`, `skip_inventory`, `open_loops`, `next_prompt`, `updated_at`. An example is in the kit's `examples/conversation-next.example.md`.
3. [agent][R] `active_run` records `none`, `standalone`, or the resolved run folder; it never fabricates a path.
4. [agent][R] `next_prompt` is a compact restart handle for the next conversation, not a plan expansion.
5. [agent][R] `keep_inventory` and `skip_inventory` summarize Learning Router outcomes; detailed artifacts live in their routed destinations.
6. [agent][Y] If close completed an active run, the bridge records that completion happened inside the single Learning Router execution.
7. [agent][Y] If optional gates remain, the bridge names them as proposals, not as unfinished obligations.
8. [agent][G] If no useful state remains, write a tiny bridge that says the conversation is closed and names the next likely route only when evidenced.
9. [agent][G] Mirrors are derived from the bridge; when file and mirror differ, file state wins.

## GATES
1. [agent][R] "Decision budget is stated per direction; menu navigation is excluded."
2. [agent][R] "Default `/close conversation` asks the user zero questions; the agent sweeps first and reports findings."
3. [agent][R] "All external-mirror motions are described-gated; never invent an id in another tool."
4. [agent][R] "Lighter tiers trim ceremony SCOPE, never STANDARDS."
5. [agent][R] "Open hydrates context through recall and intent capture only."
6. [agent][R] "Close runs the same Learning Router table exactly once."
7. [agent][R] "If a run is active, `/close conversation` is that run's learn step and completes it inside that step (never under `--checkpoint`, never with open criteria)."
8. [agent][Y] "SessionStart and SessionEnd hooks are complements; the route does not duplicate them."
9. [agent][Y] "File-primary bridge wins when mirrors disagree."
10. [agent][G] "Offers, not demands: menus preserve autonomy; skips are explicit and valid."

## GOTCHAS
1. [agent][R] Conversation is asymmetric: open is intentionally small, while close is the fullest catechism path.
2. [agent][R] If your agent's work loop has its own learn step, run only one of it and `/close conversation` for the same work; two runs duplicate the Learning Router execution.
3. [agent][R] Reconstructing the Learning Router table inside this pack would fork the taxonomy; cite `_catechism-base.md` instead.
4. [agent][R] If SessionStart already injects active context and memory, `/open conversation` must not become a second startup ritual.
5. [agent][R] `/close conversation` focuses on deliberate commitments, memory routing, and blind spots; it does not redo what automatic capture already did.
6. [agent][R] The catechism base is referenced, not copied; copying it here would create two editable sources.
7. [agent][R] **A conversation closed LATE must not clobber a fresher bridge.** `conversation-next.md` is ONE global slot, not one per conversation. A conversation resumed days later will overwrite whatever is there, so READ the bridge and compare `updated_at` BEFORE writing. If the existing bridge is newer AND carries a live `next_prompt` or unparked loops, SKIP the write with an explicit reason and let the stale conversation's state live in its run folder. The bridge's job is the NEXT conversation's restart handle, not a per-run receipt. Bridge item 8's "tiny bridge" is for an EMPTY slot, not a fresher one.
8. [agent][R] **`updated_at` is self-reported and can be wrong: compare the file's mtime too, and prefer a NAMED variant over the global slot.** A hand-written timestamp can sit in the future (that direction fails safe) or in the past (that direction licenses a clobber). So `stat` the file, don't just trust its frontmatter, and treat the two disagreeing as its own finding. The stronger move: write `conversation-next-<topic>.md` and leave the global slot to whoever holds the live `next_prompt`. A named variant is never a clobber and still restarts its own thread; `/open conversation <topic>` reads it.
9. [agent][Y] Turning open loops into demands raises the cost of switching back in; this route parks or offers them with a next prompt.
10. [agent][Y] Commit trailers from older close habits are useful as proposals, but this route must not silently broad-stage or commit.
