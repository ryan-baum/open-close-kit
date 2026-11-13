# Mods for /open and /close: what they are, what they do, how to install them

Two optional mods ship with this kit: **warm-close** and **launch-copy**. Neither is needed for `/open` and `/close` to
work. They save a step at two moments: when an idle conversation is about to lose its warm prompt cache, and when a
launch brief has been written and its pickup needs pasting. This file stands alone: if the `source/` folder beside it
was removed, everything below still explains what the mods do and what they cannot do.

## Live status

What has actually been observed in a real chat, as opposed to unit tests (both mods have full suites that pass: warm-close 257, launch-copy 274). Treat every "not run live" line as unproven on your machine.

| Mod and version | Surface | Observed live |
|---|---|---|
| warm-close 0.2.0 | desktop app | fired by itself on idle chats three times (two days, three chats); each time the chat transcript marks the `/close` prompt as sent by the mod, not typed, and the checkpoint close ran. The child-session hold has **not** run live. |
| launch-copy 0.2.0 | desktop app | **copy failed**: `$.ui.copy` answered `no-surface` and nothing reached the clipboard; no native notification. The lanes that copy nothing (`L3c`) and the over-32 KiB guard behaved as designed. |
| launch-copy 0.2.1 (pbcopy fallback) | desktop app | the footer said "pickup copied" once; the clipboard content itself was not read back. |
| launch-copy 0.2.2 (fallback under a UTF-8 locale) | desktop app | **all four cases passed** (2026-11-11, a new chat in the install folder, clipboard read back byte by byte): `L3` and no-Stamp copied the pickup exactly, `—`, `→` and `§` included; `L3c` and the over-32 KiB file left the clipboard untouched. Measured on one Mac, one run. |
| either mod | terminal | not run live here; in a terminal the engine's own type docs for `$.ui.copy` say it writes "as /copy does", so launch-copy should not need the fallback. |

Before you rely on launch-copy, run the four cases in "Check it yourself" below and read the clipboard back.

## A Claude Code mod is a plugin with a hooks module

A mod is an ordinary Claude Code plugin whose `hooks/hooks.json` lists a hooks module:

```json
{ "modules": ["./register.tsx"] }
```

The module exports `register(on, options)`. It subscribes to engine events (`on("turn.complete", …)`) and calls a
small engine API through `$` (`$.ui.status`, `$.clock.after`, `$.fs.read`, `$.command.run`, …). The engine loads the
module **when a chat starts**. A mod installed or updated in the middle of a chat does nothing in that chat; start a
new one.

`claude plugin validate <plugin folder>` checks the manifest and prints two lines worth reading: `hooks:` (every event
the mod subscribes to) and `calls:` (every `$` call it can make). Each mod's README carries those two lines, so you can
see what a mod can touch before you install it. `claude plugin test <plugin folder>` runs its tests.

## warm-close: close an idle conversation while its cache is still warm

**Check your own prompt-cache lifetime before you turn this on.** The defaults assume a 60-minute cache; on a 5-minute cache (some plans, or usage overage) the default fires at 52 minutes, long after the cache is gone, which is exactly the cold close this mod exists to avoid. Set `ttlMinutes` to your cache lifetime, or set `mode` to `notify` until you know it.

A conversation that sits idle past the prompt-cache lifetime gets
expensive to come back to: harvesting its insights later re-reads the whole context cold instead of from the cache.
warm-close runs the close for you just before that happens.

- **What it runs:** `/close conversation --checkpoint`, through `$.command.run`, at `ttlMinutes - marginMinutes` after
  your last turn (60 - 8 = 52 minutes by default). It runs a slash command, not a typed prompt, and it is on by default.
- **It needs this kit's `conversation` pack, precondition 9** (`skills/open/References/conversation.md`). That
  precondition makes `--checkpoint` a mid-conversation close: it harvests, routes and writes the bridge but never marks
  the work contract complete, so it is safe at any idle moment. It also needs the kit's `/close` command installed.
  Without them the mod's call fails (the footer reads `close failed`) or runs an ordinary close.
- **`minTurns` (default 3):** it fires only after at least that many prompts you typed since the last close. Prompts
  from subagents, child sessions, schedules or other tools do not count, so headless and SDK sessions never fire.
- **`maxPerDay` (default 6):** at most that many automatic closes per session per local day. A `/close` you type
  yourself moves the baseline, so a finished conversation is not closed again 52 minutes later.
- **Child-session hold (`childHoldMinutes`, default 120):** when this chat starts a child session (a `start_session`
  that really starts one) or messages one (`SendMessage` to a `local_…` id), it is conducting, not idle. The idle close
  is skipped until the child reports back or the hold expires. Your own typing does not end the hold.
