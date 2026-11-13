# launch-copy

When a `LAUNCH.md` is written or edited, copies the fenced block under its `## 1. Pickup` heading to the clipboard at the
end of the turn and says so.

The launch protocol (`~/.claude/skills/open/References/_launch.md` in the open-close kit) ends an intake chat by writing
`LAUNCH.md` beside the run's work contract. For lane L3 (a fresh chat, the default interactive launch lane) you would
otherwise open the file, find the fenced block under `## 1. Pickup`, copy it, open a new chat and paste. This mod does the
find-and-copy the moment the brief is written, so your part is: **new chat, paste, Enter.**

**Lane awareness (0.2.0).** That is right for lane L3 only. Under L1 (the intake chat dispatches a subagent) and L3c (the
intake chat starts a native child session itself) nothing is pasted anywhere, and "open a new chat and paste" would invite
a duplicate builder while overwriting the clipboard for nothing. The brief says which lane it is in its Stamp section (the
`## 12. Stamp` line, e.g. `written: 2026-01-15T09:00Z (previous chat, closing) · lane L3 · re-probe any dated claim before
acting.`). The mod reads that lane and acts on it:

| lane in the Stamp | clipboard | notification | status line |
|---|---|---|---|
| `L3`, no lane, or a Stamp that is not exactly one clean `lane L<n>` (a list such as `lane L1 or L3`, a second `lane` mention, `lane is L3`, `L1c`, `L4`, `lane 3`, `**L3**`, any `lane` inside a fence in the Stamp, ...) | copied | `Launch brief ready: pickup copied. Open a new chat and paste.` | `launch-copy · pickup copied HH:MM` |
| `L2` | copied | `Launch brief ready: the /compact line is copied. Paste it in this chat and send go.` | `launch-copy · /compact line copied HH:MM` |
| `L1` or `L3c` | **left alone: `$.ui.copy` is never called** | `Launch brief ready (lane <lane>: this chat starts it, nothing to paste): <path>` | `launch-copy · lane <lane>, nothing to paste HH:MM` |

## What it does

1. **Watches writes.** A `tool.call` hook on `Write` and `Edit` calls `next(e)` FIRST and returns that very result. It
   never denies, rewrites, approves or adds context. After `next(e)`: a deny, an `isError` result, or a call from a
   subagent loop (the input carries `agentId`) is ignored. Otherwise, if the input's `file_path` has the exact,
   case-sensitive basename `LAUNCH.md`, the path is remembered as touched this turn. Nothing else happens inside the call.
2. **Acts once per turn.** On the main loop's `turn.complete` (a subagent's turn does not count) it works through the
   touched paths, detached from the hook (a UI call that never answers cannot stick a turn): `$.fs.read` the file, **apply
   the size guard** (a text longer than 32768 characters is treated as not read: no pickup, no lane, no copy; see the table
   and "Known limits"), extract the pickup, read the lane from the Stamp section (only once a pickup is found: a brief with
   no Pickup is wrong in every lane, so the no-pickup branch below is the same whatever the lane), skip it if that exact
   pickup text with that lane was already handled for that path this session, otherwise:
3. **Copies** (`mode` `copy`, the default; lanes `L2`, `L3` and no lane; `L1` and `L3c` copy nothing, see the table above)
   with `$.ui.copy({ text })`, falling back to the host clipboard when that answers `no-surface` (see "Known limits"), and
   reports what happened (the rows below are lane L3; lane L2 swaps the success wording as in the table, and keeps the
   failure rows as they are):

   | result | notification | status line (clears after 10 minutes) |
   |---|---|---|
   | `{ isCopied: true }` | `Launch brief ready: pickup copied. Open a new chat and paste.` | `launch-copy · pickup copied HH:MM` |
   | `{ isCopied: false, reason }` or a throw | `Launch brief ready, but the copy failed (<reason>). Pickup is in <path> under "## 1. Pickup".` | `launch-copy · copy failed (<reason>) HH:MM` |
   | no pickup found, or unreadable | `LAUNCH.md written, but no Pickup block was found: <path>` (`... found (could not read): <path>` when the read failed) | `launch-copy · no pickup HH:MM` |
   | longer than 32768 characters (the size guard, below) | `LAUNCH.md is over 32 KiB (the protocol's cap), not read: <path>` | `launch-copy · over 32 KiB, not read HH:MM` |

   A failed copy is not remembered as copied, so the next edit tries again. A copy that has not answered in 10 seconds is
   reported as a failed copy with reason `no answer` (its claim is released; an answer that arrives later is ignored).
   A notify's result is ignored; a reject cannot escape and a notify that never answers costs nothing.
   The no-pickup notification is sent once per path until something changes (the trouble switches between "no block",
   "could not read" and "over 32 KiB", or a pickup is found); the status line is updated every time. A no-pickup,
   unreadable or over-size result also forgets the path's handled pickup, so restoring pickup A after a broken edit copies
   it again. `notify` mode says the over-size line too, and `off` reads nothing at all.
