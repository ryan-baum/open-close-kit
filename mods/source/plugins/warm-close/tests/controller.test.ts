// The warm-close controller with explicit options, fake ports and a fake clock (no `$`).
// W1 arm and fire, W2 re-arm, W3 SDK/-p protection, W4 baseline and no loop, W5 daily cap, W6 modes, W7 the held-call
// guard, W10 clamps through the controller; E1-E8 the edges the spec implies (a late timer, a dropped prompt, a dead
// clock, a reset, the status window, a failed call, the order of the two calls, an unrecordable fire).
import { describe, expect, test } from 'claude-code/testing'

import { WarmController } from '../hooks/lib/controller'
import { DEFAULT_OPTIONS, EMPTY_MODEL, GUARD_MS, localDay, readOptions, type Options } from '../hooks/lib/warm'
import { H, MIN, at, lastStatus, local, rig, type Rig } from './support'

const D = DEFAULT_OPTIONS
const PERSON = { kind: 'composer' }
const SUBMIT_TEXT = 'Closing this conversation while its cache is warm: /close conversation --checkpoint'
const CLOSE_CALL: [string, string] = ['close', 'conversation --checkpoint']
const ctl = (o: Partial<Options> = {}) => new WarmController({ ...D, ...o })

/** n turns: a prompt, a minute of work, its turn.complete. */
async function talk(c: WarmController, r: Rig, n: number, ...rest: [origin?: unknown]) {
  // `undefined` is a real origin to test, so the default applies only when the argument is left out
  const origin = rest.length > 0 ? rest[0] : PERSON
  for (let i = 0; i < n; i++) {
    await c.onPrompt(r.ports, origin, false)
    await r.clock.advance(MIN)
    await c.onTurn(r.ports)
  }
}

describe('W1 arm on turn.complete after minTurns composer prompts; fire at ttl - margin when idle', () => {
  test('three composer turns arm; exactly one close at last turn + 52 min, not a second earlier', async () => {
    const r = rig(at(14, 0))
    const c = ctl()
    await talk(c, r, 3)
    const last = r.clock.now
    expect(c.isArmed()).toBe(true)
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(last + 52 * MIN)}`)
    await r.clock.advance(52 * MIN - 1)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    await r.clock.advance(1)
    expect(r.runs).toEqual([CLOSE_CALL])
    expect(r.notifies).toEqual([[SUBMIT_TEXT, 'warm-close']])
    await r.clock.advance(5 * H)
    expect(r.runs).toHaveLength(1)
    expect(r.notifies).toHaveLength(1)
  })
  test('the boundary: two composer turns do not arm, the third does', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    expect(c.isArmed()).toBe(false)
    expect(lastStatus(r)).toBeUndefined()
    await r.clock.advance(5 * H)
    expect(r.runs).toEqual([])
    await talk(c, r, 1)
    expect(c.isArmed()).toBe(true)
  })
  test('the fire is recorded in state BEFORE the call (a crash after it never double-fires)', async () => {
    const r = rig(at(14, 0))
    const c = ctl()
    await talk(c, r, 3)
    const last = r.clock.now
    await r.clock.advance(52 * MIN)
    expect(r.modelAtRun).toHaveLength(1)
    expect(r.modelAtRun[0]).toEqual({
      personTurns: 3,
      personTurnsAtLastClose: 3,
      lastTurnAt: last,
      inFlight: 0,
      day: localDay(last + 52 * MIN),
      closes: 1,
      lastFireAt: last + 52 * MIN,
    })
  })
  test('E7 a state write that fails at the fire means no call at all (cannot record, so do not fire)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    r.updateFails = true
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    r.updateFails = false
    await r.clock.advance(5 * H)
    expect(r.runs).toEqual([])
  })
  test('E6 the notification comes first and its result is ignored: a refusal or a hang never blocks the close', async () => {
    for (const notifyMode of ['ok', 'reject', 'hang'] as const) {
      const r = rig()
      r.notifyMode = notifyMode
      const c = ctl()
      await talk(c, r, 3)
      await r.clock.advance(52 * MIN)
      expect(r.order).toEqual(['notify', 'run'])
      expect(r.runs).toEqual([CLOSE_CALL])
    }
  })
})

describe('W2 a turn before the deadline re-arms; nothing fires early', () => {
  test('a person turn at +40 min moves the deadline: no close at the first deadline, one at the new one', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    const first = r.clock.now
    await r.clock.advance(40 * MIN)
    await talk(c, r, 1)
    const second = r.clock.now
    expect(c.isArmed()).toBe(true)
    expect(r.clock.live()).toBe(1)
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(second + 52 * MIN)}`)
    await r.clock.advance(first + 52 * MIN - r.clock.now + 5 * MIN)
    expect(r.runs).toEqual([])
    await r.clock.advance(second + 52 * MIN - r.clock.now - 1)
    expect(r.runs).toEqual([])
    await r.clock.advance(1)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('a non-person turn (a plugin prompt) also re-arms, because it also refreshed the cache', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(40 * MIN)
    await talk(c, r, 1, { kind: 'plugin' })
    const second = r.clock.now
    await r.clock.advance(51 * MIN)
    expect(r.runs).toEqual([])
    await r.clock.advance(second + 52 * MIN - r.clock.now)
    expect(r.runs).toHaveLength(1)
  })
  test('E8 a prompt in flight at the deadline (no turn.complete yet) means not idle: nothing fires, and the turn re-arms', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(51 * MIN)
    await c.onPrompt(r.ports, PERSON, false)
    expect(c.isArmed()).toBe(false)
    expect(lastStatus(r)).toBeUndefined()
    await r.clock.advance(30 * MIN)
    expect(r.runs).toEqual([])
    await c.onTurn(r.ports)
    const done = r.clock.now
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
    expect(r.modelAtRun[0].lastTurnAt).toBe(done)
  })
})

