# warm-close

Runs `/close conversation --checkpoint` shortly before the prompt cache lapses on an idle conversation.

When a conversation sits idle past the cache TTL, getting its insights out later means re-reading the whole context cold
(1x input plus a 1.25-2x re-cache) instead of a cache read (about 0.1x). This mod runs the close automatically while the
cache is still warm. The `--checkpoint` mode (`~/.claude/skills/open/References/conversation.md`, precondition 9)
harvests, routes and writes the bridge without marking the work contract complete, so it is safe at any idle moment.
**It needs the open-close kit's `conversation` pack installed**: without precondition 9, `/close conversation
--checkpoint` is an ordinary close.

**Child hold (0.2.0):** under lane L3c the intake chat is the conductor of a child session. While one child turn runs
longer than `ttlMinutes - marginMinutes` (52 minutes by default) the conductor sits idle on purpose, and the idle close
would run mid-build (a second harvest, the Learning Router twice). So a conversation that started a child
(`start_session` that really starts a session) or messaged one (`SendMessage` to a `local_…` desktop session id) is held:
the timer's fire is skipped until the child reports or `childHoldMinutes` pass. See "Child hold" below.

**CONVENTIONS exception, recorded:** `CONVENTIONS.md` rule 2 says no `$.prompt.submit` unless the mod's README allows it behind an
option that defaults off. This mod never calls `$.prompt.submit`; it calls `$.command.run` (a slash command) and does so
**by default**, a deliberate choice: an auto-close that is off by default never fires. `mode` `notify` and `mode` `off`
are the quieter settings.

## What it does

1. **Counts your turns.** A `prompt.submit` observer (it calls `next(e)` first and returns the result unchanged) counts the
   prompts whose `origin.kind` is `composer` (what you typed) into `$.state`. Plugin-, SDK-, bridge-, scheduled-, peer- and
   task-originated prompts do not count, and neither does a prompt a hook above dropped. A session with zero person turns
   never arms, which keeps SDK and `-p` sessions out.
2. **Arms on idle.** On a main-conversation `turn.complete` (a subagent's turn, one that carries `agentId`, is ignored) it
   records `lastTurnAt` and arms ONE `$.clock.after` timer for `lastTurnAt + (ttlMinutes - marginMinutes)`. Every new turn
   cancels it and arms a fresh one; a prompt entering the session cancels it too (the conversation is busy until that
   turn completes).
3. **Fires** only if, when the timer runs, state re-read shows all of: still idle (no turn recorded since it was armed, no
   prompt in flight); at least `minTurns` of your turns since the last close; fewer than `maxPerDay` closes today in this
   session; the cache not already lapsed (see decisions); `mode` is not `off`. It then records the fire in `$.state`
   FIRST (the baseline `personTurnsAtLastClose`, the fire time, the day's count; a write that fails means no call), then
   raises `$.ui.notify('Closing this conversation while its cache is warm: /close conversation --checkpoint', { title:
   'warm-close' })` (result ignored) and calls `$.command.run({ command: 'close', args: 'conversation --checkpoint' })`.
4. **Retry guard (a known engine behaviour: a timer-driven submit on an idle session can be held and dropped).** If 180 s after the call no turn has completed, no prompt of ANY origin (the
   close's own `prompt.submit` included) has entered or is entering, and the call has neither resolved nor been refused,
   it calls `$.command.run` once more with the same arguments. Never a third time.
5. **Status** (`$.ui.status`, ungated by surface): `warm-close · armed 14:52` (the time it will fire) while armed;
   `warm-close · closed 14:52` for 10 minutes after a fire (`· retried 14:54` after the second call).
6. **Modes:** `submit` (default), `notify` (the notification only, nothing is run; status reads `notified 14:52`), `off`.
7. **Child hold** (0.2.0), described in full below: a started or messaged child session holds the fire in every mode.

**It never reads `surface` or `isInteractive`.** The desktop reports `surface: null` and `isInteractive: false` at
`session.start` (it hosts the session headless) and is a main surface; gating on either would switch the mod off there.

## Options (`userConfig`)

| key | default | meaning |
|---|---|---|
| `mode` | `submit` | `submit` · `notify` · `off`; anything else (a typo, wrong case, a non-string) = `off` |
| `ttlMinutes` | 60 | set it to your account's actual prompt-cache lifetime (the default assumes 60; some plans, and usage overage, run 5); clamped to `[5, 1440]` (a longer wait overflows a 32-bit timer, which then fires at once) |
| `marginMinutes` | 8 | fire this long before the TTL; clamped to `[1, ttlMinutes - 1]` |
| `minTurns` | 3 | person turns since the last close needed to fire; at least 1 |
| `maxPerDay` | 6 | auto-closes (or notifications) per session per local day; 0 means none |
| `childHoldMinutes` | 120 | how long a started or messaged child session holds the idle close; clamped to `[0, 1440]`; `0`, a negative number, NaN and anything non-numeric (a string, `null`, a boolean) switch the hold off, they do not fall back to the default (no hook effect at all) |

Numbers must be finite; fractions are floored; anything else falls back to the default (except `childHoldMinutes`, where
anything non-numeric means off, see "Child hold"). `mode` has **no picker on purpose**: the engine turns a stored value
outside a picker's `options` into the default, which here is `submit`, so a typo would act. Without the picker a typo
reaches the code and reads as `off`.

## Child hold (0.2.0)

1. **Notice a child.** A `tool.call` observer, matcher `{ tool: ['mcp__ccd_session__start_session', 'SendMessage'] }`, calls
   `next(e)` FIRST and returns that very result; it never denies, rewrites or adds context, and it never waits for its own
   bookkeeping: it starts it (`void ctl.onChild(…).catch(…)`) and returns at once, so a slow or stuck `$.state` cannot delay
   a tool call. The controller's serial latch runs the steps in call order, so the hold is recorded before the next
   `turn.complete` step. Afterwards the call is ignored if the result is a deny or `isError`, or if it came from a
   subagent's loop (`agentId` is neither `null` nor `undefined`; the main loop carries no `agentId` or `null`).
   Otherwise:
   - `start_session` counts **only when it starts a session**: its `initiation` is `user_asked`, or its input has a
     non-empty string `proposal_id`. `offer` and `own_initiative` without a `proposal_id` only show a card (nothing runs
     until you accept), and a missing or unknown `initiation` is treated as a card. A `target` of `cloud` never counts (a
     cloud child does not wake this conversation); `local`, `ssh` and no target do.
   - `SendMessage` counts **only when `to` is a string starting `local_`** (a desktop session id); `to: 'researcher'` or an
     `a1234567…` subagent id does not.

   A child call records `holdUntil = now + childHoldMinutes` in the model and marks the current turn.
2. **A child's report clears it.** A `prompt.submit` whose `origin.kind` is `sdk` (a child reported) clears `holdUntil`.
   **A typed (`composer`) prompt does not**: you asking "status?" while the child runs must not let the conductor be
   closed an idle period later. Every other origin (`peer`, `peer-send-message`, `bridge`, `task-notification`, …), and a
   prompt a hook dropped, leaves it alone too. `session.start` and `session.end` clear it as well, and so does its
   expiry. The wake's own `turn.complete` re-arms the timer as always.
3. **The turn's end re-anchors it.** When a child was called during a turn, that turn's main-conversation `turn.complete`
   sets `holdUntil = max(holdUntil, now + childHoldMinutes)` and clears the mark. A conductor that keeps working for 80
   minutes after `start_session` inside one turn is therefore still held at the fire that follows, which the call-time
   value alone would not cover.
4. **At the fire** the existing checks run first (still idle, verdict, cache not lapsed). Then, if `holdUntil > now` and
   `holdUntil` is no further away than `childHoldMinutes` (a stored value beyond that, garbage or left by a larger setting,
   is not a hold), the fire does nothing: no notification, no `$.command.run`, no change to the counters, the baseline or
   the day's close count (it is a skipped close, not a close, and it is not deferred: nothing re-arms, because by the time
   the hold would lapse the cache has too). A held skip is not re-armed. The status reads
   `warm-close · held, child session running` until the next turn or prompt redraws it; before the fire it stays
   `warm-close · armed HH:MM` (the line does not announce the hold early). This applies in every mode (`submit`, `notify`).
5. **`mode` `off`** and a disabled hold (`childHoldMinutes` 0 or non-numeric): the observer does nothing, not even a state
   read. A stored hold from an earlier run is ignored once the option is 0.

A `childHoldMinutes` shorter than `ttlMinutes - marginMinutes` expires before the fire, so it is effectively off.
`childHoldMinutes: null` or a string switches the hold off (it is not read as the default 120).

**Known limits of the hold:**

- Only a `start_session` that starts a session, or a `SendMessage` to a `local_…` id, raises the hold. A `SendMessage` to a
  child **by name or by a `bridge:` / `uds:` address** is not held, and neither is a child started or messaged by another
  tool. A **cloud** child is held only when the call names its `target`: one started from a proposal card
  (`proposal_id` alone, no `target` in the call) is held too, until its expiry, because the call does not say it is cloud
  (the safe direction). A hold also comes back if a child's report and its `start_session` land in one turn (the turn's
  end re-anchors it); it expires the same way. A stored hold far beyond the configured one is ignored, but the turn-end
  anchor keeps the larger value when a call-time write also failed (a double fault); the close then fires.
- There is **one hold for any number of children**, cleared by the first `sdk` report: a conductor with two children
  running, woken by the first, is no longer held while the second still runs. A report that arrives in the SAME turn as the
  call is also followed by the turn's end re-anchoring the hold (it can then outlive that report, up to
  `childHoldMinutes`; a close that is skipped is never re-armed).
- Only an `sdk`-origin prompt (a child's report), `session.start`, `session.end` and the expiry end the hold. A
  `peer-send-message` or `bridge` prompt does not clear it; the expiry bounds it.
- If the app holds a child's report back (one measurement: it auto-continued a parent for 10 child reports in a row with
  no message from you and held the 11th), the report arrives inside your next typed prompt, not as an `sdk` prompt, so the hold then ends
  only at its expiry.

## Events and calls (validate output, matches the allowlist)

```
hooks: session.start, session.end, prompt.submit, command.run{command=close}, turn.complete, tool.call{tool=mcp__ccd_session__start_session|SendMessage}
calls: $.clock.after (via portsOf), $.clock.now (via portsOf), $.command.run (via portsOf), $.state.get, $.state.set, $.ui.notify (via portsOf), $.ui.status (via portsOf)
state writes / reads: warm-close.model
```

No `$.prompt.submit`, `$.model.*`, `$.fs`, `$.http`, `$.process`, `$.env`, `$.session.id`, `$.session.messages`, `$.agent`,
`$.prompt`, no `tool.check`, no `classic.*`. Every hook is `.catch(($, e, next) => next(e))`, and calls `next(e)` first.

## Design decisions (each one tested)

- **A prompt in flight means not idle, and in-flight is a count.** `prompt.submit` (any origin, not dropped) adds one to
  `inFlight` and cancels the timer; each main-conversation `turn.complete` retires one. A prompt typed while a turn runs
  (the event carries a `turnId`) queues behind it, so the first turn completing does not make the conversation idle. A
  prompt typed while idle resets the count to 1, which heals one that was merged into a running turn and never got its
  own `turn.complete` (until then such a conversation is simply not closed: the safe direction).
- **A prompt still entering blocks the timer and the retry.** The `prompt.submit` hook bumps a synchronous counter
  BEFORE `next(e)` and drops it after the prompt is recorded, so a timer that comes due while `next(e)` is slow skips the
  close for that idle period (a missed close, never a close over a person's prompt).
- **A timer that fires early re-arms.** A timer firing more than 5 s before its deadline re-arms for the rest instead of
  closing (at most 10 times, then the arming is dropped); `ttlMinutes` is clamped to `[5, 1440]` so no delay can overflow.
- **A manual `/close` (any arguments) moves the baseline.** A pass-through `command.run` observer matched on
  `{ command: 'close' }` sets `personTurnsAtLastClose` to `personTurns`, so a finished conversation is not re-closed ~52
  minutes later. It does not count against `maxPerDay`. (The mod's own `$.command.run` call skips its own hooks.)
- **Mode `off` clears the status line once at `session.start`** (a line pinned by an earlier `submit` run must not
  outlive the switch) and touches nothing else.
- **A late timer never closes a cold cache.** If the machine slept and the timer fires at or after `lastTurnAt + ttl`,
  nothing is closed: the point is the cache read, and a cold close is the cost this mod exists to avoid.
- **Arming is judged, not just firing.** The timer is armed only when the non-time conditions already hold, so the status
  never says `armed` for a close that cannot happen. The daily cap is judged on the day the close would land.
- **No retry when the session is alive.** The 180 s guard also skips when any prompt entered (the close's own
  `prompt.submit` counts), not only when a turn completed: a close that takes minutes must not be queued twice.
- **A refused call is an answer.** `$.command.run` rejecting (unknown command) settles the call: no retry, and the line
  reads `warm-close · close failed 14:52`.
- **Notify mode has its own wording** (`Cache about to lapse: run /close conversation --checkpoint while it is still
  warm`), because the "Closing…" text would be false when nothing is run.
- **A new `session.start` or `session.end` resets** timers, status and counters (a `/clear` raises `session.end`, not
  `session.start`). A failing clock decides nothing: no arm, no throw.
- **`mode` absent = `submit`**; `mode` present and unrecognised = `off`.

## Known limits

- **The retry guard's premise is unmeasured for `$.command.run`.** The guard exists because an idle-session
  `$.prompt.submit` from a timer can be held and dropped (a known engine behaviour: a timer-driven submit on an idle session can be held and dropped). Whether `$.command.run` from a timer
  behaves the same has not been measured on the desktop.
- **The timer callback uses the `$` of the hook that armed it** (a common pattern for timer wakes). Not observed live on
  the desktop for this mod.
- **Timers live in the plugin's environment**: a hot reload or restart drops the armed timer (and the pending retry), and
  nothing is closed until the next turn re-arms it. That is the safe direction.
- **Idle on one machine only**: the state is per session; two windows on one conversation each count their own prompts.
- **No cold fallback** (writing a marker at `session.end` for a later harvest needs a write location outside the
  guard-closed `env.*`) and **no fork arm** (`$.model.fork`): both are out of scope.
- The close itself spends tokens (a turn that harvests and routes). `maxPerDay` and `minTurns` bound that.
- **Evidence is thin:** one end-to-end live fire on the desktop is on record; the child-hold path has never run live.

## Tests

`claude plugin test mods/source/plugins/warm-close` (from the kit root) runs 257 tests in four files:

- `tests/lib.test.ts`: options, clamps, origin, verdict, status text, and the child-hold decisions (`isChildCall` incl.
  the card / `proposal_id` / `target` / main-loop matrix, `clearsHold`, `holdActive` incl. the cap).
- `tests/controller.test.ts`: the controller over fake ports and a fake clock (W1-W7, W10 and the edges; H1, H3, H4, H7,
  H8 for the hold; F6, the end-of-turn anchor).
- `tests/engine.test.tsx`: the mod loaded by the engine's test kit with its manifest defaults and with `options` (W1-W4,
  W6-W10; H1-H5, H7-H9 for the hold).
- `tests/register.test.ts`: the real `register.tsx` over a fake `on` and a fake `$`: the registration and its literal
  matcher, the `$` allowlist, the subagent loop incl. `agentId: null`, an observer that never waits for a stuck
  `$.state`, and H6, the observer returning `next(e)`'s result by identity.

The decisive tests (every prompt counted as a person's, the baseline not moved at a close, arming gated on the surface; a
hold that ignores the fire, one that holds for any `SendMessage`, one that ignores a deny) were each proved red against a
deliberately wrong implementation before the real code. Through the kit, `childHoldMinutes` `'x'` and NaN are rejected by
the engine against `plugin.json`'s `type: number`, so those two values are tested in `register.test.ts` and
`lib.test.ts`, where the mod is handed them raw.

## Install and undo

See the kit's `mods/NOTES.md` for a local-scope install. Once the marketplace is added:

```
claude plugin install warm-close@open-close-mods --scope local   # run inside the one project folder where it should load
```

To switch it off without uninstalling, set `mode` to `off`. To remove it:

```
/plugin uninstall warm-close@open-close-mods
```
