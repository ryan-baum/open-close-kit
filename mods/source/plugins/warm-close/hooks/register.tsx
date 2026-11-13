// warm-close: run `/close conversation --checkpoint` shortly before the prompt cache lapses on an idle conversation,
// so the insights come out at a cache read instead of a cold re-read.
//
// CONVENTIONS exception, recorded: rule 2 says no `$.prompt.submit` unless behind an option that defaults off. This mod
// runs a slash command (`$.command.run`) by default, a deliberate choice; `mode` "notify" and "off" are the quieter
// settings. It never submits a prompt itself and never reads or gates on the surface. It observes two tool calls
// (`start_session`, and `SendMessage` to a `local_…` id) and only observes: `next(e)` first, its result returned as is,
// never a deny, a rewrite or added context, and the observer never waits for its own bookkeeping.
//
// Every observer calls `next(e)` first and returns its result unchanged; a failure after it reaches the registration's
// `.catch`, which replays that result. The decisions live in ./lib (pure, tested with explicit options).
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { WarmController, type Ports } from './lib/controller'
import { EMPTY_MODEL, coerceModel, holdEnabled, isChildCall, localDay, localHHMM, readOptions } from './lib/warm'

type $ = EngineInterface

const MODEL = atom({ plugin: 'warm-close', key: 'model' } as const, EMPTY_MODEL)

// The only place `$.clock`, `$.ui.status`, `$.ui.notify` and `$.command.run` are spelled. The controller calls
// `run` only in mode "submit", with exactly ('close', 'conversation --checkpoint').
function portsOf($: $): Ports {
  return {
    now: () => $.clock.now(),
    after: (ms, fn) => $.clock.after(ms, fn),
    read: async () => coerceModel(await read($, MODEL)),
    update: fn => update($, MODEL, x => fn(coerceModel(x))),
    status: text => $.ui.status(text),
    notify: (text, title) => $.ui.notify(text, { title }),
    run: (command, args) => $.command.run({ command, args }),
    fmt: localHHMM,
    day: localDay,
  }
}

export const register: Register = (on, options) => {
  const o = readOptions(options)
  const ctl = new WarmController(o)

  // session.start: a new conversation begins with nothing armed and empty counters (a /clear raises session.end, not
  // a session.start, so the end hook resets too).
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    // e.surface and e.isInteractive are deliberately not read: the desktop reports surface null and isInteractive
    // false at session.start (it hosts the session headless) and is a main surface.
    if (o.mode !== 'off') await ctl.reset(portsOf($))
    // mode off touches nothing but this: a line pinned by an earlier run in mode submit must not outlive the switch
    else portsOf($).status(undefined)
    return r
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    const r = await next(e)
    if (o.mode !== 'off') await ctl.reset(portsOf($))
    return r
  }).catch(($, e, next) => next(e))

  // Counts the person's prompts (origin.kind 'composer'); every prompt that entered also counts as in flight until a
  // turn.complete retires it (a `turnId` on the event = typed while a turn ran, so it queues behind that turn). A prompt a
  // hook dropped never entered, so it counts for nothing. `beginPrompt` runs BEFORE `next(e)`, synchronously: a timer or
  // a retry that comes due while the prompt is still entering must not close over it.
  on('prompt.submit', async ($, e, next) => {
    if (o.mode === 'off') return next(e)
    ctl.beginPrompt()
    try {
      const r = await next(e)
      await ctl.onPrompt(portsOf($), e.origin, r.drop !== undefined, e.turnId !== undefined)
      return r
    } finally {
      ctl.endPrompt()
    }
  }).catch(($, e, next) => next(e))

  // A manual `/close` (any arguments) closes the conversation as of now, so the idle timer must not close it again.
  // Observes only: `next(e)` first, its result returned unchanged. The mod's own `$.command.run` never reaches this
  // hook (a call skips its caller's hooks) and would only repeat what is already recorded.
  on('command.run', { command: 'close' }, async ($, e, next) => {
    const r = await next(e)
    if (o.mode !== 'off') await ctl.onManualClose(portsOf($))
    return r
  }).catch(($, e, next) => next(e))

  // Main conversation only: a subagent's loop (`agentId`) is not the conversation going idle.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (o.mode === 'off' || e.agentId !== undefined) return r
    await ctl.onTurn(portsOf($))
    return r
  }).catch(($, e, next) => next(e))

  // Child hold (lane L3c): a conversation that started a child session (`start_session` that starts one, not
  // a card) or messaged one (`SendMessage` to a `local_…` desktop session id) is the conductor waiting, not idle, so the
  // idle close is held until the child reports (a `prompt.submit` of origin `sdk`) or `childHoldMinutes` pass. The matcher
  // is spelled literally (CONVENTIONS rule 6). Observe only: `next(e)` first, its result returned as is; the bookkeeping
  // is started without being awaited and wrapped, so neither a slow `$.state` nor a throw there can change what the tool
  // call returns or delay it. Nothing is touched when the hold is switched off (`childHoldMinutes` 0 or non-numeric) or
  // `mode` is `off`. A denied or failed call, a card, a cloud child and a call from a subagent's loop (`agentId` not null)
  // hold nothing (decided in ./lib `isChildCall`).
  on('tool.call', { tool: ['mcp__ccd_session__start_session', 'SendMessage'] }, async ($, e, next) => {
    const r = await next(e)
    try {
      // Started, not awaited: the tool call's answer never waits for `$.clock` or `$.state`. The controller's serial latch
      // takes the step in call order, so the hold is recorded before the next `turn.complete` step runs; a failure in it
      // is swallowed here and changes nothing.
      if (o.mode !== 'off' && holdEnabled(o) && isChildCall(e, r)) void ctl.onChild(portsOf($)).catch(() => undefined)
    } catch {
      // bookkeeping only: never changes what the call returns
    }
    return r
  }).catch(($, e, next) => next(e))
}