describe('W3 zero person turns never arms (SDK and -p sessions)', () => {
  const origins: unknown[] = [{ kind: 'sdk' }, { kind: 'plugin' }, { kind: 'bridge' }, { kind: 'task-notification' }, { kind: 'scheduled-trigger' }, { kind: 'peer' }, { kind: 'unclassified' }, undefined, {}]
  test('many prompts and turns with no composer origin: no timer, no status, no write of a person turn, no close', async () => {
    const r = rig()
    const c = ctl()
    for (const origin of origins) await talk(c, r, 2, origin)
    expect(c.isArmed()).toBe(false)
    expect(r.status.filter(s => s !== undefined)).toEqual([])
    await r.clock.advance(12 * H)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(r.model().personTurns).toBe(0)
  })
  test('positive control: the same session, then three composer turns, closes once', async () => {
    const r = rig()
    const c = ctl()
    for (const origin of origins) await talk(c, r, 2, origin)
    await talk(c, r, 3)
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
    expect(r.model().personTurns).toBe(3)
  })
  test('E2 a prompt a hook dropped never entered the session: it is not a person turn', async () => {
    const r = rig()
    const c = ctl()
    for (let i = 0; i < 5; i++) {
      await c.onPrompt(r.ports, PERSON, true)
      await c.onTurn(r.ports)
    }
    expect(r.model().personTurns).toBe(0)
    expect(c.isArmed()).toBe(false)
  })
})

describe('W4 minTurns since the last close; the close does not retrigger itself', () => {
  test('after a close, two more person turns do not arm; the third does', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
    await talk(c, r, 2)
    expect(c.isArmed()).toBe(false)
    await r.clock.advance(5 * H)
    expect(r.runs).toHaveLength(1)
    await talk(c, r, 1)
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(2)
    expect(r.model().personTurnsAtLastClose).toBe(6)
  })
  test("the close's own turn (a plugin prompt and its turn.complete) does not re-trigger: no loop", async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
    await talk(c, r, 1, { kind: 'plugin' })
    expect(c.isArmed()).toBe(false)
    await r.clock.advance(24 * H)
    expect(r.runs).toHaveLength(1)
    expect(r.notifies).toHaveLength(1)
  })
  test('the fire re-checks state: a baseline raised after arming blocks the fire', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    r.setModel({ ...r.model(), personTurnsAtLastClose: 2 })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
  })
  test('the fire re-checks state: a turn recorded after arming (a stale timer) blocks the fire', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    r.setModel({ ...r.model(), lastTurnAt: (r.model().lastTurnAt ?? 0) + 1 })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
  })
})

describe('W5 maxPerDay per session; a new local day resets it', () => {
  test('two closes, then none on the same day; the next day closes again', async () => {
    const r = rig(at(20, 0))
    const c = ctl({ maxPerDay: 2 })
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(2)
    await talk(c, r, 3)
    expect(c.isArmed()).toBe(false)
    await r.clock.advance(2 * H)
    expect(r.runs).toHaveLength(2)
    await r.clock.advance(at(0, 10, 20) - r.clock.now)
    await talk(c, r, 3)
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(3)
    expect(r.model().closes).toBe(1)
    expect(r.model().day).toBe('2026-10-20')
  })
  test('the cap is judged on the day the close would land: a 23:30 turn due at 00:22 is a new day', async () => {
    const r = rig(at(22, 0))
    const c = ctl({ maxPerDay: 1 })
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
    await r.clock.advance(at(23, 30) - r.clock.now)
    await talk(c, r, 3)
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(2)
  })
  test('the fire re-checks the cap against state', async () => {
    const r = rig(at(14, 0))
    const c = ctl()
    await talk(c, r, 3)
    r.setModel({ ...r.model(), day: localDay(at(14, 0) + 52 * MIN + 3 * MIN), closes: 6 })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
  })
  test('maxPerDay 0 never closes', async () => {
    const r = rig()
    const c = ctl({ maxPerDay: 0 })
    await talk(c, r, 5)
    expect(c.isArmed()).toBe(false)
    await r.clock.advance(5 * H)
    expect(r.runs).toEqual([])
  })
})