4. **`notify` mode** copies nothing: `Launch brief ready: <path>. Copy its Pickup block into a new chat.`, and the status
   line `launch-copy · brief ready HH:MM` (notifications do not show on the desktop, so the footer says it too; it clears
   with the same 10-minute timer). For `L1` and `L3c` it is the same lane notice and status as in copy mode. For `L2` the
   notice is `Launch brief ready (lane L2: paste its /compact line in this chat and send go): <path>` (not "is copied":
   nothing was) with the same `brief ready` status. **`off`** (and any other value) does nothing at all: no read, no
   status, no notification.
5. **Dedupe** is keyed on the pickup text together with the lane. An edit that changes neither does nothing; a change of
   lane with the same pickup (L3 to L3c, say) is new and notifies again. A brief with no lane behaves as L3, so adding
   `lane L3` to a handled brief changes nothing.

**It never reads `surface` or `isInteractive`.** The desktop reports `surface: null` and `isInteractive: false` at
`session.start` (it hosts the session headless) and is a main surface; gating on either would switch the mod off there.
It registers no `session.start` hook at all.

## Pickup extraction (`hooks/lib/pickup.ts`, pure)

- Heading: the first line matching `^##\s+(\d+\.\s*)?Pickup\b` (case-insensitive on `Pickup`) that is not inside a fenced
  region. `#` and `###` do not match, and an example `## 1. Pickup` inside an earlier fence (a ```` ```md ```` block, a
  4-backtick template) is content, not the heading.
- Block: the first fenced block after it and before the next line starting `## `. A fence is three or more backticks or
  tildes with an optional info string; it closes on the same character, at least as long, and it must close BEFORE the
  next line starting `## `. A longer outer fence may hold a shorter inner one (kept as content).
- The inner text is returned exactly, trailing newlines trimmed, CRLF normalised to LF.
- Not found (never a best guess): no heading, no fence before the next `## ` heading (the next section's fence is never
  taken), a fence not closed before the next `## ` heading (a later section's bare fence never closes it: a pickup is a
  prompt line, so a `## ` line met while looking for the closer means it was never closed), an empty block, or a block over
  8192 UTF-8 bytes. An earlier fence that never closes runs to the end of the file, so nothing after it counts.

## Lane extraction (`hooks/lib/lane.ts`, pure) and the Stamp convention

`extractLane(text)` returns `'L1' | 'L2' | 'L3' | 'L3c' | undefined`.

The principle: **a wrong skip is the dangerous error; a wrong copy only restores the plain copy-everything behaviour.**
Readers that tried to understand free prose around the token (first token wins, unreadable tokens dropped, lists read as
their first token) kept finding new wrong-skip paths in review. So the reader does not try: **it reads a lane only from
the least ambiguous Stamp there can be, and everything else is `undefined`**, which keeps the copy-and-"paste" path. A
brief must carry **exactly one `lane L<n>` mention and exactly one lane-like token in its Stamp section**; anything else
reads as no lane.

The rule, in order (every failed step is `undefined`):

1. **HTML comments are replaced by one space first** (`<!-- ... -->`, non-greedy, across lines; a space, not nothing, so
   `lane L3<!-- c -->c` reads `L3` and not `L3c`). A Stamp, or a lane, inside a comment is not read. An unterminated `<!--`
   is left as it is.
2. **Fences are worked out over the whole text** (three or more backticks or tildes; the same rules as the Pickup), so a
   heading-looking line inside a fence is never a heading and never ends a section.
3. **One Stamp heading.** A line outside fences matching `^ {0,3}##\s+(\d+\.\s*)?Stamp\s*(\([^)]*\))?\s*:?\s*$`
   (case-insensitive on `Stamp`): `## Stamp`, `## 12. Stamp`, `## 12. Stamp (lane)`, ` ## 12. Stamp:`. Zero or two or more
   is `undefined`. `# Stamp`, `### Stamp`, `## 3. Stamp-ready checklist`, `## Stamp and lane notes` and `## 12. Stamp lane L1`
   are not Stamp headings.
4. **The section** runs from that heading to the next level 1 or 2 heading line outside fences (`^ {0,3}#{1,2}(\s|$)`: `#`
   and `##`, a bare `##` and a 1 to 3 space indent included) or the end of the text. **`###` and deeper sub-headings stay
   inside the Stamp**: a benign `### Notes` keeps its lane, and a stale `lane L1` above a `###` with the true `lane L3`
   below it is two mentions, so `undefined`. **The heading line itself is not counted**, so a `(lane)` in it is nothing. A
   line indented four spaces or more is not a heading.
5. **A fence inside the section that contains `lane`** (any case, info string included; closed, or unclosed to the end)
   is `undefined`. A fence that does not contain `lane` is skipped, and what is in it is not counted.
6. **Exactly one `lane` mention** in the non-fenced body: a `lane` (any case) counts when the character before it is not an
   ASCII letter, so `launch-lane`, `_lane_`, `__lane__`, `lane:` and `lanes` count while `plane` and `sublane` do not.
   Zero or two or more is `undefined`: the same lane stated twice is `undefined`.
7. **The token after it is exactly a lane.** After the mention: spaces, `:` or `=`, an optional `(`, then a run up to the
   next space, `)`, `,`, `;` or `·`; one trailing `.` is stripped. It must be `L1`, `L2`, `L3` or `L3c` in any case. There is
   no prose-word exemption: `lane is L3`, `lane TBD`, `lane choice: L3c`, `lane, L3`, `lane) L3`, `lane 3`, `**L3**`,
   `` `L3` ``, `lane — L3`, fullwidth `Ｌ３`, `L1.5`, `L1c`, `L4` and `lanes L3` are all `undefined`.
8. **Exactly one lane-like token in the whole non-fenced body**: the matches of `\bL[123]c?\b` (any case) must number one,
   and be that token. This kills lists and glosses: `lane L1 or L3`, `lane L1, L3`, `lane L1,L3`, `lane L1;L3`, `lane L1 & L3`,
   `lane: L1 | L2 | L3 | L3c`, `lane (L1, L2, L3, L3c)`, `lane L3 (was L1)` are `undefined`.

What reads: `lane L3`, `lane L3c`, `lane: L3c)`, `· lane L3 ·`, `lane L3.`, `lane l3C`, `lane (L1)`, `lane=L2`,
`lane L3, child session` and `lane: L3 child session (start_session, ...)` read as `L3`, `L3c`, `L3c`, `L3`, `L3`, `L3c`,
`L1`, `L2`, `L3` and `L3`.

**Nothing outside the Stamp section is read.** A `lane L1` in section 6 (Plan of attack), after the Stamp, or inside the
Pickup block itself is prose about something else and is ignored.

`undefined` means the plain behaviour (copy, "open a new chat and paste"): it is what the mod did before it knew about
lanes, so a brief that names no lane is no worse off.

**Stamp convention.** A brief written for a native child session (the intake chat starts the builder itself) must say
`lane L3c` in its Stamp. A plain `lane L3` means "you paste the pickup into a new chat", and the mod then does exactly that
(copy, "open a new chat and paste"). `lane L1` is the subagent lane, `lane L2` the same-chat `/compact` line. **Write the
Stamp under a `## Stamp` or `## 12. Stamp` heading with exactly one `lane L<n>` and no other `L1`/`L2`/`L3`/`L3c` in it**;
a brief that follows the kit's template (`written: ... · lane L3 · re-probe any dated claim before acting.`) does.

## Options (`userConfig`)

| key | default | meaning |
|---|---|---|
| `mode` | `copy` | `copy` · `notify` · `off`; any other value (a typo, wrong case, a non-string) = `off` |

`mode` has **no picker on purpose**: the engine turns a stored value outside a picker's options into the default, which
here is `copy`, so a typo would act. Without the picker a typo reaches the code and reads as `off`.

## Events and calls (validate output, matches the allowlist)

```
hooks: tool.call{tool=Write|Edit}, turn.complete
calls: $.clock.after (via portsOf), $.clock.now (via portsOf), $.fs.read (via portsOf), $.process.run (via portsOf), $.ui.copy (via portsOf), $.ui.notify (via portsOf), $.ui.status (via portsOf)
```

No `$.state` (the touched set and the last-handled map are plain memory of the plugin's environment), no `$.fs.write`,
`$.prompt.*`, `$.command.run`, `$.model.*`, `$.http`, `$.process.spawn`, `$.env`, `$.tool.call`. `$.process.run` runs one fixed
argv, `["/usr/bin/env", "LC_ALL=en_US.UTF-8", "pbcopy"]` with the pickup on stdin and a 5 s timeout, and only when
`$.ui.copy` answered `no-surface` (0.2.1; the locale since 0.2.2; CONVENTIONS rule 4: the programs are `env` and
`pbcopy`). If you change that argv for another platform (see "Known limits"), change this paragraph to name the
new program. None of the events the desktop engine's security guard closes is used (`tool.call` and `turn.complete` were
open when this was built; re-check after an engine update). Every registration ends `.catch(($, e, next) => next(e))`,
and the `tool.call` bookkeeping is wrapped so a throw there cannot change what the call returns.

## Known limits

- **`$.ui.copy` does not copy on the desktop app (measured live).** The desktop hosts the session headless, so
  `$.session.surfaces()` is empty and `$.ui.copy` with no surface answers `{ isCopied: false, reason: 'no-surface' }`;
  the footer showed `copy failed (no-surface)` and nothing reached the clipboard. **Since 0.2.1** a `no-surface` answer,
  and only that one, falls back to the host's own clipboard: `pbcopy` with the pickup on stdin (the desktop engine runs
  on your own machine, so it is the clipboard you paste from). Exit 0 is a copy; a non-zero exit reports
  `no-surface, local copy failed`; a `pbcopy` that cannot start (off macOS), times out after 5 s, or is refused by the
  engine leaves `no-surface` standing, so `no-surface` alone does not prove the fallback was never tried. The fallback
  sits inside the same 10 s copy bound; if `$.ui.copy` itself took more than about 5 s before answering `no-surface`, the
  bound can report `no answer` while a `pbcopy` still lands a moment later (on the desktop `$.ui.copy` answers at once, so
  this is theoretical there). **Since 0.2.2** `pbcopy` runs as `env LC_ALL=en_US.UTF-8 pbcopy`: the desktop engine's
  process has no `LANG`/`LC_*`, and `pbcopy` without a locale reads its input as MacRoman, so `—`, `→` and `§` pasted as
  `‚Äî`, `‚Üí` and `¬ß` while the footer said "pickup copied" (measured live). `LC_ALL`, not `LANG`, so an inherited
  `LC_CTYPE` or `LC_ALL=C` cannot win (measured: under an inherited `LC_ALL=C`, `env LC_ALL=en_US.UTF-8 pbcopy`
  round-trips `A—B`, `env LANG=… pbcopy` does not). Exit 127 (`env` finding no `pbcopy`) counts as "cannot start"; exit
  126 (found but not runnable) still reports `no-surface, local copy failed`, a known inconsistency. `no-clipboard` and
  `refused` are never retried locally (a terminal or a hook said no). Every branch still says honestly what happened; the status line only claims "pickup copied" on `isCopied: true`. Note the engine
  docs' caveat: an OSC 52 terminal write reports `true` even when the terminal drops it.
