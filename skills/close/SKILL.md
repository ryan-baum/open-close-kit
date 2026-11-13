---
name: close
description: USE WHEN the user asks to close work: "wrap up", "shut down my day", "close this milestone", "end of sprint", "before we close". NOT FOR closing files/apps/windows, git close, or "close the PR".
---

<!-- NAMING (do not "fix"): the skill name is lowercase `close` and must MATCH commands/close.md, so the / picker shows one /close entry rather than two (check this on your install: if you see two, delete commands/close.md). Sibling: `open`. -->

# /close Router

Bottom Line Up Front (BLUF): Route the user's close motion to the one canonical pack in `~/.claude/skills/open/References/`; do not perform the ceremony in this router.

COUNTERPART: the `open` skill is the open router. It owns every shared pack; the `close` skill only selects and loads the close side of that pack.

DECISION BUDGET: close=0 for a direct route; close<=1 for missing-argument or route ambiguity resolution; bare menu navigation is excluded; [R]-tier routing stays <=1 decision.

## Route Table

| token | aliases | pack path | close semantics |
|---|---|---|---|
| `day` | `d`, `today` | `~/.claude/skills/open/References/day.md` | Shutdown: park actives, write the day bridge, triage capture, dispatch agents, stage day close, cue the off-work boundary. |
| `session` | `s`, `block`, `work` | `~/.claude/skills/open/References/session.md` | Plan-vs-actual, park ritual, next-session plan, parking-lot triage, physical reset and break. |
| `week` | `w` | `~/.claude/skills/open/References/week.md` | Weekly review: compressed GATHER/SENSE/DECIDE, celebrate-and-reroute retro, carryover as a decision. |
| `sprint` | `sp` | `~/.claude/skills/open/References/sprint.md` | Review against locked criteria, triage carryover by explicit re-decision, close `SPRINT.md` state. |
| `milestone` | `m`, `ms` | `~/.claude/skills/open/References/milestone.md` | Check work-contract completeness, verify the work, run the Learning Router, inform the parent. |
| `project` | `p`, `proj` | `~/.claude/skills/open/References/project.md` | Final work-contract check, promote findable playbooks, inform next projects, check goals, drain remaining loops. |
| `client` | `c` | `~/.claude/skills/open/References/client.md` | Mine transcripts and recaps, run business controls, verify the invoice source, stage testimonial, voice-of-customer and access motions. |
| `deal` | `dl` | `~/.claude/skills/open/References/deal.md` | Close the sales motion: verdict won/lost/no-decision; won bridges to `/open client`; lost runs the Story/Proof/Product/Procurement loss retro and a re-engage trigger. |
| `research-project` | `rp`, `research` | `~/.claude/skills/open/References/research-project.md` | Finalize the argument graph, write the synthesis, carry open questions, file sources. |
| `brief` | `b` | `~/.claude/skills/open/References/brief.md` | Receipt close: what shipped, sources and claims used, unknowns, learnings. |
| `conversation` | `conv`, `chat` | `~/.claude/skills/open/References/conversation.md` | Full Close Catechism and one Learning Router execution; the default path asks the user zero questions. |
| `skill` | `sk` | `~/.claude/skills/open/References/skill.md` | Routing-only glue: your skill-authoring workflow's test and description tuning, then registry and docs consistency. |
| `experiment` | `ex`, `exp` | `~/.claude/skills/open/References/experiment.md` | Record the verdict, file the finding, harvest the surprise. |
| `direction` | `dir` | `~/.claude/skills/open/References/direction.md` | Lock direction, write the prediction, choose probes, honor altitude cadence. |
| `goal` | `g`, `goals` | `~/.claude/skills/open/References/goal.md` | Verify the done-condition, reconcile every child project, update the goals file, harvest what the goal taught. |

## Invocation Protocol

1. [agent] [R] Parse `/close <route-or-alias> [args...]` case-insensitively; resolve aliases before canonical tokens.
2. [agent] [R] If the first token is `help`, print the Route Table, Bare `/close` Menu, Direct Route Handling, and Gotchas; also mention the `open` skill as the counterpart.
3. [agent] [R] If the first token is a known route or alias, load only `~/.claude/skills/open/References/<route>.md`, pass the remaining args through, and execute that pack's `## CLOSE` section.
4. [agent] [R] If the token is unknown, run Unknown Token Handling; Known Redirects are checked before fuzzy suggestions and never fall back silently.
5. [USER-DECISION] [R] If two plausible routes remain after suggestions, ask one AskUserQuestion and route only after the user chooses.
6. [agent] [R] If a direct route is missing a required argument and multiple active candidates exist, ask one AskUserQuestion; otherwise use the pack's degrade path.

## Bare `/close` Menu

1. [agent] [R] Before asking, run `bun ~/.claude/skills/open/Tools/context-clues.ts --direction close`; parse JSON ranked suggestions if it succeeds within its probe limits.
2. [agent] [R] If the clue script errors, times out, is missing, or returns no usable ranking, present the fixed grouped menu without preselection; fail open and continue.
3. [agent] [R] Ask question 1 (Q1): frequency tier, with no more than four options: `Daily`, `Cadence`, `Engagement`, `Meta/craft`.
4. [agent] [R] Ask question 2 (Q2): route within the chosen tier, with no more than four options after direction-aware regrouping.
5. [agent] [R] Conversation lives in `Daily`; if `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/work.json` shows an active run, preselect `Daily` and put `conversation` first with `(Recommended)`.
6. [agent] [R] Put the clue-ranked route first with `(Recommended)` when no active-run conversation injection supersedes it, while keeping Q2 at four options or fewer.
7. [USER-DECISION] [R] Permit `multiSelect: true` only on `/close` Q2 when stackable same-tier closes are indicated, such as `session` plus `day`; run selected packs one at a time in the chosen order.