describe('W6 modes', () => {
  test('notify: the notification only, never a command; the baseline moves so it does not nag', async () => {
    const r = rig(at(14, 0))
    const c = ctl({ mode: 'notify' })
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(r.notifies).toHaveLength(1)
    expect(r.notifies[0][0]).toBe('Cache about to lapse: run /close conversation --checkpoint while it is still warm')
    expect(r.notifies[0][1]).toBe('warm-close')
    expect(lastStatus(r)).toBe(`warm-close · notified ${local(r.clock.now)}`)
    await r.clock.advance(5 * H)
    expect(r.notifies).toHaveLength(1)
    await talk(c, r, 2)
    expect(c.isArmed()).toBe(false)
    await talk(c, r, 1)
    expect(c.isArmed()).toBe(true)
  })
  test('F7 notify mode sets no guard timer: only the closed-line timer is live after the fire (submit mode has both)', async () => {
    const n = rig()
    const cn = ctl({ mode: 'notify' })
    await talk(cn, n, 3)
    expect(n.clock.live()).toBe(1) // the armed timer
    await n.clock.advance(52 * MIN)
    expect(n.clock.live()).toBe(1) // the closed-line timer only
    await n.clock.advance(GUARD_MS * 2)
    expect(n.runs).toEqual([])
    await n.clock.advance(10 * MIN)
    expect(n.clock.live()).toBe(0)
    const s = rig()
    const cs = ctl()
    await talk(cs, s, 3)
    await s.clock.advance(52 * MIN)
    expect(s.clock.live()).toBe(2) // positive control: the closed-line timer AND the retry guard
  })
  test('off: inert. No timer, no status, no state write, no call', async () => {
    const r = rig()
    const c = ctl({ mode: 'off' })
    await talk(c, r, 6)
    await r.clock.advance(12 * H)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(r.status).toEqual([])
    expect(r.writes).toEqual([])
    expect(r.clock.live()).toBe(0)
  })
  test('garbage mode values read as off through readOptions, and stay inert', async () => {
    for (const mode of ['Submit', 'on', '', 7, null, true, ['submit']]) {
      const r = rig()
      const c = new WarmController(readOptions({ mode }))
      await talk(c, r, 6)
      await r.clock.advance(12 * H)
      expect(r.runs).toEqual([])
      expect(r.notifies).toEqual([])
      expect(r.writes).toEqual([])
    }
  })
})

describe('W7 the held-call guard: a held call is retried once, never twice', () => {
  async function fired(runMode: Rig['runMode']) {
    const r = rig(at(14, 0))
    r.runMode = runMode
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    return { r, c }
  }
  test('no turn.complete and the call unsettled after 90 s: exactly one more call with the same arguments', async () => {
    const { r } = await fired('hang')
    expect(r.runs).toEqual([CLOSE_CALL])
    await r.clock.advance(GUARD_MS - 1)
    expect(r.runs).toHaveLength(1)
    await r.clock.advance(1)
    expect(r.runs).toEqual([CLOSE_CALL, CLOSE_CALL])
    expect(/^warm-close · closed \d\d:\d\d · retried \d\d:\d\d$/.test(lastStatus(r) ?? '')).toBe(true)
    await r.clock.advance(6 * H)
    expect(r.runs).toHaveLength(2)
    expect(r.notifies).toHaveLength(1)
  })
  test('a call that settled in time is not retried', async () => {
    const { r } = await fired('resolve')
    await r.clock.advance(6 * H)
    expect(r.runs).toHaveLength(1)
  })
  test('a call that was refused is an answer, not a held call: no retry, and the status says it failed', async () => {
    for (const runMode of ['reject', 'throw'] as const) {
      const { r } = await fired(runMode)
      await r.clock.advance(6 * H)
      expect(r.runs).toHaveLength(1)
      expect(r.status.some(s => s !== undefined && s.startsWith('warm-close · close failed '))).toBe(true)
    }
  })
  test('a turn.complete inside the 90 s means the close ran: no retry', async () => {
    const { r, c } = await fired('hang')
    await r.clock.advance(30_000)
    await c.onTurn(r.ports)
    await r.clock.advance(6 * H)
    expect(r.runs).toHaveLength(1)
  })
  test('a prompt that entered inside the 90 s means the session is not idle: no retry', async () => {
    const { r, c } = await fired('hang')
    await r.clock.advance(30_000)
    await c.onPrompt(r.ports, { kind: 'plugin' }, false)
    await r.clock.advance(6 * H)
    expect(r.runs).toHaveLength(1)
  })
  test('a dropped prompt is not activity: the retry still happens', async () => {
    const { r, c } = await fired('hang')
    await r.clock.advance(30_000)
    await c.onPrompt(r.ports, PERSON, true)
    await r.clock.advance(GUARD_MS - 30_000)
    expect(r.runs).toHaveLength(2)
  })
  test('the retry itself being held or refused never leads to a third call', async () => {
    for (const second of ['hang', 'reject'] as const) {
      const { r } = await fired('hang')
      r.runMode = second
      await r.clock.advance(GUARD_MS)
      expect(r.runs).toHaveLength(2)
      await r.clock.advance(12 * H)
      expect(r.runs).toHaveLength(2)
    }
  })
  test('a second fire later in the session gets its own single retry', async () => {
    const { r, c } = await fired('hang')
    await r.clock.advance(GUARD_MS)
    expect(r.runs).toHaveLength(2)
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(3)
    await r.clock.advance(GUARD_MS)
    expect(r.runs).toHaveLength(4)
    await r.clock.advance(12 * H)
    expect(r.runs).toHaveLength(4)
  })
})

