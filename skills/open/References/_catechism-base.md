# Close Catechism Base

## Embed Convention

This file is the single shared closeout spine for every `/close` route.
Route packs reference this file from `## CLOSE` / `### Catechism`.
Route packs do not copy these base items.
Each route pack adds route-specific extensions in its own `### Catechism` block.
That extension block contains at least two route-specific items.
`conversation` is the exception: it runs the base in full and says so.
Extensions stay delimited so later sweeps can find route-specific logic.
This file also holds the **Learning Router** table every close uses; packs cite it and never rebuild it.

Recommended route-pack pattern:

```markdown
### Catechism
Base: run `~/.claude/skills/open/References/_catechism-base.md`.

<!-- route-catechism-extension:start -->
1. [agent][R] **<route item>** -- <agent-run sweep, finding, or proposal>.
2. [agent][Y] **<route item>** -- <agent-run sweep, finding, or proposal>.
<!-- route-catechism-extension:end -->
```

## Operating Contract

The agent answers each catechism item itself first.
It performs the sweep, then presents findings, proposals, and clear skip reasons.
It never hands these items back to the user as default questions.
External mirrors are always gated: if you mirror state into another tool (an outliner, a task app, a CRM), describe the intended change and wait for an explicit go before any live write. Never invent an id in another tool; look it up at use or leave the mirror out.
Every route pack declares a decision budget per direction; menu picks are excluded.
The `[R]` close path uses no more than one `[USER-DECISION]` step.
Use offers and menus; keep wording neutral: an open item is a fact, not a debt.
Lighter tiers trim ceremony scope, never standards.

## Closed Vocabulary

Actor tags: `[agent]`, `[USER-DECISION]`.
Minimum-tier tags: `[G]`, `[Y]`, `[R]`.
A catechism step includes exactly one actor tag and exactly one minimum-tier tag.
`[R]` runs at every tier.
`[Y]` runs at `[Y]` and `[G]`.
`[G]` runs at `[G]` only.
Read the tiers as the user's capacity today: `[G]` green (full ceremony), `[Y]` yellow (the core), `[R]` red (the minimum that keeps state true).
Route packs may add detail, but they keep this vocabulary exact.

## Base Catechism Items

1. [agent][R] **Commits and provenance** -- Inspect uncommitted work in every repo this session wrote to. Present a scoped commit proposal as a DRY RUN: per repo, the exact FILES this session wrote (never a whole repo, never a directory when another session may be writing in it) and a one-line message. A proposal that lists a file you did not write means someone else is working there: drop it. Committing is a separately gated follow-up and never part of the zero-question default path; pushing is never part of a close. Verify that any logic ported from elsewhere says where it came from, and cite missing provenance as a finding. When the session itself got something wrong, report both the fix for this case and the change that would stop it happening again.

2. [agent][R] **Memory routing sweep** -- Run the Learning Router (below) over the session or thing being closed. Sweep learnings, playbooks, skill Gotchas, the knowledge library (`_knowledge.md`), relationship notes, and project-registry state. Present a KEEP/SKIP inventory, not questions.

3. [agent][Y] **Collaboration meta-insights (just-in-time routed)** -- Harvest process, prompting, sequencing, delegation, and review patterns worth reusing. Route each by WHERE IT WILL FIRE at the moment of use, not where it taxonomically belongs: memory that loads every session (for example `CLAUDE.md` or the auto-memory index) for cross-session collaboration patterns; knowledge playbooks for method patterns; skill Gotchas (they load when that skill fires) for tool-specific patterns; relationship notes for interpersonal calibration. Name the chosen surface per insight and WHY it will be found there at moment of use. Present concrete candidates and explicit skips.

4. [agent][R] **"Anything I'm missing?"** -- Do the blind-spot sweep: dangling references, unverified claims, open loops without a home, and glass balls still in the air (things that break if dropped, as opposed to rubber balls that bounce). Present what was found, what was parked, and what was intentionally skipped. Include verification honesty (name any checked claim resting on a single self-report) and, when the closed thing ships something usable, one falsifiable USE bet: the observable that would prove this work is actually being used within about a week, and where to check it.

## Learning Router

Run this table exactly once per close, over candidate learnings. **The default is SKIP**: a candidate is kept only when it will change a future action. Route each KEEP to exactly one destination; never write the same learning in two places.

| type | what it is | destination (adapt the paths to your setup) |
|---|---|---|
| `knowledge` | a reusable method, finding, reference or playbook | the knowledge library (`_knowledge.md`): update the note that already covers it, or add `<Slug>.md` with its frontmatter, and write its `INDEX.md` line in the same close |
| `incident` | something that went wrong, with its cause | the knowledge library's `incidents/INC-YYYYMMDD-<slug>.md`, with an `INDEX.md` line; the narrative lives there ONLY, and any rule that came from it cites the id |
| `rule` | a standing instruction for every session | `CLAUDE.md` (global `~/.claude/CLAUDE.md`, or the project's own) |
| `gotcha` | a trap specific to one skill or tool | that skill's `SKILL.md`, under `## Gotchas` |
| `state` | where a project stands | your project registry (for example a `PROJECTS.md`), or the run's `CONTRACT.md` |
| `business` | facts about your clients, offers or market | your business notes |
| `vocab` | a term and its meaning | your definitions file (for example `DEFINITIONS.md`) |
| `identity`, `doctrine`, `hook`, `permission` | anything that changes who the agent is, its standing doctrine, a hook, or a permission | **surface to the user as a proposal; never write it** |

Before any `knowledge` or `incident` write, resolve the library folder and check its index for a note that already covers the learning (`_knowledge.md`, "update, don't duplicate"). If the library does not exist yet, create it as `_knowledge.md` says and report that.

Report the run as a KEEP/SKIP inventory: each candidate, its type, KEEP (with the destination, and `new` or `updated` for library notes) or SKIP (with the reason).

## Output Shape

The close pack reports catechism results as findings, proposals, and staged motions.
Findings name the evidence source or state that evidence was absent.
Proposals identify the owner tag: `[agent]` or `[USER-DECISION]`.
Staged motions name the destination, gate, and provenance.
Skips are explicit when no useful action exists.
The base never creates a live write to an external mirror.