- **The fallback is macOS-only.** `pbcopy` exists on macOS. On Linux or Windows, edit `PBCOPY` in `hooks/register.tsx`
  to a fixed argv that reads stdin and keeps a UTF-8 locale (on Linux `["/usr/bin/env", "LC_ALL=C.UTF-8", "wl-copy"]`
  on Wayland or `["/usr/bin/env", "LC_ALL=C.UTF-8", "xclip", "-selection", "clipboard"]` on X11; on Windows `clip`
  needs its own encoding check, since it reads stdin in the console code page), update the paragraph under "Events and
  calls" that names the programs, and update `PBCOPY_ARGV` in `tests/register.test.ts`, which pins the argv. Never use
  a shell string. Measure a non-ASCII pickup (`A—B→C§D`) round-trip on the real machine before trusting it.
- **`$.ui.notify` does not show on the desktop** (no native notification appeared in the live run, most likely for the
  same no-surface reason); the footer line says everything the notification would.
- **A brief with no readable Stamp lane behaves as L3.** If there is no `##` Stamp heading (or two), the Stamp does not hold
  exactly one `lane` mention and exactly one lane-like token, or the token is not exactly `L1|L2|L3|L3c`, the pickup is
  copied and the notice says "open a new chat and paste". For a brief that is really L1 or L3c that is the
  duplicate-builder invitation, so the brief-writing side has to put the lane in the Stamp (the kit's `_launch.md`
  template carries it). A Stamp written as a top-level `# Stamp` heading is not a Stamp heading by this rule.