describe('W10 clamps through the controller', () => {
  test('ttl 5 with the default margin: armed for 1 minute after the last turn', async () => {
    const r = rig(at(14, 0))
    const c = new WarmController(readOptions({ ttlMinutes: 5 }))
    await talk(c, r, 3)
    const last = r.clock.now
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(last + MIN)}`)
    await r.clock.advance(MIN - 1)
    expect(r.runs).toEqual([])
    await r.clock.advance(1)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('ttl 5 with margin 1: fires at +4 min; margin 0 clamps to 1; margin 99 clamps to ttl - 1', async () => {
    for (const [margin, wait] of [[1, 4], [0, 4], [99, 1]] as const) {
      const r = rig()
      const c = new WarmController(readOptions({ ttlMinutes: 5, marginMinutes: margin }))
      await talk(c, r, 3)
      await r.clock.advance(wait * MIN - 1)
      expect(r.runs).toEqual([])
      await r.clock.advance(1)
      expect(r.runs).toHaveLength(1)
    }
  })
})

describe('F1 in-flight prompts are counted, not flagged', () => {
  test('prompt B queued while turn A runs: A completing does not make the conversation idle; B in flight at +60 min means no close', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false) // A, typed while idle
    await r.clock.advance(MIN)
    await c.onPrompt(r.ports, PERSON, false, true) // B, typed while A runs
    await r.clock.advance(MIN)
    await c.onTurn(r.ports) // A completes
    expect(c.isArmed()).toBe(false)
    expect(lastStatus(r)).toBeUndefined()
    await r.clock.advance(60 * MIN) // B waits on a permission prompt
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    await c.onTurn(r.ports) // B completes: now idle
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
  })
  test('a prompt that was merged into the running turn (it never gets a turn.complete of its own) heals at the next idle prompt', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false) // A
    await c.onPrompt(r.ports, PERSON, false, true) // B, merged into A
    await c.onTurn(r.ports) // the one turn.complete
    expect(c.isArmed()).toBe(false) // cannot tell merged from queued, so it waits: the safe direction
    await talk(c, r, 1) // a prompt typed while idle resets the count
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
  })
  test('a turn.complete with nothing in flight (a resumed session) never goes below zero', async () => {
    const r = rig()
    const c = ctl()
    await c.onTurn(r.ports)
    await c.onTurn(r.ports)
    expect(r.model().inFlight).toBe(0)
    await talk(c, r, 3)
    expect(c.isArmed()).toBe(true)
  })
})

describe('F2 a timer that fires early re-arms instead of closing; no delay can overflow', () => {
  test('an early fire (a 32-bit overflow fires in ~2 ms) closes nothing and re-arms for the rest', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    const last = r.clock.now
    const armedDelay = r.clock.delays[r.clock.delays.length - 1]
    expect(armedDelay).toBe(52 * MIN)
    await r.clock.fireNext()
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(c.isArmed()).toBe(true)
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(last + 52 * MIN)}`)
    expect(r.clock.delays[r.clock.delays.length - 1]).toBe(52 * MIN)
    await r.clock.advance(52 * MIN - 1)
    expect(r.runs).toEqual([])
    await r.clock.advance(1)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('within 5 s of the deadline counts as on time', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN - 4_000)
    await r.clock.fireNext()
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('a timer that keeps firing early is bounded: it never closes early and never loops forever', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    for (let i = 0; i < 40; i++) await r.clock.fireNext()
    expect(r.runs).toEqual([])
    expect(r.clock.delays.length).toBeLessThan(30)
    await r.clock.advance(6 * H)
    expect(r.runs).toEqual([])
  })
  test('a huge ttl is clamped before it reaches a timer: no delay is 2^31 ms or more', async () => {
    const r = rig()
    const c = new WarmController(readOptions({ ttlMinutes: 40_000 }))
    await talk(c, r, 3)
    expect(r.clock.delays.length).toBeGreaterThan(0)
    for (const ms of r.clock.delays) expect(ms).toBeLessThan(2 ** 31)
    expect(r.clock.delays[r.clock.delays.length - 1]).toBe((1440 - 8) * MIN)
  })
})

