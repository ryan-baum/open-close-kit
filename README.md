# open-close kit for Claude Code

Two skills, `/open` and `/close`, that give every kind of work a start ritual and an end ritual: a day, a work session, a week, a sprint, a milestone, a project, a client, a deal, a research project, a brief, a skill, an experiment, a seasonal direction, a goal, or just a conversation. Each **open** loads the right context and sets one next move. Each **close** checks what was done, routes what was learned to where it will be found again, proposes commits, and writes a small **bridge** file that the next open reads. That last part is how the next chat picks up where this one stopped.

The method in one breath: offers, not demands; decision budgets (most closes ask you nothing); three capacity tiers (`[G]` full, `[Y]` core, `[R]` minimum that keeps state true); files are the source of truth; nothing is written to another tool or pushed without your explicit go.

Adapted from the author's own Claude Code setup, with every private detail generalized or removed. Shared as-is: there is no support, and issues are turned off. Fork it and make it yours. MIT licence (see `LICENSE`).

## What is in the box

| Path | What it is |
|---|---|
| `skills/open/SKILL.md`, `skills/close/SKILL.md` | the two routers: route table, aliases, bare menu, guards |
| `skills/open/References/<route>.md` | one pack per route (15), each with `## OPEN`, `## CLOSE`, `## BRIDGE`, `## GATES`, `## GOTCHAS` |
| `skills/open/References/_catechism-base.md` | the shared close checklist (4 items) and the **Learning Router** table |
| `skills/open/References/_launch.md` | optional: the LAUNCH.md brief for handing a build to a fresh context |
| `skills/open/Tools/context-clues.ts` (+ test) | optional helper (needs [bun](https://bun.sh)): ranks the bare `/open` and `/close` menus from time of day, active run and sprint state; fails open |
| `commands/open.md`, `commands/close.md` | slash-command shims so `/open` and `/close` show once in the picker |
| `examples/` | a bridge file, a work contract, a `work.json`, a LAUNCH.md, an argument graph |
| `ADAPT.md` | what was simplified from the original setup, and how to extend it |
| `mods/NOTES.md` | how two Claude Code mods automate parts of this (an idle auto-close, a LAUNCH.md clipboard copy), with their limits |
| `mods/source/` | the source of those two mods (optional; if you delete it, delete `.claude-plugin/` too) |
| `.claude-plugin/marketplace.json` | lists the two mods as a plugin marketplace, so Claude Code can install them from this repo |
| `install.sh` | copies the skills and commands into `~/.claude` |
| `LICENSE` | MIT |

## Install (about 10 minutes)

1. Clone or download this repo anywhere, and look before you install: `skills/open/SKILL.md` and `skills/open/References/conversation.md` are the two files to read first.
2. Install:
   ```bash
   bash install.sh
   ```
   It copies `skills/open`, `skills/close` and the two commands into `~/.claude`, creates the state dir, and runs the helper's tests if `bun` is installed. It refuses to overwrite an existing `open` or `close` skill unless you pass `--force` (`bash install.sh --force`) (the old copies are moved to `~/.claude/open-close-backups/<time>/`, outside the skills folder, so they never load as a second `/open`).
3. Optional settings (in your shell profile, or `env` in `~/.claude/settings.json`):
   - `OPEN_CLOSE_STATE_DIR`: where bridge files live (default `~/.claude/open-close`).
   - `OPEN_CLOSE_WORK_DIR`: where run folders are created (default `~/work`).
4. Start a NEW chat (skills load at chat start) and type `/open help`.

Try it: `/open conversation <what you want to do>`, work a little, then `/close conversation`. Read the close report: four base items, a Learning Router inventory, a commit proposal (nothing committed), and a bridge at `~/.claude/open-close/conversation-next.md`. The next `/open conversation` reads that bridge.

## Ideas you will meet

- **Run**: a piece of substantive work with its own folder, `${OPEN_CLOSE_WORK_DIR:-~/work}/<YYYYMMDD-HHMMSS_slug>/`, and one **work contract** inside it, `CONTRACT.md` (goal, checkable criteria, `phase:`, decisions, changelog). See `examples/CONTRACT.example.md`. Milestone, project and research routes create one; a conversation close completes it only when every criterion is checked.
- **Bridge**: the small file a close writes and the next open reads (`conversation-next.md`, `session-next.md`, ...). File state always wins.
- **Learning Router**: one table, run once per close, that decides where each learning goes (a knowledge note, `CLAUDE.md`, a skill's Gotchas, ...) or, by default, nowhere. Anything touching identity, doctrine, hooks or permissions is only ever proposed to you.
- **`--checkpoint`**: `/close conversation --checkpoint` runs the whole close but leaves the run open, for a conversation you will continue.
- **NMIT**: the next most important thing; every open ends on one.
- **Flow Plan**: the day's plan file, written by `/close day` and read by the next `/open day`.
- **Glass balls and rubber balls**: a glass ball breaks if dropped (a deadline, a promise to someone); a rubber ball bounces. Every scan for what is still in the air looks for glass balls first.

## What you will want to adapt

The packs refer to things you may not have yet, always as optional: a project registry (`PROJECTS.md`), a goals file (`GOALS.md`), a knowledge notes folder, a calendar, a meeting recorder, a task app. Each pack degrades when one is missing. `ADAPT.md` lists every simplification and how to wire your own tools back in. Paths in the Learning Router table (`_catechism-base.md`) are suggestions: point them at where you keep notes.

## Why the skills install by copy, not as a plugin

A plugin's skills are always prefixed with the plugin's name (`/open-close:open`), and these are meant to be typed as plain `/open` and `/close`. So `install.sh` copies them into `~/.claude`. The two mods are different: they are plugins by nature, and `mods/NOTES.md` explains how to install them from this repo's marketplace.

## Requirements, and what has been tested

| Piece | Needs | Tested on |
|---|---|---|
| `/open`, `/close` | Claude Code with skills and slash commands; `bash` for `install.sh` | macOS, Claude Code 2.1.321, desktop app: `install.sh` tested from a fresh clone into an empty home folder; this copy has not yet been run end to end in a chat (the terminal is untested) |
| clue helper | [bun](https://bun.sh) (optional; the menus work without it) | macOS |
| warm-close, launch-copy | a Claude Code engine with mod (hooks module) support; on the desktop app, launch-copy copies through macOS `pbcopy`, so its desktop copy is macOS-only | macOS desktop app only; Linux and Windows are untested |

Read `mods/NOTES.md` before installing either mod.