- **The one residual class parsing cannot fix: a single mention that negates itself.** `this is NOT lane L3c` has one
  `lane`, one lane-like token and a clean capture, so it reads `L3c` and the mod skips the copy. Nothing short of
  understanding the sentence catches it; the convention (write the lane, not its negation, in the Stamp) is the only guard.
- **The single-mention residual is wider than `NOT`.** One mention reads whatever it says: `lane L1 rejected`, `default lane
  L1`, `use lane L1 when dispatching`, or a Stamp heading `(lane L3)` with a body of `was lane L1` all read `L1`. Edit the
  Stamp line in place instead of annotating it. Also, a stale Stamp line plus a differently named section (`## Re-stamp`)
  reads the stale one, because that section is not a Stamp heading.
- **The comment stripper is not Markdown-aware.** It removes `<!-- ... -->` wherever it finds one, so a backticked `<!--`
  in the Stamp (`` `<!--` ``) can swallow the text up to the next `-->`, including a real `lane L3`. If that leaves a
  single stale mention behind it is read. An unterminated `<!--` is left as it is and read as written. Valid empty
  comments `<!-->` and `<!--->` also swallow text up to the next `-->`.
- **The size guard: a `LAUNCH.md` longer than 32768 characters is not read at all** (`text.length`, so characters, not
  bytes): no copy, no lane, no pickup; the notice is `LAUNCH.md is over 32 KiB (the protocol's cap), not read: <path>` and the
  status `launch-copy · over 32 KiB, not read HH:MM`, with the same once-per-state, `notify`, `off` and forgotten-claim rules
  as "no pickup found". 32 KiB is the launch protocol's own cap for the file; typical briefs are well under it. The guard
  runs right after `$.fs.read` and before any extraction because the extractors are quadratic on hostile input, and a hook
  must never hang a turn (an unterminated `<!--` flood of 391 KiB took 16.5 s unguarded). With the guard in place an
  over-size file is answered in about a millisecond whatever its size. **At the guard's limit the worst extraction is not
  instant**: a 32 KiB line of backticks followed by U+2028, U+2029 or a lone CR measured 0.5 s to 1.0 s on a busy machine,
  so "bounded to about a second", not "fast".