describe('F3 the retry guard waits 180 s and treats any prompt as activity', () => {
  async function firedManual() {
    const r = rig(at(14, 0))
    r.runMode = 'manual'
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    return { r, c }
  }
  test('a healthy close that emits a plugin-origin prompt.submit at 2 s and settles at 240 s runs exactly once', async () => {
    const { r, c } = await firedManual()
    await r.clock.advance(2_000)
    await c.onPrompt(r.ports, { kind: 'plugin', name: 'warm-close' }, false)
    await r.clock.advance(238_000)
    await r.settleRuns()
    await r.clock.advance(6 * H)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('a close that settles at 150 s with no prompt and no turn is not re-run (the old 90 s window re-ran it)', async () => {
    const { r } = await firedManual()
    await r.clock.advance(150_000)
    await r.settleRuns()
    await r.clock.advance(6 * H)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('still at most twice: a call held for ever is retried once at 180 s, and the retry settling later changes nothing', async () => {
    const { r } = await firedManual()
    await r.clock.advance(GUARD_MS - 1)
    expect(r.runs).toHaveLength(1)
    await r.clock.advance(1)
    expect(r.runs).toHaveLength(2)
    await r.settleRuns()
    await r.clock.advance(12 * H)
    expect(r.runs).toHaveLength(2)
  })
})

describe('F4 a manual /close moves the baseline, so a finished conversation is not re-closed', () => {
  test('manual /close, then 60 minutes idle: no automatic close', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(10 * MIN)
    await c.onManualClose(r.ports)
    expect(c.isArmed()).toBe(false)
    expect(lastStatus(r)).toBeUndefined()
    expect(r.model().personTurnsAtLastClose).toBe(3)
    await r.clock.advance(60 * MIN)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
  })
  test('the manual close does not count against the daily cap, and three new person turns arm again', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await c.onManualClose(r.ports)
    expect(r.model().closes).toBe(0)
    await talk(c, r, 2)
    expect(c.isArmed()).toBe(false)
    await talk(c, r, 1)
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
  })
  test('mode off: a manual close writes nothing', async () => {
    const r = rig()
    const c = ctl({ mode: 'off' })
    await c.onManualClose(r.ports)
    expect(r.writes).toEqual([])
  })
})

describe('F5 a prompt that is entering (its next(e) not yet resolved) blocks the timer and the retry', () => {
  test('the timer fires while a prompt is entering: no close, and the prompt then disarms the conversation as usual', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(51 * MIN)
    c.beginPrompt() // bumped synchronously, before next(e)
    await r.clock.advance(2 * MIN) // the deadline passes while next(e) is slow
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    await c.onPrompt(r.ports, PERSON, false)
    c.endPrompt()
    await r.clock.advance(6 * H)
    expect(r.runs).toEqual([])
    await c.onTurn(r.ports)
    expect(c.isArmed()).toBe(true)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
  })
  test('the prompt that was entering is dropped: the close for that idle period is skipped, not fired, and the counter is balanced', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(51 * MIN)
    c.beginPrompt()
    await r.clock.advance(2 * MIN)
    await c.onPrompt(r.ports, PERSON, true)
    c.endPrompt()
    await r.clock.advance(6 * H)
    expect(r.runs).toEqual([])
    await talk(c, r, 1)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toHaveLength(1)
  })
  test('the retry waits too: a prompt entering at 180 s is activity', async () => {
    const r = rig()
    r.runMode = 'hang'
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    await r.clock.advance(GUARD_MS - 10_000)
    c.beginPrompt()
    await r.clock.advance(20_000)
    expect(r.runs).toHaveLength(1)
    c.endPrompt()
    await r.clock.advance(6 * H)
    expect(r.runs).toHaveLength(1)
  })
})

describe('E1 a late timer must not close a cold cache', () => {
  test('a machine that slept past the TTL: the timer fires late and nothing is closed', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.jump(3 * H)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
  })
  test('positive control: late but still inside the TTL (55 min) still closes', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.jump(55 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
})

describe('E3 a clock that fails decides nothing', () => {
  test('a rejected or non-finite clock at turn.complete arms nothing and throws nothing', async () => {
    for (const bad of ['reject', Number.NaN, Number.POSITIVE_INFINITY] as const) {
      const r = rig()
      const c = ctl()
      await talk(c, r, 2)
      await c.onPrompt(r.ports, PERSON, false)
      r.nowOverride = bad
      await c.onTurn(r.ports)
      expect(c.isArmed()).toBe(false)
      r.nowOverride = undefined
      await r.clock.advance(5 * H)
      expect(r.runs).toEqual([])
    }
  })
})

describe('E4 reset (session.start, session.end) forgets the conversation', () => {
  test('an armed timer is cancelled, the line cleared, the counters emptied', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await c.reset(r.ports)
    expect(c.isArmed()).toBe(false)
    expect(lastStatus(r)).toBeUndefined()
    expect(r.model()).toEqual(EMPTY_MODEL)
    await r.clock.advance(5 * H)
    expect(r.runs).toEqual([])
  })
  test('a pending retry guard is cancelled too', async () => {
    const r = rig()
    r.runMode = 'hang'
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    await r.clock.advance(30_000)
    await c.reset(r.ports)
    await r.clock.advance(12 * H)
    expect(r.runs).toHaveLength(1)
  })
  test('a reset always clears the line once (a line left by an environment that was reloaded must not outlive it)', async () => {
    const r = rig()
    const c = ctl()
    await c.reset(r.ports)
    expect(r.status).toEqual([undefined])
  })
})