- **Never a cold close:** if the machine slept and the timer fires after the cache already lapsed, nothing runs.
- **Modes:** `submit` (default), `notify` (only a notification, nothing runs), `off`. Any other value reads as `off`.
- **Status line:** `warm-close · armed 14:52` while armed, `warm-close · closed 14:52` after a fire.

## launch-copy: put a launch brief's pickup on the clipboard

The kit's launch protocol (`skills/open/References/_launch.md`) ends an intake chat by writing a `LAUNCH.md` brief whose
`## 1. Pickup` section holds one fenced block: the line that starts the build in a fresh context.

- **What it does:** when a file named exactly `LAUNCH.md` is written or edited through the `Write` or `Edit` tool, it
  reads the file at the end of the turn and copies the fenced block under `## 1. Pickup` to the clipboard. Your part is:
  new chat, paste, Enter.
- **It reads the lane from `## 12. Stamp`.** The Stamp must hold exactly one `lane L<n>` with one token: `L1`, `L2`, `L3`
  or `L3c`.
  - `L1` (a subagent) and `L3c` (a child session this chat starts): **nothing is copied**, and the notice says there is
    nothing to paste. Copying would invite a duplicate builder.
  - `L2`: the `/compact` line is copied for pasting in this same chat.
  - `L3`, no lane, or anything ambiguous (a list, a second mention, `lane is L3`): copied, "open a new chat and paste".
    A wrong copy is the safe error; a wrong skip is the dangerous one.
- **32 KiB guard:** a `LAUNCH.md` longer than 32768 characters is not read at all (the protocol's own cap; the parsers
  are slow on hostile input, and a hook must never hang a turn).
- **It only watches.** It never approves, denies or rewrites a tool call and never types into the prompt box.
- **Not seen:** a `LAUNCH.md` written through Bash (`cat > LAUNCH.md`) raises no `Write`/`Edit` call.
- **Modes:** `copy` (default), `notify` (a notice naming the file, nothing copied), `off`.

## Install at local scope first

The kit's root is a plugin marketplace (`.claude-plugin/marketplace.json`, marketplace name `open-close-mods`) whose two
plugins live in `source/plugins/`. Add it once, either from GitHub or from a copy of the kit you will keep (the install caches a
copy, and an update reads from the marketplace again), then install from inside the project folder where you want the
mods:

```bash
claude plugin marketplace add ryan-baum/open-close-kit
```

or, for a local copy:

```bash
claude plugin marketplace add /path/to/open-close-kit
```

then:

```bash
claude plugin install warm-close@open-close-mods --scope local
claude plugin install launch-copy@open-close-mods --scope local
```

Adding the marketplace installs nothing by itself. `--scope local` records each install for **this one project folder
only**, so the mods fire only in chats started in that folder; a chat started anywhere else does not load them. That is
the point: try a mod in one place before it touches every chat. Use `--scope user` later if you want it everywhere.

To set an option at install time, add `--config key=value` (for example `--config mode=notify`). To remove a mod:

```bash
claude plugin uninstall warm-close@open-close-mods --scope local
```

After you change a mod's files, refresh the cached copy with `claude plugin update <name>@open-close-mods --scope local`
and start a new chat.

## Limits, stated plainly

- **The desktop app has no clipboard or notification surface for mods.** It hosts the session headless, so
  `$.ui.copy` and `$.ui.notify` answer `no-surface` there. Nothing reaches the clipboard through `$.ui.copy`, and no
  native notification appears.
- **launch-copy's clipboard fallback is macOS-only.** Since 0.2.1, on a `no-surface` answer (and only that one),
  launch-copy runs the OS clipboard itself through `$.process.run` with a fixed argv and the pickup on stdin. Since 0.2.2
  that argv is `["/usr/bin/env", "LC_ALL=en_US.UTF-8", "pbcopy"]`: the desktop engine's process has no locale, and
  `pbcopy` without one reads its input as MacRoman, so `—` pasted as `‚Äî` while the mod reported success. It claims
  "copied" only on exit 0. On a Linux or Windows desktop, swap the argv in `hooks/register.tsx` for one that reads stdin
  and keeps a UTF-8 locale (for example `["/usr/bin/env", "LC_ALL=C.UTF-8", "wl-copy"]`, or the same with
  `"xclip", "-selection", "clipboard"`; Windows `clip` needs its own encoding check), update the README's paragraph that
  names the program under its `calls:` line, update the argv the tests pin, and measure a non-ASCII round-trip. Never
  use a shell string.
- **Notifications do not appear on the desktop.** The footer status line (`$.ui.status`) is the reliable channel: both
  mods say everything there, labelled with the mod's name. Never gate the status line on the start-time surface (see
  the gotchas).