- **The Stamp section ends only at a `#` or `##` heading**, so a `###` sub-heading stays inside it. A `lane` written below
  a `###` is therefore a second mention when another sits above it (`undefined`), and a lane under a `# Appendix` or a
  `## 13. Notes` is not read.
- **Lookalikes of headings that Markdown does not treat as headings end the section like a heading**: a `#` followed by a
  non-breaking space, a `## x` line after a list-marker fence line, or a `## x` inside `<pre>` (the section end is a line
  test, not a Markdown parse).
- **A fence line holding U+2028, U+2029 or a lone CR is not seen as a fence** (`.` does not match those characters, so the
  opening-fence test fails on the line), and a file whose line breaks are all lone CRs reads as one line and so reads no
  lane.
- **A hyphen or underscore does not hide a mention**: `launch-lane: L3`, `sub-lane L1`, `out-of-lane L1`, `cross-lane L1`
  and `_lane_` each count as the one mention, so `sub-lane L1` alone reads `L1`.
- **Wrong copy only** (the safe direction): `lane L3c:`, `**lane:** L3c`, backticked and table forms of the declaration,
  and a top-level `# Stamp` then `lane:L1;` read no lane (copy and "paste").
- **`lane` at the end of a line followed by a token on the next line reads as that token** (the whitespace between them may
  be a newline).