describe('E5 the closed line lasts ten minutes', () => {
  test('closed at the fire time, gone ten minutes later', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    const fireAt = r.clock.now
    expect(lastStatus(r)).toBe(`warm-close · closed ${local(fireAt)}`)
    await r.clock.advance(10 * MIN - 1)
    expect(lastStatus(r)).toBe(`warm-close · closed ${local(fireAt)}`)
    await r.clock.advance(1)
    expect(lastStatus(r)).toBeUndefined()
  })
  test('an armed line that was waiting behind the closed line appears when it ends', async () => {
    const r = rig()
    const c = ctl({ minTurns: 1 })
    await talk(c, r, 1)
    await r.clock.advance(52 * MIN)
    const fireAt = r.clock.now
    expect(r.runs).toHaveLength(1)
    await talk(c, r, 1)
    const due = r.clock.now + 52 * MIN
    expect(lastStatus(r)).toBe(`warm-close · closed ${local(fireAt)}`)
    await r.clock.advance(10 * MIN)
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(due)}`)
  })
})

// ---------- M10: the child hold (lane L3c)

const SDK = { kind: 'sdk' }
const HELD = 'warm-close · held, child session running'

/** A person turn in which a child was started: prompt, a minute, the tool.call, a minute, turn.complete. */
async function childTurn(c: WarmController, r: Rig, origin: unknown = PERSON) {
  await c.onPrompt(r.ports, origin, false)
  await r.clock.advance(MIN)
  await c.onChild(r.ports)
  await r.clock.advance(MIN)
  await c.onTurn(r.ports)
}

describe('H1 a child started, then idle to the fire: held, nothing recorded, nothing run', () => {
  test('no command.run, no notification, no state write, the held line, counters and baseline untouched', async () => {
    const r = rig(at(14, 0))
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    expect(c.isArmed()).toBe(true)
    const writes = r.writes.length
    const snapshot = JSON.stringify(r.model())
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(r.writes.length).toBe(writes)
    expect(JSON.stringify(r.model())).toBe(snapshot)
    expect(r.model().closes).toBe(0)
    expect(r.model().personTurnsAtLastClose).toBe(0)
    expect(r.model().lastFireAt).toBeUndefined()
    expect(r.model().day).toBeUndefined()
    expect(lastStatus(r)).toBe(HELD)
    expect(c.isArmed()).toBe(false)
  })
  test('a held skip is a skipped close, not a deferred one: nothing fires later, the line stays until a turn or prompt redraws it', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    await r.clock.advance(52 * MIN)
    await r.clock.advance(24 * H)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
  })
  test('positive control: the same conversation without a child fires at the same instant', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
    expect(r.notifies).toHaveLength(1)
  })
  test('false-silence guard: the first child report clears the hold; the wake re-arms; the next idle period fires normally', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
    await c.onPrompt(r.ports, SDK, false)
    expect(r.model().holdUntil).toBeUndefined()
    expect(lastStatus(r)).toBeUndefined()
    await r.clock.advance(MIN)
    await c.onTurn(r.ports)
    const wake = r.clock.now
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(wake + 52 * MIN)}`)
    await r.clock.advance(52 * MIN - 1)
    expect(r.runs).toEqual([])
    await r.clock.advance(1)
    expect(r.runs).toEqual([CLOSE_CALL])
    expect(r.notifies).toHaveLength(1)
    expect(r.model().closes).toBe(1)
    expect(lastStatus(r)).toBe(`warm-close · closed ${local(wake + 52 * MIN)}`)
  })
  test('the held line is redrawn away by the next turn (armed) and by the next prompt (cleared)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    await r.clock.advance(52 * MIN)
    expect(lastStatus(r)).toBe(HELD)
    await c.onPrompt(r.ports, { kind: 'peer' }, false)
    expect(lastStatus(r)).toBeUndefined()
    await r.clock.advance(MIN)
    await c.onTurn(r.ports)
    expect(lastStatus(r)).toBe(`warm-close · armed ${local(r.clock.now + 52 * MIN)}`)
  })
  test('a hold set while a turn runs: the call lands before turn.complete and still holds the fire after it', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false)
    await c.onChild(r.ports) // immediately, inside the turn
    await r.clock.advance(5 * MIN)
    await c.onTurn(r.ports)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
  })
  test('a second child call before the report extends the one hold (one hold for any number of children)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    const first = r.model().holdUntil as number
    await r.clock.advance(10 * MIN)
    await c.onChild(r.ports)
    expect(r.model().holdUntil).toBe(r.clock.now + 120 * MIN)
    expect(r.model().holdUntil as number).toBeGreaterThan(first)
    expect(Object.keys(r.model()).filter(k => k.toLowerCase().includes('hold'))).toEqual(['holdUntil'])
  })
  test('E-shape: the hold is judged at the fire from the stored model, not from memory of the controller', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    // a hold written by an earlier environment (a hot reload keeps state, drops the controller), within the configured 120 minutes
    r.setModel({ ...r.model(), holdUntil: r.clock.now + 100 * MIN })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
  })
  test('F4: a stored hold further away than the configured 120 minutes (3 h) is not a hold: the fire runs', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    r.setModel({ ...r.model(), holdUntil: r.clock.now + 3 * H })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
    expect(r.notifies).toHaveLength(1)
  })
})