- **The security guard.** If your Claude Code runs with managed settings that install a security guard, the guard closes
  many events to user mods (for example `session.compact`, `prompt.attachment`, `prompt.compose`, `tool.check`,
  `classic.*`), and **the list changes between engine versions**. A mod rerouted onto a newly closed event goes silent
  with no error. On one desktop engine version these were open: `session.start`, `session.end`, `prompt.submit`,
  `turn.complete`, `command.run`, `tool.call`; both mods use only those. Re-read the list after every engine update:
  `LC_ALL=C rg -a -o '\["classic\.\*"[^]]{0,700}\]' "<engine binary>"` (ripgrep; the desktop engine binary sits under
  `~/Library/Application Support/Claude/claude-code/<version>/`, ending `claude.app/Contents/MacOS/claude`).
- **Evidence is thin.** warm-close's child hold and launch-copy's lane handling are tested, not proven live; the Live
  status section above records what has been seen working.

## Before you build or change a mod: probe first

Docs and the test kit can both be wrong about the engine you actually run. The method:

1. **List every engine behaviour the design rests on**, and mark each one measured or assumed. Read each call's own doc
   comment for the surface it needs (`terminal`, `CLI only`, `remote surface`) before designing on it.
2. **Probe the assumed ones with a throwaway mod**: one command per question, results written as counts to a JSONL file
   (never message text), installed at local scope in a scratch folder. Run one throwaway chat from a numbered run sheet
   and read the JSONL and the chat transcript yourself.
3. **A silence is evidence only with a positive control.** "The event never logged" means the event is closed only if
   the same logger logged other events in the same run.

## Build gotchas worth knowing

- **Never gate drawing on the start-time surface.** The desktop reports `surface: null` and `isInteractive: false` at
  `session.start` yet draws the footer status. Mods that gated on it never drew on the desktop.
- **Never run `claude plugin init`**: it scaffolds into `~/.claude/skills/<name>/`, which auto-loads in every session.
  Create mod folders by hand.
- **Never run `claude plugin configure`**: it has no scope flag and may write your user `settings.json`. Use
  `--config key=value` at install, or leave the manifest defaults.
- **One `.catch` per hook**: every registration ends `.catch(($, e, next) => next(e))`, so a broken mod degrades to
  "nothing happened", never a blocked prompt or a stuck turn.
- **Pure logic in `hooks/lib/`** with no `$`, so it can be tested exhaustively with fake ports; keep `register.tsx` thin
  and spell `on("…")` and `$.noun.method(…)` literally (the validator extracts them statically).
- **A mod updated mid-chat loads in the next chat**, not the current one.
- **Test the decision, not just the happy path**: force the key predicate true and false in a scratch copy and confirm
  the right tests go red. The test kit also differs from the engine in places (it can drop fields such as `agentId`),
  so code defensively for both.
- **Wall-clock tests flake under heavy load**: check `uptime` before running suites, one at a time.

The full rules the two mods follow are in `source/CONVENTIONS.md`, and each mod's README lists its events, calls,
options and every known limit.

## Check it yourself

Mods load when a chat starts, so start a NEW chat in the folder where you installed launch-copy (local scope). In each case: set a sentinel (`printf '%s' 'SENTINEL-1' | LC_ALL=en_US.UTF-8 pbcopy`), ask the chat to create the file with its **Write tool** (a shell redirect raises no tool call, so the mod never sees it) and end its turn, then run `LC_ALL=en_US.UTF-8 pbpaste` yourself and look at the footer. Keep the `LC_ALL` on the read too: a shell with no locale makes a bare `pbpaste` print `—` as junk even when the clipboard is right, which looks exactly like the bug. Copy nothing else while a case runs, or your own copy becomes the result.

| Case | LAUNCH.md content | Expected clipboard | Expected footer |
|---|---|---|---|
| A | `## 1. Pickup` with a ```text fence holding `TEST-A — → §`, and `## 12. Stamp` saying `lane L3` | `TEST-A — → §`, with the dash, arrow and section sign intact | `launch-copy · pickup copied HH:MM` |
| B | as A, pickup `TEST-B`, Stamp `lane L3c` | still the sentinel | `lane L3c, nothing to paste` |
| C | as A without the Stamp section, pickup `TEST-C` | `TEST-C` (no lane reads as L3) | `pickup copied` |
| D | as A, pickup `TEST-D`, plus filler so the file is over 32,768 characters | still the sentinel | `over 32 KiB, not read` |

If A shows `‚Äî` instead of `—`, your copy of launch-copy predates the locale fix or your clipboard tool ignores the locale: fix that before trusting it.
