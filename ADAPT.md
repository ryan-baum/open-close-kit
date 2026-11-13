# ADAPT: what the kit simplified, and how to put it back

BLUF: this kit keeps the method of the source setup it came from (tiers, decision budgets, bridges, the closing catechism, gates, the gotchas that teach something) and drops everything that only worked inside that setup: private skills, a private notes store and its mirrors, and private review tooling. Each cut is replaced by a file you can read, a plain-language method the agent performs itself, or a single "always gated" rule. Nothing below is broken. Each row says what the source did, what the kit does now, and one way to restore or extend it in your own Claude Code setup. "The source" always means the setup the kit was derived from.

The two env vars you will most likely set (both optional, both have defaults):

```bash
export OPEN_CLOSE_STATE_DIR="$HOME/.claude/open-close"
export OPEN_CLOSE_WORK_DIR="$HOME/work"
```

## Kit-wide changes

These apply to most or all packs, so they are stated once here and not repeated per pack.

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| Bridge files (`<route>-next.md`), `SPRINT.md`, the Flow Plan and an active-work file lived in a fixed private folder. | State lives in `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}`. Each pack spells the full form once, then says "the state dir". The active-work file `work.json` is optional; absent means "no active run". | Point `OPEN_CLOSE_STATE_DIR` at any folder you already keep (a notes folder works). To feed `work.json`, write it from whatever tracks your runs, in the shape of `examples/work.example.json` (`activeRun` with `task`, `phase`, `contract`; the clue helper ignores other keys). |
| Runs lived in a dated private folder, backed by a richer work-artifact system. | Run folders are `${OPEN_CLOSE_WORK_DIR:-~/work}/<YYYYMMDD-HHMMSS_slug>/`. `CONTRACT.md` replaces the richer system: frontmatter `phase:` (`open`, `execute`, `verify`, `complete`) plus sections Goal, Criteria (`- [ ] C-1 ...`), Decisions, Changelog. The agent edits it directly; there is no skill for it. Packs promise no automatic per-criterion checkpoint commits. | Set `OPEN_CLOSE_WORK_DIR`. To use your own spec or task system, point the packs' "work contract" wording at it. If you want checkpoint commits, add a hook and confirm it is running before a pack claims it. `examples/CONTRACT.example.md` shows the shape. |
| The Learning Router (the table that says where each kind of learning goes) was cited from an external loop document owned by the source's agent loop. | The table lives once, in `skills/open/References/_catechism-base.md`. Packs say "the Learning Router in `_catechism-base.md`" and never rebuild it. | Edit the table in that file. If your agent has its own work loop with a learn step, point that step at the same table so there is one router, not two. |
| The catechism base had six items. Two fed a private rule registry (a harvest of candidate rules, and a reconciliation of that registry's surface). | Base items are renumbered 1-4: 1 commits and provenance, 2 memory routing sweep, 3 collaboration meta-insights, 4 "Anything I'm missing?". Pack extensions cite base items by the new numbers. | Add an item to the base file and number it; then update any pack extension that cites a base item by number (milestone, project and research-project cite "base item 4"). |
| Close ran a commit-sweep script over the session's files. | The commit sweep is a dry-run proposal: the agent lists the files this session wrote, per repo, with a suggested message, and never pushes. Committing is a separate, explicitly gated step. | Add a script that lists the files per repo if you want it mechanical. Keep push gated; the deal pack's habit of running `git remote -v` before any push is a good one to copy. |
| Many packs had a pair of external-mirror sections (open and close): typed records, ids, lookup markers, a staging surface and a rules registry, all for mirroring runs, milestones, findings and tasks into an external-tool app. | All of those sections are cut and not replaced. The scattered per-pack mirror rules collapse into one: external mirrors are always gated. The agent describes the intended change, waits for an explicit go, never invents an id in another tool, and treats the files in the state dir and run folder as the source of truth. The rule sits in the router and the catechism base. | Write a mirror section for your own tool in the packs you care about: reads hydrate context, writes are described first and run only on a go, the file stays primary. Keep the describe-then-go gate even when the tool is reliable. |
| Packs ended sections with provenance comments pointing at private design files, plus incident ids, request ids and dated "live case" sentences naming private projects. | All comments and ids are removed. Where a gotcha's lesson was general, the rule stays, reworded without the case ("a real close once ..."). Gotchas that only made sense in the source setup are gone. | Add your own comments or dated cases as you hit them. Nothing in the kit reads them. |
| Each pack listed the specific SessionStart, SessionEnd and completion-check hooks that ran alongside it. | One line per pack: "If your setup runs SessionStart (or SessionEnd) hooks, they are complements: this pack does not duplicate them." The skill pack names hook categories (documentation integrity, completion-claim checks), not hook names. | List your own hooks in each pack's Wiring section so the pack and the hook never do the same job twice. |
| Packs called private skills and tools by name (recall search, knowledge retrieval, deal recap, proposal builder, stakeholder mapping, discovery prep, account research, day-start routine, executive summary, root-cause analysis, document review, research and science skills, an eval harness). | Each is named as the method it performs: "recall (search recent session transcripts, run folders, contract titles and `git log`)", "search your knowledge notes", "a deal recap", "your proposal workflow", "a stakeholder map of the buying committee", "discovery prep", "account research", "your day-start routine", "an executive summary", "a document review", "a research workflow", "an evaluation harness". | Name your own skill or tool in the step that describes the method. If a pack says "your X workflow", that is the slot. |
| Packs read a project registry and a life-goals file as standing inputs. | Both are optional and described by example: "your project registry (for example a `PROJECTS.md`), if you keep one", "your goals file (for example `GOALS.md`)". Without them a pack falls back to the state dir and run folders. | Keep either file and the packs use it as advisory evidence. The goal and project packs show where. |
| A gate cited a private registry of design rules as law and a ruling that lighter tiers cut scope. | One sentence in every pack that had the gate: "Lighter tiers trim ceremony scope, never standards." | Add your own standards list and reference it from the gate. |
| A reflective step ran a second-model audit through a private script. | Optional "Independent blindspot audit" in the milestone, project and research-project packs, and "Independent close audit" in the deal pack: a different-lineage reviewer or a fresh-context subagent, read-only, with the same questions; findings are folded in or refuted. If no audit ran, say so and record `skipped`. Bridge fields `audit_slug` (any short label you choose) and `audit_run_id` (whatever id your reviewer returns, if any) stay in those schemas and read `none` when skipped. The item is `[Y]` everywhere: it never runs at `[R]`. Goal and experiment have no such item. | Use any second reviewer you have; a run id is optional. To cut the audit kit-wide, remove the catechism item, the two bridge fields and the matching clause in each close step together (see Open choices). |
| The owner's name and a personal decision tag appeared in steps, budgets and gates; a few terms were the owner's private vocabulary (a name for a low-friction task list, a state word, a signal name). | `[USER-DECISION]` replaces the personal tag; steps say "the user". The private list name becomes "low-friction list"; the state word becomes "deep-focus"; the signal name becomes "personal signal". Definitions are unchanged. | Rename any of these to your own vocabulary; search the packs for the new words and change them everywhere at once. |
| Cutting items would have left numbering gaps and steps that cite steps which no longer exist. | Every numbered list runs 1..n after the cuts, and cross-references were rechecked. The deal pack keeps the labels `6a` and `6b` for two inserted steps. | If you add a step, renumber and recheck the `step N` references. Any note of yours that cites an old step number is now off by the cut count. |
| `context-clues.ts` (the ranking script behind the bare `/open` menu) read a fixed state folder and placed `conversation` in the Meta/craft tier, which disagreed with both routers. | It reads the state dir from `OPEN_CLOSE_STATE_DIR` (a leading `~` means home) and ranks `conversation` in the Daily tier, matching the router and the pack. If the script fails, the menu falls back to the fixed grouped menu. | Edit the tier map in the script and update `context-clues.test.ts` with it. |
| Not a cut: `_launch.md` was added for the kit as a new reference. | `skills/open/References/_launch.md` is a generic Launch Protocol: write `LAUNCH.md` beside `CONTRACT.md`, announce in one line so the user can veto, run the build in a fresh context. Optional; nothing in `/open` or `/close` requires it. | Tune the thresholds (they are starting values) or ignore the file. `examples/LAUNCH.example.md` shows a brief. |

## Per pack

Only changes specific to one pack are listed. Everything in the table above applies on top.

### day

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A Flow Plan bridge field named for the external-tool mirror, and a day-note mirror in an external notes tool, written during close. | Field renamed `External mirror:` with values proposed, gated or skipped. A mirror of the day note is proposed only after the Flow Plan is written and the drain is complete. Reads from external tools hydrate context; writes are described-gated. | Swap in a concrete tool (a daily note, a task app). Rename the field back if a parser of yours expects another key, or drop it (see Open choices). |
| A sprint health check with a legacy field, an actuals-table fallback and a read of an older sprint file location. | The check runs as a method over `sprint_id`, `state` and `last_check` in `SPRINT.md`. The fallback and the legacy location are gone. | Add a migration read if an older sprint file lives somewhere else in your setup. |
| An absorbed day-start skill, a daily-planning line and a ported shutdown skill. | "If you keep a separate day-start skill, do not call it as a second ceremony." The pack has no dependency on a separate shutdown skill. | Name your own day-start or shutdown skill and say which owns what. |
| The basics offer listed specific routine items; quiet hours were fixed. | Basics read "water, food, any daily basics the user relies on". Quiet hours are a default and adjustable, and cover sound or voice notifications. | Put your own basics and hours in the pack. |
| Optional reads named specific private files; a milestone lifecycle scan assumed milestones were tracked. | "Optional context reads (for example your goals file, if you keep one)" and "a milestone scan (if milestones are tracked)". | Name the sources you actually use. |
| The private name for the low-friction list appeared in several offers. | "Low-friction list" and "want-to or low-friction options". | Rename to your own term. |

### session

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A work-session operating procedure kept in an external notes tool was the doctrine source for timing. | "Flowtime doctrine supplies the timing rules; do not invent a new timer scheme." | Cite your own session procedure in that gate. |
| Private names for focus states and modes. | "Deep-focus", "deep-focus exit review", "low-friction mode". | Rename to taste. |
| NMIT was used bare. | Glossed once as "next most important thing" (precondition 1 and the closing line). | Drop the gloss if your router defines it. |
| Notification and focus wiring pointed at platform-specific tools. | Kept, marked "future wiring point only". | Add the equivalent for your platform or leave it as a note. |
| A park note could be copied into an external notes tool. | Gotcha 10: a park note copied into an external tool must carry the file path, or the copy looks primary. | n/a, keep it if you add any mirror. |

### week

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A week bridge field named for the external-tool mirror, and an external-tool week node (defined in the schema but not live, with a "skipped: no verified week node" status). | Field renamed `External mirror`. The week-closure mirror stays described-gated; the file bridge closes the loop even when external tools are down. | Add your own week record in a tool, gated. Keep or drop the field (see Open choices). |
| The calendar source was never named. | Unchanged: "the calendar", read-only, an outage never blocks. | Wire a calendar reader if you want it automatic. |
| A standards gate cited a private registry. | Kept as a general gate (the G-tier gate count stays at one). | n/a |

### sprint

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A legacy sprint file location, a migration read at open, and a "do not write the old file" rule. | All dropped. Step 2 reports that no sprint file exists yet if `SPRINT.md` is absent. The one-state-file lesson stays: do not keep a second active sprint state file. | Re-add a migration read if you already keep a sprint file elsewhere. |
| `sprint_immune_system: active` was read by the day-start skill's health check. | The field is still written at open, but the day route now runs the check itself and reads `sprint_id`, `state` and `last_check`. A wiring line says to keep the `SPRINT.md` path stable. | Keep the field if you add a reader; otherwise drop it (see Open choices). |
| Two slash commands (restart, status) were ported by file. | The method is kept without the file names: restore keeps identity, new generates a fresh ID and counter; status is read-only. | Add the two commands if you want them. |
| The task-source precedence list started with an external task hub. | Same order: your task list or tracker if reachable, then optional `work.json` active contracts, then open-session entries in your project registry, then "the workbench" (your holding area for candidate work). | Add or reorder sources. |
| An external-tool `#sprint` record with a field list, plus lock and unlock design-doc references. | Cut. The canonical file wins over any external mirror; mirror drift is a named gotcha. | Write a gated mirror section for your tool. |

### milestone

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| Scaffold came from the work-artifact skill. | The agent creates `CONTRACT.md` (`phase: open`), `LEARNING.md` and `.gitignore` itself. | Replace with a skill-authored scaffold if you build one. |
| A dry-run through a taxonomy and parent-linkage service, plus a classifier playbook for folder and milestone altitude. | The service step is gone and steps are renumbered. "If you keep a classifier note for folder and milestone altitude (search your knowledge notes), apply it." The classifier table itself was not ported. | Write that classifier note. |
| A legacy multi-step promotion chain after close. | One step: route milestone learnings through the Learning Router; do not invent a separate promotion chain. | n/a |
| Per-criterion checkpoint commits were assumed by a hook. | The pack does not promise them unless a checkpoint mechanism is verifiably running. | Add and verify a hook. |
| A state-sync catechism extension. | Cut; extensions renumbered 1..4. | n/a |
| NMIT on the closing line. | Spelled "NMIT (next most important thing)". | Revert if your router defines it. |

### project

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A registry stub was created at open and a goal check was staged as an external-tool motion. | The registry is optional. The pack offers a goal check against the parent goal in your goals file; goal edits are proposed as gated file edits. | Keep a registry and a goals file to get the full behaviour. |
| Two named playbooks on project status and seams. | Named playbooks dropped: "your knowledge notes can supply project-status and seam playbooks". | Write equivalents. |
| Learnings drained into a knowledge folder for a canon loop. | "Drain handoff" (a `Drained/` folder in your knowledge notes, or a queue note) for a later harvest. The bridge carries `drain_handoff`. | Define the folder and the harvest job (see Open choices). |
| Playbooks followed a private retrieval schema file. | The fields are listed inline in the pack (`title`, `slug`, `type: playbook`, `description`, inline-array `tags` and `related`) with the reason: multi-line YAML lists are dropped by simple parsers. | n/a |
| Document review, root-cause analysis and executive summary were named skills. | "A document review (a structured read of the plan)", "formal root-cause analysis", "an executive summary". | Name your own. |
| Other packs cite this pack by position. | Do not reorder Preconditions: the goal pack refers to item 5 (the parent-goal source line). | Update `goal.md` if you reorder. |

### client

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| First open was detected by looking up client-organisation and client-project types in the external tool's schema. | Record-first: no organisation, people and project note in your project registry or client folder means this is a first open. | Add a live lookup against your CRM or notes tool. |
| A meeting-recording product was named throughout. | "Meeting recorder", "meeting transcript", "meeting recording", so any recorder works. | Name yours where the steps use the generic term. |
| Deal recap, proposal builder, agreement front door, stakeholder navigation and a voice-of-customer mining skill were named. | Generic names: "a deal recap", "your proposal workflow", "a written agreement on objectives, measures and value with the buyer (Alan Weiss's Conceptual Agreement method)", "a stakeholder map of the buying committee", "voice-of-customer mining" with a short gloss. | Name your skills in those steps. |
| Relationship-network updates were staged as described-gated external-tool motions. | Relationship-network updates stay gated previews with file evidence first; any external mirror is gated and may lag. | Wire a CRM write, gated. |
| A gotcha about uncertain frontmatter in a sibling skill. | Rewritten as the general lesson: read a separate skill's description and triggers before relying on auto-invocation. | n/a |
| Bridge updates cited private sources. | "Bridge updates include source paths when a specific source shaped the decision." | n/a |

### deal

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| Each deal had a canonical folder in a business-records tree (`deal_dir`). | `deal_dir` is "the deal directory: one folder per buyer", with a suggested default `${OPEN_CLOSE_WORK_DIR:-~/work}/deals/<buyer-slug>/`. The default is the kit's suggestion, not the source's. | Set `deal_dir` to wherever you keep deal files. |
| Private skills produced named artifacts (agreement, intelligence, strategy, engagement-state files). | Named by role only: the written agreement, deal intelligence, deal strategy, transcripts, recaps and any engagement-state file. | Pick your own file names. |
| The deal recap and discovery prep took flags and "mode" letters. | Method only: "write a deal recap from that evidence alone", "discovery prep in its post-interest call-prep mode". The lesson stays: point the recap at the deal directory, never the session run folder. | Restore flags if your recap tool has them. |
| A stakeholder-map completeness gate used a fixed threshold. | "A Conceptual Agreement (CA) completeness gate (for example 80% of the agreement fields filled with evidence)". | Set your own threshold and what it counts. |
| Loss retro used a private template. | The four lenses (Story, Proof, Product, Procurement; see the deal pack) stay, answered from evidence. | Add your own retro template. |
| Close ended with a second-model audit. | Optional "Independent close audit" (see kit-wide). The final write takes `closed_at` from the system clock. | See kit-wide audit row. |

### research-project

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| The argument graph was a set of typed external-tool records (project, question, claim, hypothesis, evidence, finding) joined by typed links. | A plain file, `ARGUMENT-GRAPH.md`, in the run folder: Questions (a sub-heading each), then claims and hypotheses, evidence lines (source and stance), Findings, Objections, Open questions. Short ids (Q1, C1, E1) stand in for typed joins; `by: agent` or `by: user` stands in for authorship. The file is primary and any mirror is optional and gated. `examples/ARGUMENT-GRAPH.example.md` shows it. | Mirror the file into a database or external-tool and map sections to record types; keep the file primary. |
| A drift check looked for findings with no project join. | It looks for findings that cite no evidence. | n/a |
| A placement-first argument-mapping playbook was a wiring item. | Cut, because the playbook is not in the kit. The placement rule itself stays in Preconditions 4, Step 8 and Gate 6. | Write the playbook and link it from Wiring. |
| Two gotchas about external-tool field types. | Cut. Gotchas on duplicate roots, over-typing, source-like objects and agent-authored entries stay, reworded ("mark who wrote each entry"). | n/a |
| Research and science skills were named. | "A research workflow (your deep-research or multi-source search tooling, if you have one)" and "the scientific method (hypothesis, prediction, test, verdict)", pointing to the `experiment` route as the lean wrapper. | Name your own. |
| `brief` is offered as a follow-on route. | Kept; if you do not ship `brief`, change the offer to "a source workflow". | n/a |

### brief

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| The intake packet's "typed wrapper" borrowed concepts from a source spec and imported its vocabulary. | "The typed wrapper (an intake packet carrying a route manifest) is a shape, not a vocabulary; no tokens from any other system are imported." Spec ids are dropped, the rule is kept. | n/a |
| Two wiring lines said the lane reused a wrapper concept from a workbench lane. | Cut; open and close wiring both renumbered 1..6. | n/a |
| A gotcha pointed to a sibling research skill by name. | "A separate research project with its own stated terminal condition." | Name the skill you use. |
| Later canon loops processed the brief's routed learnings. | "Anything that processes routed learnings after close (your knowledge-note upkeep, if any) is outside this pack." | Name your upkeep job. |
| The `owner` field in `brief_input` and `brief_receipt`. | Kept verbatim; it means the brief's owner, not a person's name. | n/a |

### conversation

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| Open recall called a private session-search tool over a session registry, run folders and git history | "recall": search recent session transcripts, run folders, contract titles and `git log` | point the agent at your own search tool or a transcript index |
| Open and close listed the source's named SessionStart and SessionEnd hooks one by one | one line: hooks are complements; the pack does not duplicate them | list your own hooks in the Wiring section if you have them |
| Close ran the source loop's learn step and completed a richer work artifact through its own skill | close runs the Learning Router once and edits `CONTRACT.md` directly; `phase: complete` only when every criterion is checked | if your agent loop has its own learn step, run only one of the two (GOTCHAS 2) |
| Close also staged rule candidates into a private rule registry with a dedup tool | cut (catechism base items renumbered 1-4) | add your own item to `_catechism-base.md` if you keep a rule registry |
| The bridge field for the work artifact was named after the source's artifact | `contract_path` (`CONTRACT.md` or `none`); `learning_router_version: catechism-base` | rename freely; the next open reads whatever your close writes |
| The bridge slot gotchas cited dated private cases | kept as general rules: never clobber a fresher bridge; compare mtime, prefer a named variant `conversation-next-<topic>.md` | none needed |
| An arg naming a bridge variant was implicit | open precondition 3 says an arg naming `conversation-next-<topic>.md` selects it | none needed |

### skill

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A family of private skills handled scaffolding, validating, testing, improving, tuning the description and cleaning layout. | One generic workflow, defined once in Precondition 3: "your skill-authoring workflow (for example Anthropic's `skill-creator` skill): scaffold, validate, test with-skill against a baseline, tune the description". Layout cleanup is named as "structure cleanup" because `skill-creator` has no direct equivalent. The kit does not claim it has a separate validate command. | Name your own skills and restore per-step names if yours split validate, test, improve and optimise. |
| Private skill-system rules (directory naming, description length, a "USE WHEN" trigger convention, a skill index to keep consistent). | "Your skill conventions (directory naming, frontmatter, description rules, progressive disclosure)", "a clear when-to-use trigger", "layout and documentation consistency". | Point Close Precondition 5 and Step 4 at your house rules file. |
| A single-line description rule from the private skill system. | Kept as cheap, parser-safe practice, not a format requirement. | Relax it if you prefer multi-line descriptions (see Open choices). |
| Hooks that checked documentation integrity and completion claims were named. | Categories only, treated as complements. The pack still reports evidence before claiming a close state. | Add your hook inventory. |
| Evals skill and personal customizations path. | "A repeatable evaluation harness (your own eval scripts, or the with-skill versus baseline runs of the workflow)" and "personal customizations kept separately". The suggested commit message `close(skill): <skill-name>` stays. | Name your harness. |

### experiment

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| The argument graph lived in an external notes tool with extra record types for tests, assessments, feedback and decisions. | Step 8 edits the same `ARGUMENT-GRAPH.md` the parent research project uses (question entry, hypothesis as a claim beneath it, prediction as plain text, empty evidence slot); findings go in its Findings section. Test, assessment, feedback and decision records have no file equivalent; the receipt and bridge carry that content. | Add typed records in a tool and mirror from the file. |
| Experiment design and full-cycle workflows came from a named science skill. | "A structured experiment-design workflow (goal, hypothesis, design, measurement, analysis, iteration)" and "a scientific-method workflow". | Name your own. |
| Bet bounds: guardrail, practical-significance bound, trust check, cannot-establish, and the `void` versus `not run` distinction. | Kept verbatim. This is the pack's core method and it is general. | n/a |
| "Owner context" in the compact card. | "Who owns the test", to avoid clashing with the kit-wide meaning of "owner". | n/a |
| Memory-pollution gotcha mentioned finding records. | "Note pollution"; "finding" untagged. | n/a |
| No audit item in the source. | None added; the bridge carries no `audit_*` fields. | Add one if you want an audit here. |

### direction

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| The second harvest axis had a private name. | Renamed "personal signal" (bridge heading `Personal signal`). Definition unchanged: energy, interest, friction, avoidance, momentum, values fit, whether the frame invited better work. | Pick another name and change it in every place at once. |
| The bridge schema had an external-tool mirror heading. | Dropped; the schema is 12 headings. Close step on staging mirror proposals is cut and close steps run 1..16. | Add the heading back if you add a mirror. |
| The Direction Loop protocol lived in an external workbench design file. | The pack carries the protocol itself (Preconditions item 5). | n/a |
| Route offers named `research-project`, `experiment`, `brief`, `week` and `sprint`. | Kept as route names. | Drop offers for routes you do not ship. |
| A project-shape label came from an external-tool tag name. | "Hobby-shaped", matching the project pack. | n/a |

### goal

| Source behaviour | Kit behaviour | To restore or extend |
|---|---|---|
| A life-goals file was canonical and an external-tool record was a pointer to it. | One home, no second mirror. Bridge field `home` (singular) replaces `homes`. A goal found only elsewhere is a finding, proposed as an edit to the goals file, never a second home. | If you want a mirror, add a gated section and restore `homes`. |
| A goals file was required. | Optional. Without one, `goal-next.md` is the canonical home. | Require one if your setup always has it (see Open choices). |
| Goal ids were external-tool ids or file ids. | The goal id from your goals file (for example `G1`) or a title fragment. | n/a |
| The child census read an external notes tool, a registry and project artifacts. | Registry `parent_goal`, work contracts and `goal-next*.md`. The kit adds one clause: offer to re-parent each orphan as a file edit. | Remove the clause if you want a pure census. |
| A goals-management skill edited the file. | The agent reads and edits the goals file directly; a goals-management skill is an optional delegate. A lessons file (for example `LESSONS.md`) is optional; the bridge `lesson` field is always written. | Name your own skill and file. |
| Glossed jargon: "PACT-shaped", "glass or rubber". | "PACT-shaped" glossed as "a repeatable action with a threshold" (not expanded as an acronym); "glass or rubber" kept with a parenthetical. Examples are generic (a daily writing habit, regular cooking). No independent blindspot-audit item. | n/a |

## Mods

The two mods (warm-close, launch-copy) and their limits are in `mods/NOTES.md`. warm-close relies on conversation precondition 9 (`--checkpoint`); launch-copy relies on the LAUNCH.md Stamp convention in `skills/open/References/_launch.md`.

## Open choices you may want to make

- **Independent blindspot audit.** Keep it optional, wire a real second-model CLI, or cut it. Cutting means removing the catechism item in milestone, project and research-project (and the close audit in deal), the `audit_slug` and `audit_run_id` bridge fields, and the clause in each close step, all together.
- **`deal_dir` default.** `${OPEN_CLOSE_WORK_DIR:-~/work}/deals/<buyer-slug>/` is the kit's suggestion; change it in the deal pack's Precondition 6 and Bridge 1.
- **`sprint_immune_system` key.** `sprint` writes it and nothing reads it by that name now (the day route reads `sprint_id`, `state` and `last_check`). Keep it as a marker, add a reader, or drop it from sprint open step 6.
- **`External mirror` bridge field** in the day Flow Plan, the week bridge and the sprint bridge. Keep it (records proposed, gated or skipped), rename it, or drop it if you will never mirror.
- **Where drained learnings go.** The project pack's `drain_handoff` points at a `Drained/` folder in your knowledge notes or a queue note. Name a real location, and a harvest job if you want one.
- **Goals file required or optional.** The goal pack works without one; require it if you always keep one, and decide whether to keep the added orphan re-parent offer.
- **Where the argument graph lives.** `ARGUMENT-GRAPH.md` is defined in research-project and reused by experiment. Keep it as a file, or move it to typed records in a tool and keep the file as the fallback.
- **Deal pack thresholds and lenses.** Define the completeness threshold the source set at 80%.
- **Route set and names.** Direction and research-project offer routes by name (`research-project`, `experiment`, `brief`, `week`, `sprint`). Trim offers for routes you do not ship, and rename the direction pack's "personal signal" if you prefer another word.
- **Single-line skill descriptions.** The skill pack asks for them as practice. Relax that if your skill format and tooling take multi-line descriptions.