describe('F6 the hold is anchored at the end of the turn in which a child was called', () => {
  test('a turn that ends 80 minutes after the call still holds at its fire (the hold would otherwise end 12 minutes before it)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false)
    await c.onChild(r.ports)
    const callHold = r.model().holdUntil as number
    await r.clock.advance(80 * MIN)
    await c.onTurn(r.ports)
    expect(r.model().holdUntil).toBe(r.clock.now + 120 * MIN)
    expect(r.model().holdUntil as number).toBeGreaterThan(callHold)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
  })
  test('the flag is consumed by that turn: the next turn leaves the hold where it was', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false)
    await c.onChild(r.ports)
    await r.clock.advance(80 * MIN)
    await c.onTurn(r.ports)
    const anchored = r.model().holdUntil as number
    await talk(c, r, 1)
    expect(r.model().holdUntil).toBe(anchored)
  })
  test('a turn with no child call never touches holdUntil', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    const held = r.model().holdUntil
    await r.clock.advance(30 * MIN)
    await talk(c, r, 1)
    expect(r.model().holdUntil).toBe(held)
    const r2 = rig()
    const c2 = ctl()
    await talk(c2, r2, 3)
    expect('holdUntil' in r2.model()).toBe(false)
  })
  test('a turn ending at the instant of the call changes nothing (max of equal anchors)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false)
    await c.onChild(r.ports)
    const first = r.model().holdUntil
    await c.onTurn(r.ports)
    expect(r.model().holdUntil).toBe(first)
  })
  test('a disabled hold or mode off never anchors anything (the flag is not even set)', async () => {
    for (const o of [{ childHoldMinutes: 0 }, { mode: 'off' as const }]) {
      const r = rig()
      const c = ctl(o)
      await c.onPrompt(r.ports, PERSON, false)
      await c.onChild(r.ports)
      await r.clock.advance(MIN)
      await c.onTurn(r.ports)
      expect('holdUntil' in r.model()).toBe(false)
    }
  })
  test('a reset forgets the pending anchor: the next turn after a new session.start holds nothing', async () => {
    const r = rig()
    const c = ctl()
    await c.onPrompt(r.ports, PERSON, false)
    await c.onChild(r.ports)
    await c.reset(r.ports)
    await c.onPrompt(r.ports, PERSON, false)
    await r.clock.advance(MIN)
    await c.onTurn(r.ports)
    expect('holdUntil' in r.model()).toBe(false)
  })
  test('the anchor is written even when the call-time write failed (a missing hold is the dangerous error)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await c.onPrompt(r.ports, PERSON, false)
    r.updateFails = true
    await expect(c.onChild(r.ports)).rejects.toThrow()
    r.updateFails = false
    await r.clock.advance(5 * MIN)
    await c.onTurn(r.ports)
    expect(r.model().holdUntil).toBe(r.clock.now + 120 * MIN)
  })
})

describe('H3/F2 only a child report (sdk) clears the hold; a typed prompt (composer) does not', () => {
  test('sdk clears it', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    expect(r.model().holdUntil).toBeDefined()
    await c.onPrompt(r.ports, SDK, false)
    expect(r.model().holdUntil).toBeUndefined()
    expect('holdUntil' in r.model()).toBe(false)
  })
  for (const origin of [PERSON, { kind: 'peer' }, { kind: 'peer-send-message' }, { kind: 'task-notification' }, { kind: 'plugin', name: 'warm-close' }, { kind: 'bridge' }, { kind: 'scheduled-trigger' }, undefined, null, 'sdk']) {
    test(`${JSON.stringify(origin)} leaves it alone`, async () => {
      const r = rig()
      const c = ctl()
      await talk(c, r, 2)
      await childTurn(c, r)
      const held = r.model().holdUntil
      expect(held).toBeDefined()
      await c.onPrompt(r.ports, origin, false)
      expect(r.model().holdUntil).toBe(held)
    })
  }
  test('a peer wake keeps the hold through its turn: the next idle fire is still held', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    await c.onPrompt(r.ports, { kind: 'peer' }, false)
    await r.clock.advance(MIN)
    await c.onTurn(r.ports)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
  })
  test('a prompt a hook dropped never entered, so it clears nothing (sdk and composer alike)', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    const held = r.model().holdUntil
    await c.onPrompt(r.ports, SDK, true)
    await c.onPrompt(r.ports, PERSON, true)
    expect(r.model().holdUntil).toBe(held)
  })
  test('F2: the person typing while the child runs does NOT clear the hold: the next idle fire is still held', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    await talk(c, r, 1) // composer prompt ("status?"), turn.complete
    expect(r.model().holdUntil).toBeDefined()
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([])
    expect(r.notifies).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
  })
  test('F2: several typed prompts in a row change nothing; the child report afterwards still clears it and the close fires normally', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    const held = r.model().holdUntil
    await talk(c, r, 3)
    expect(r.model().holdUntil).toBe(held)
    await c.onPrompt(r.ports, SDK, false)
    expect(r.model().holdUntil).toBeUndefined()
    await r.clock.advance(MIN)
    await c.onTurn(r.ports)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('F2: a typed prompt does not hold forever: the hold lapses at its expiry and the later idle fire runs', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    await r.clock.advance(125 * MIN) // past the 120-minute hold; the first fire (at 52) was held, so nothing ran
    expect(r.runs).toEqual([])
    await talk(c, r, 1)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
})

