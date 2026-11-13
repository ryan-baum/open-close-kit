# The knowledge library

The one folder where reusable learnings live: methods, findings, references, playbooks and incidents. Closes write to it through the Learning Router (`_catechism-base.md`); opens read its index. Every pack that mentions the knowledge library means this folder.

## Where it is

Resolve the folder once per close or open, in this order:

1. `OPEN_CLOSE_KNOWLEDGE_DIR`, if set (point it at a notes folder you already keep).
2. Otherwise `${OPEN_CLOSE_STATE_DIR:-~/.claude/open-close}/knowledge`.

```bash
echo "${OPEN_CLOSE_KNOWLEDGE_DIR:-${OPEN_CLOSE_STATE_DIR:-$HOME/.claude/open-close}/knowledge}"
```

`install.sh` creates it with an `INDEX.md` and an `incidents/` folder. If either is missing when a close needs it (the kit was copied in by hand, or the folder was moved), create it: the folder, `incidents/`, and `INDEX.md` from `_knowledge-index.seed.md` beside this file. Say in the close report that you created it. Never create a second library somewhere else.

## Layout

```
knowledge/
  INDEX.md              one line per note; the only file an open reads by default
  <Slug>.md             one note per topic (TitleCase slug, for example ReviewBeforeMerge.md)
  incidents/INC-YYYYMMDD-<slug>.md
  Drained/              low-certainty material waiting for a later pass (project closes use it)
```

## A note

```markdown
---
title: Review before merge
type: method            # method | finding | reference | playbook | incident
tags: [git, review]     # inline array, a few words that search will hit
description: One line saying what this note lets you do, written so the index line alone is useful.
related: [OtherNote]    # slugs of related notes, inline array; [] if none
updated: 2026-01-15
---

The body: what to do, when it applies, and why. Keep the why: a rule without its reason gets ignored or misapplied.
Where it came from: the run folder, conversation or source it was learned in.
```

## The index

`INDEX.md` holds one line per note, in this shape, newest change at the bottom:

```
- [Title](Slug.md) — type · tag, tag · description
```

The line is a copy of the note's frontmatter. When a note changes, its line changes with it in the same close. A note with no index line is invisible to the next open, so a close that writes a note always writes its line.

## Before writing: update, don't duplicate

A learning goes into the library once. Before creating a note:

1. Read `INDEX.md` and look for a note on the same topic (same method, same tool, same trap), by title, tags and description. If the index is long, also search note titles and tags.
2. **Found one:** update that note. Add the new evidence or refinement to its body, keep its slug, set `updated`, and rewrite its index line if the description changed. If the new learning contradicts the note, say so in the note with the date, rather than silently replacing the old claim.
3. **Found none:** create a new note and add its index line.
4. Report which it was in the close's KEEP/SKIP inventory: `KEEP → updated ReviewBeforeMerge.md` or `KEEP → new SlowTestsInCi.md`.

Two notes that turn out to cover one topic get merged into the older one; the newer file is deleted only with the user's go, and its index line goes with it.

## Reading it at open

An open reads `INDEX.md` (it is meant to fit on a screen or two) and attaches only the notes whose line matches the work being opened. It opens a note's full text only on a match. No match is a normal result, not a finding. A brand-new library has no notes yet; the first few closes fill it.