### Tier Groups

| Q1 tier | Q2 routes |
|---|---|
| `Daily` | `day`, `session`, `conversation` |
| `Cadence` | `week`, `sprint`, `direction`, `goal` |
| `Engagement` | `deal`, `client`, `milestone`, `project` |
| `Meta/craft` | `research-project`, `skill`, `experiment`, `brief` |

## Known Redirects

These tokens are known-but-rejected close route names. They NEVER fall to fuzzy matching: state the one-line reminder, then run the close side of the covering route (or stop, for reminder-only rows).

| token | behavior |
|---|---|
| content | remind "content is covered by brief for now; may become its own route later" then run `/close brief` |
| quarter | remind "quarter folds into the seasonal direction loop" then run `/close direction` |
| practice | remind "practices season-shift via direction; they never open/close (a practice has a liveness, not a done state)" then run `/close direction` |
| area | remind "practices season-shift via direction; they never open/close (a practice has a liveness, not a done state)" then run `/close direction` |
| reading, learning | reminder only, no route: "reading and learning have no open/close; they surface through NMIT" |
| break, rest | reminder only: "break protocol lives inside session close (park ritual, a break of about 20% of the time worked) and day tiers" |

## Unknown Token Handling

1. [agent] [R] Check Known Redirects first; if there is no match, compare the unknown token against every route token and alias after lowercasing and punctuation cleanup.
2. [agent] [R] If one closest match is dominant, show: `Unknown /close route "<input>". Did you mean /close <route>?` and wait for explicit confirmation before loading a pack.
3. [USER-DECISION] [R] If two or more plausible matches tie, ask one AskUserQuestion with those routes; do not choose on the user's behalf.
4. [agent] [R] If no plausible match exists, show `/close help` style route table guidance and end router work.

## Direct Route Handling

- [agent] [R] Preserve the user's supplied args exactly when passing them to the pack.
- [agent] [R] Keep the router thin: never inline catechism items, bridge details, mirror motions, or route-specific ceremony steps here.
- [agent] [R] Treat every external-mirror motion as described-gated: describe the proposed motion and gate it; never perform a live write from the router.
- [agent] [R] Lighter tiers trim ceremony scope, never standards.

## Invariants Pointer

- [agent] [R] Every loaded pack owns its own declared decision budget, [G]/[Y]/[R] tiers, close-to-open bridge, and Close Catechism extension.
- [agent] [R] Every loaded pack references `~/.claude/skills/open/References/_catechism-base.md`; conversation runs the base in full.
- [agent] [R] Every loaded pack keeps bridge artifacts file-primary under `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/` unless that pack pins a more specific file.
- [agent] [R] Use offered menus, neutral carryover language, drain-before-stamp for day (open loops moved out before the day is marked done), hydrate-don't-expand for open counterparts (load what exists before adding scope), verify-drain-reduce for close (verify, drain open loops, reduce carryover), and reuse-over-rebuild.
- [agent] [R] This router reads the run's work contract at close; the contract's phase changes only inside a pack's close steps.

## Gotchas

- Cross-skill pack loading is intentional: the `close` skill has no pack directory of its own; the `open` skill owns all packs at `~/.claude/skills/open/References/<route>.md`.
- The Close Catechism base path is `~/.claude/skills/open/References/_catechism-base.md`; do not copy the base into this router or into the `close` skill. The Learning Router table lives in that same file.
- Close-conversation's default path asks the user zero questions: the agent answers the catechism sweep first, then surfaces findings and any gated choices.
- The clue script is shared and fail-open: `~/.claude/skills/open/Tools/context-clues.ts --direction close` can improve ordering, but it must never block routing.
- External mirrors are never the source of truth; describe-gated staging protects the file-primary bridge.
- This router carries routing logic only; route-specific notes stay in each pack's `GOTCHAS`.
- **A /close never shrinks silently.** Never put ceremony-scope words ("keep it light", "quick close", "abbreviated") into the args you pass to a pack unless the user said them; a self-written scope note reads as authorization and isn't. `/close conversation` runs `_catechism-base.md` IN FULL, and its Learning Router table as written (never a home-made keep/skip taxonomy). If budget genuinely binds (for example the context window is nearly full), say so BEFORE closing, with the exact items you propose to skip and why, and let the user overrule. Every close report enumerates base items 1-4, each marked DONE, BLOCKED (with the unblock) or SKIPPED (with the reason); an item missing from that list is a defect, not a choice. *(The failure this prevents is real: a close at high context use once compressed or dropped most of the catechism without saying so.)*
- **After changing the catechism or a route pack, run `/close conversation` once as the integration test, and read the commit proposal for files you did not write.** A proposal that names a directory instead of files can silently absorb another session's files working in the same directory; name files, not directories.
- **A close in a chat that LAUNCHED its run elsewhere leaves the work-contract phase alone.** When the run folder has a `LAUNCH.md` beside `CONTRACT.md` and its lane is L3 or L3c (see `~/.claude/skills/open/References/_launch.md`), the launched chat owns the run's completion; a `/close conversation` in the intake chat runs every item but treats completion as `--checkpoint` does (conversation precondition 9): one Decisions line, `phase` unchanged. Otherwise the run is marked complete while its launched chat is still building. An L2 run is not covered: it runs in this same chat after `/compact`, so a close there is the launched context and completes normally.