describe('H4 hold expiry and the option', () => {
  test('childHoldMinutes 30 with the default 52-min delay: the hold lapsed before the fire, so it runs', async () => {
    const r = rig()
    const c = new WarmController(readOptions({ childHoldMinutes: 30 }))
    await talk(c, r, 2)
    await childTurn(c, r)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
    expect(r.notifies).toHaveLength(1)
    expect(r.model().closes).toBe(1)
  })
  test('the boundary: a hold that ends exactly at the fire runs; one minute longer holds', async () => {
    const run = async (minutes: number) => {
      const r = rig()
      const c = new WarmController(readOptions({ childHoldMinutes: minutes }))
      await talk(c, r, 3)
      await c.onChild(r.ports) // at the last turn's instant: holdUntil = lastTurnAt + minutes
      await r.clock.advance(52 * MIN)
      return r
    }
    expect((await run(52)).runs).toEqual([CLOSE_CALL])
    expect((await run(53)).runs).toEqual([])
  })
  test('0, -5, a string and NaN disable the hold: no state write at all, and the fire runs', async () => {
    for (const v of [0, -5, 'x', Number.NaN]) {
      const r = rig()
      const c = new WarmController(readOptions({ childHoldMinutes: v }))
      await talk(c, r, 3)
      const writes = r.writes.length
      await c.onChild(r.ports)
      expect(r.writes.length).toBe(writes)
      expect(r.model().holdUntil).toBeUndefined()
      await r.clock.advance(52 * MIN)
      expect(r.runs).toEqual([CLOSE_CALL])
    }
  })
  test('5000 clamps to 1440: the stored hold is now + 1440 minutes', async () => {
    const r = rig()
    const c = new WarmController(readOptions({ childHoldMinutes: 5000 }))
    await talk(c, r, 3)
    await c.onChild(r.ports)
    expect(r.model().holdUntil).toBe(r.clock.now + 1440 * MIN)
  })
  test('the default hold is now + 120 minutes', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    await c.onChild(r.ports)
    expect(r.model().holdUntil).toBe(r.clock.now + 120 * MIN)
  })
  test('a hold stored earlier is inert once the option is 0 (no hook effect at all)', async () => {
    const r = rig()
    const c = ctl({ childHoldMinutes: 0 })
    await talk(c, r, 3)
    r.setModel({ ...r.model(), holdUntil: r.clock.now + 5 * H })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('a hold longer than the cache is moot (documented): 120 minutes covers the 52-minute fire, 40 does not', async () => {
    for (const [minutes, runs] of [[120, 0], [40, 1]] as const) {
      const r = rig()
      const c = new WarmController(readOptions({ childHoldMinutes: minutes }))
      await talk(c, r, 3)
      await c.onChild(r.ports)
      await r.clock.advance(52 * MIN)
      expect(r.runs).toHaveLength(runs)
    }
  })
})

describe('H7 the hold applies in every mode', () => {
  test('notify mode: no notification at the fire; the held line; positive control without a child notifies once', async () => {
    const r = rig()
    const c = ctl({ mode: 'notify' })
    await talk(c, r, 2)
    await childTurn(c, r)
    await r.clock.advance(52 * MIN)
    expect(r.notifies).toEqual([])
    expect(r.runs).toEqual([])
    expect(lastStatus(r)).toBe(HELD)
    const r2 = rig()
    const c2 = ctl({ mode: 'notify' })
    await talk(c2, r2, 3)
    await r2.clock.advance(52 * MIN)
    expect(r2.notifies).toHaveLength(1)
    expect(r2.runs).toEqual([])
  })
  test('mode off: onChild writes nothing and arms nothing', async () => {
    const r = rig()
    const c = ctl({ mode: 'off' })
    await c.onChild(r.ports)
    expect(r.writes).toEqual([])
    expect(r.status).toEqual([])
    expect(c.isArmed()).toBe(false)
    expect(r.clock.live()).toBe(0)
  })
})

describe('H8 an older persisted model, and the reset', () => {
  test('a model written before this field existed fires as it always did', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    const m = r.model()
    r.setModel({ personTurns: m.personTurns, personTurnsAtLastClose: m.personTurnsAtLastClose, inFlight: m.inFlight, closes: m.closes, lastTurnAt: m.lastTurnAt })
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
  test('session.start / session.end (reset) clear the hold: after it, a fresh conversation closes normally', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 2)
    await childTurn(c, r)
    expect(r.model().holdUntil).toBeDefined()
    await c.reset(r.ports)
    expect(r.model()).toEqual(EMPTY_MODEL)
    expect(r.model().holdUntil).toBeUndefined()
    await talk(c, r, 3)
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
})

describe('onChild failures never stick the controller', () => {
  test('a dead clock records no hold and does not throw', async () => {
    const r = rig()
    const c = ctl()
    r.nowOverride = 'reject'
    await c.onChild(r.ports)
    expect(r.writes).toEqual([])
  })
  test('a state write that fails rejects this step only: the next step runs and no hold exists', async () => {
    const r = rig()
    const c = ctl()
    await talk(c, r, 3)
    r.updateFails = true
    await expect(c.onChild(r.ports)).rejects.toThrow()
    r.updateFails = false
    expect(r.model().holdUntil).toBeUndefined()
    await r.clock.advance(52 * MIN)
    expect(r.runs).toEqual([CLOSE_CALL])
  })
})