- **A stray unbalanced fence before the Stamp hides it** (a fence that never closes runs to the end of the file), so the
  brief behaves as L3. Inside the Stamp, a fence that never closes and does not mention `lane` hides the rest of the section
  (a `lane` before it still reads); one that mentions `lane` makes the Stamp unreadable. A fence that holds a `## Notes`
  line does not end the section.
- **A superseded slow copy is silent, but it may still have landed.** Supersession is per copy attempt, not per brief: each
  copy owns a token stored with its claim, and only the attempt whose token is the claim's current token may notify, set the
  status or release the claim. If a copy has not answered when the brief is edited (the Stamp flips to L3c, the pickup
  changes, the brief is broken, or broken and restored to the same pickup, which starts a new copy), the older copy's late
  answer, failure or timeout says nothing, because the newer notice or copy is the current state. The clipboard may still
  hold the earlier pickup.
- **A `LAUNCH.md` written through Bash** (`cat > LAUNCH.md`) raises no `Write` or `Edit` call, so it is not seen.
- The "already handled" memory lives for the session's plugin environment; a restart forgets it, so the first edit after a
  restart copies again.
- Filling the prompt box with the line for L2 (`$.prompt.fill`) is out of scope.

## Tests

`claude plugin test mods/source/plugins/launch-copy` (from the kit root) runs 274 tests in five files:

- `tests/pickup.test.ts`: L1 extraction, L2 its false-accepts.
- `tests/lane.test.ts`: X1 lane extraction, X2 its false-accepts, the R1/R2 blocks, the R3 blocks for the strict reader
  (R3-A what reads, R3-B section ends, R3-C the list class, R3-D the glued/prose class, R3-E the Stamp heading and its
  fences, R3-F boundaries, R3-G sample Stamp lines), and the R4 block for sub-headings.
- `tests/launch.test.ts`: the controller with fake ports: L4 paths, L5 results, L7 failed copies, L8 once per changed
  pickup, L9 modes, F3-F6, the X3-X5 blocks (the controller by lane, the modes, the dedupe), the R4 size-guard block
  (including real-time bounds on hostile input), and L11 the `pbcopy` fallback (copied, not reached on success, only
  `no-surface` retried, a failing, a missing and a hanging `pbcopy`, L1/L3c untouched).
- `tests/engine.test.tsx`: the mod loaded by the engine's test kit: L3, L4, L5, L7, L8, L10, the status clearing, X3, and
  F7 (every mode through the kit's `{ options }`).
- `tests/register.test.ts`: the real `register.tsx`: the registration list, an allowlist Proxy over `$`, L6 identity, the
  subagent loop, odd mode values, X3 (`$.ui.copy` is never even read for L1 and L3c), and L11 (the fixed argv with its locale, a non-ASCII
  pickup passed to stdin verbatim, exit 0, exit 1, exit 127, cannot start).

The decisive blocks (extraction false-accepts, path matching, lane awareness, the size guard, the sub-heading rule) were
each proved red against a deliberately wrong implementation before the real code, and every review finding was given a
failing test before its fix.

## Install and undo

See the kit's `mods/NOTES.md` for a local-scope install. Once the marketplace is added:

```
claude plugin install launch-copy@open-close-mods --scope local   # run inside the one project folder where it should load
```

To switch it off without uninstalling, set `mode` to `off`. To remove it:

```
/plugin uninstall launch-copy@open-close-mods
```
