// Register-level tests for the child hold (lane L3c): the REAL hooks/register.tsx driven through a fake `on` and a fake `$`.
// The kit's `$.tool.call` drops `agentId` (see launch-copy/tests/engine.test.tsx), so these own: the registration list and
// the literal matcher, every `$` member the tool.call observer reaches (the allowlist, enforced by a Proxy), the subagent
// loop (H5), and H6 — the observer returns `next(e)`'s result BY IDENTITY for a matching and a non-matching tool, for a deny,
// and when its own bookkeeping throws; mode off and a disabled hold touch nothing.
// The dispatcher emulates the engine: matcher (`{ tool: [...] }` any-of), `next` = the bottom of the chain (replay-safe, as
// the d.ts says), and a throw goes to the registration's `.catch`.
import { describe, expect, test } from 'claude-code/testing'

import { register } from '../hooks/register'

const T0 = new Date(2026, 9, 19, 14, 7, 0).getTime()
const MIN = 60_000
const START = 'mcp__ccd_session__start_session'

type Reg = { name: string; matcher?: unknown; h: any; c?: any }
type Host = {
  /** the stored value under 'warm-close/model', as `$.state.set` last wrote it */
  stored: unknown
  version: number
  writes: unknown[]
  stateThrows: boolean
  clockThrows: boolean
  /** `$.state.get` / `$.state.set` never answer (a stuck state op). */
  stateHangs: boolean
  /** every `$` member reached, as 'state.get' …; anything off the allowlist is 'forbidden:<key>' */
  used: Set<string>
  statuses: (string | undefined)[]
  notifies: string[]
  runs: [string, string][]
  timers: { ms: number; live: boolean; fn: () => void }[]
}
// The tool.call observer may reach only the clock and the state; the rest of the mod reaches the UI, the command and timers.
const ALLOWED = new Set(['clock.now', 'clock.after', 'state.get', 'state.set', 'ui.status', 'ui.notify', 'command.run'])

function mount(options?: unknown, stored?: unknown) {
  const host: Host = { stored, version: stored === undefined ? 0 : 1, writes: [], stateThrows: false, clockThrows: false, stateHangs: false, used: new Set(), statuses: [], notifies: [], runs: [], timers: [] }
  const regs: Reg[] = []
  const on = (name: string, a: any, b?: any) => {
    const r: Reg = typeof b === 'function' ? { name, matcher: a, h: b } : { name, h: a }
    regs.push(r)
    return {
      catch(c: any) {
        r.c = c
        return this
      },
    }
  }
  const real = {
    state: {
      get: async (_ref: unknown) => {
        if (host.stateThrows) throw new Error('state denied')
        if (host.stateHangs) return new Promise<never>(() => {})
        return { value: host.stored, version: host.version }
      },
      set: async (_ref: unknown, value: unknown, o?: { ifVersion?: number }) => {
        if (host.stateThrows) throw new Error('state denied')
        if (host.stateHangs) return new Promise<never>(() => {})
        if (o?.ifVersion !== undefined && o.ifVersion !== host.version) return { isSet: false, version: host.version }
        host.stored = JSON.parse(JSON.stringify(value))
        host.version += 1
        host.writes.push(host.stored)
        return { isSet: true, version: host.version }
      },
    },
    clock: {
      now: async () => {
        if (host.clockThrows) throw new Error('clock denied')
        return T0
      },
      after: (ms: number, fn: () => void) => {
        const t = { ms, live: true, fn }
        host.timers.push(t)
        return { cancel: () => { t.live = false } }
      },
    },
    ui: {
      status: (t: string | undefined) => { host.statuses.push(t) },
      notify: async (text: string) => { host.notifies.push(text); return { isSent: false, reason: 'disabled' } },
    },
    command: {
      run: async (a: { command: string; args: string }) => { host.runs.push([a.command, a.args]); return {} },
    },
  } as Record<string, Record<string, unknown>>
  const sub = (ns: string): any =>
    new Proxy(real[ns], {
      get: (target, key) => {
        if (typeof key === 'string') host.used.add(ALLOWED.has(`${ns}.${key}`) ? `${ns}.${key}` : `forbidden:${ns}.${key}`)
        return (target as any)[key as string]
      },
    })
  const $: any = new Proxy({}, {
    get: (_t, key) => {
      if (typeof key === 'string' && key in real) return sub(key)
      if (typeof key === 'string') host.used.add(`forbidden:${key}`)
      return undefined
    },
  })
  register(on as any, options)

  const matches = (m: any, e: any) => m === undefined || (Array.isArray(m.tool) ? m.tool.includes(e.tool) : true)
  /**
   * Raises `name` with `e`; `bottom` is what core answers. Resolves to what the chain resolved to. The tool.call observer
   * starts its bookkeeping without awaiting it (F5), so by default `dispatch` lets the microtask queue drain before it
   * returns (`settleAfter` false = return as soon as the hook does, which is what the F5 tests need).
   */
  const dispatch = async (name: string, e: any, bottom: () => unknown, settleAfter = true) => {
    const run = async () => {
      const r = regs.find(x => x.name === name && matches(x.matcher, e))
      if (!r) return bottom()
      let called: Promise<unknown> | undefined
      const next = (_x: unknown) => (called ??= Promise.resolve().then(bottom))
      try {
        return await r.h($, e, next)
      } catch (err) {
        if (!r.c) throw err
        return await r.c($, e, next, err)
      }
    }
    const out = await run()
    if (settleAfter) await settle()
    return out
  }
  return { host, regs, dispatch }
}

/** Lets every pending microtask (the observer's un-awaited bookkeeping) run to its end. */
const settle = async () => {
  for (let i = 0; i < 300; i++) await Promise.resolve()
}

const OK = () => ({ ref: 1, result: {}, text: 'ok' })
const call = (tool: string, extra: Record<string, unknown> = {}) => ({ tool, tool_use_id: 'u1', ...extra })
// a start_session that really starts a session (F1: `offer` / `own_initiative` without a proposal_id only show a card)
const start = (extra: Record<string, unknown> = {}) => call(START, { title: 'build', prompt: 'go', initiation: 'user_asked', ...extra })
const send = (to: unknown, extra: Record<string, unknown> = {}) => call('SendMessage', { to, message: 'status?', ...extra })
const held = (h: Host) => (h.stored as { holdUntil?: number } | undefined)?.holdUntil
const quiet = (h: Host) => h.used.size === 0 && h.writes.length === 0 && h.timers.length === 0

describe('registration', () => {
  test('the tool.call observer is registered with the literal matcher and a .catch', () => {
    const { regs } = mount()
    const t = regs.filter(r => r.name === 'tool.call')
    expect(t).toHaveLength(1)
    expect(t[0].matcher).toEqual({ tool: ['mcp__ccd_session__start_session', 'SendMessage'] })
    expect(typeof t[0].c).toBe('function')
  })
  test('the five existing registrations are unchanged and every registration ends in a .catch that replays the chain', async () => {
    const { regs } = mount()
    expect(regs.map(r => r.name).sort()).toEqual(['command.run', 'prompt.submit', 'session.end', 'session.start', 'tool.call', 'turn.complete'])
    expect(regs.find(r => r.name === 'command.run')?.matcher).toEqual({ command: 'close' })
    const marker = {}
    for (const r of regs) {
      expect(typeof r.c).toBe('function')
      expect(await r.c({}, {}, async () => marker)).toBe(marker)
    }
  })
  test('registration is the same for every mode and hold value (decided inside the hooks)', () => {
    for (const o of [{ mode: 'off' }, { mode: 'notify' }, { childHoldMinutes: 0 }, { childHoldMinutes: 'x' }, { childHoldMinutes: 5000 }]) {
      expect(mount(o).regs.filter(r => r.name === 'tool.call')).toHaveLength(1)
    }
  })
})

describe('H2/H1 a start_session and a SendMessage to a local_ id record the hold; nothing else does', () => {
  test('start_session records holdUntil = now + 120 minutes, touching only the clock and the state', async () => {
    const { host, dispatch } = mount()
    await dispatch('tool.call', start(), OK)
    expect(held(host)).toBe(T0 + 120 * MIN)
    expect([...host.used].every(k => ['clock.now', 'state.get', 'state.set'].includes(k))).toBe(true)
    expect(host.statuses).toEqual([])
    expect(host.notifies).toEqual([])
    expect(host.runs).toEqual([])
    expect(host.timers).toEqual([])
  })
  test('SendMessage to local_abc holds; the option is read (30 minutes)', async () => {
    const { host, dispatch } = mount({ childHoldMinutes: 30 })
    await dispatch('tool.call', send('local_abc'), OK)
    expect(held(host)).toBe(T0 + 30 * MIN)
  })
  test('SendMessage to a subagent name or id, a missing or non-string to: no hold, no state or clock use at all', async () => {
    for (const to of ['researcher', 'a1234567890abcdef', undefined, null, 5, ['local_abc']]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', send(to), OK)
      expect(quiet(host)).toBe(true)
    }
    const { host, dispatch } = mount()
    await dispatch('tool.call', call('SendMessage', { message: 'x' }), OK)
    expect(quiet(host)).toBe(true)
  })
  test('a tool the matcher does not name never reaches the observer', async () => {
    const { host, dispatch } = mount()
    for (const tool of ['Agent', 'Task', 'Bash', 'mcp__ccd_session__list_sessions']) await dispatch('tool.call', call(tool, { to: 'local_abc' }), OK)
    expect(quiet(host)).toBe(true)
  })
  test('an older stored model (no holdUntil) is read and gains the field without losing the rest', async () => {
    const older = { personTurns: 4, personTurnsAtLastClose: 1, inFlight: 0, closes: 2, lastTurnAt: T0 - MIN }
    const { host, dispatch } = mount(undefined, older)
    await dispatch('tool.call', start(), OK)
    expect(host.stored).toEqual({ ...older, holdUntil: T0 + 120 * MIN })
  })
})

describe('H5 a denied or failed call, or one from a subagent loop, holds nothing', () => {
  test('a deny (before or after the tool answered) holds nothing', async () => {
    for (const mk of [start, () => send('local_abc')]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', mk(), () => ({ deny: 'blocked' }))
      expect(quiet(host)).toBe(true)
    }
  })
  test('isError holds nothing', async () => {
    for (const mk of [start, () => send('local_abc')]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', mk(), () => ({ ref: 1, result: {}, text: 'boom', isError: true }))
      expect(quiet(host)).toBe(true)
    }
  })
  test("a call from a subagent's loop (agentId) holds nothing, for both tools", async () => {
    for (const mk of [() => start({ agentId: 'a1234567890abcdef' }), () => send('local_abc', { agentId: 'a1' })]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', mk(), OK)
      expect(quiet(host)).toBe(true)
    }
  })
  test('positive control: the same calls from the main loop with a clean result hold', async () => {
    for (const mk of [start, () => send('local_abc')]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', mk(), OK)
      expect(held(host)).toBe(T0 + 120 * MIN)
    }
  })
  test('F3: agentId null is the main loop (only a non-null agentId is a subagent): both tools hold', async () => {
    for (const mk of [() => start({ agentId: null }), () => send('local_abc', { agentId: null })]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', mk(), OK)
      expect(held(host)).toBe(T0 + 120 * MIN)
    }
  })
})

describe('F1 a start_session that only shows a card, or starts a cloud session, holds nothing', () => {
  test('offer and own_initiative without a proposal_id, or no initiation at all: nothing read, nothing written', async () => {
    for (const extra of [{ initiation: 'offer' }, { initiation: 'own_initiative' }, { initiation: undefined }, { initiation: 'garbage' }]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', start(extra), OK)
      expect(quiet(host)).toBe(true)
    }
  })
  test('a proposal_id turns an offer into a started session: it holds', async () => {
    const { host, dispatch } = mount()
    await dispatch('tool.call', start({ initiation: 'offer', proposal_id: 'prop_1' }), OK)
    expect(held(host)).toBe(T0 + 120 * MIN)
  })
  test('target cloud holds nothing; local and ssh hold', async () => {
    const cloud = mount()
    await cloud.dispatch('tool.call', start({ target: 'cloud' }), OK)
    expect(quiet(cloud.host)).toBe(true)
    for (const target of ['local', 'ssh']) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', start({ target }), OK)
      expect(held(host)).toBe(T0 + 120 * MIN)
    }
  })
})

describe('F5 the observer never delays the tool call and the controller keeps the order', () => {
  const answers = async (p: Promise<unknown>) => Promise.race([p, new Promise(res => setTimeout(() => res('TIMED OUT'), 100))])
  test('$.state never answers: the tool call still comes back at once, by identity, for both tools', async () => {
    for (const mk of [start, () => send('local_abc')]) {
      const { host, dispatch } = mount()
      host.stateHangs = true
      const result = OK()
      expect(await answers(dispatch('tool.call', mk(), () => result, false))).toBe(result)
    }
  })
  test('the hold is still recorded once the state does answer (started, not dropped)', async () => {
    const { host, dispatch } = mount()
    const result = OK()
    expect(await dispatch('tool.call', start(), () => result, false)).toBe(result)
    await settle()
    expect(held(host)).toBe(T0 + 120 * MIN)
  })
  test('the next turn.complete step runs after the hold is recorded (the serial latch keeps the order)', async () => {
    const { host, dispatch } = mount()
    await dispatch('prompt.submit', { text: 'hi', wait: false, origin: { kind: 'composer' } }, () => ({ text: 'hi' }))
    await dispatch('tool.call', start(), OK, false)
    await dispatch('turn.complete', { answer: 'ok', reason: 'answer' }, () => ({ text: '' }), false)
    await settle()
    const w = host.writes as { holdUntil?: number; lastTurnAt?: number }[]
    const iHold = w.findIndex(x => x.holdUntil !== undefined)
    const iTurn = w.findIndex(x => x.lastTurnAt !== undefined)
    expect(iHold).toBeGreaterThanOrEqual(0)
    expect(iTurn).toBeGreaterThan(iHold)
    expect(w[iTurn].holdUntil).toBe(T0 + 120 * MIN)
  })
  test('a throwing state op during the un-awaited bookkeeping never surfaces (no unhandled rejection, result by identity)', async () => {
    const { host, dispatch } = mount()
    host.stateThrows = true
    const result = OK()
    expect(await dispatch('tool.call', send('local_abc'), () => result)).toBe(result)
    expect(host.writes).toEqual([])
  })
})

describe('H6 the observer returns next(e) result by identity and never throws into the call', () => {
  test('matching tools: start_session and SendMessage return the very object next resolved to', async () => {
    for (const mk of [start, () => send('local_abc'), () => send('researcher')]) {
      const { dispatch } = mount()
      const result = OK()
      expect(await dispatch('tool.call', mk(), () => result)).toBe(result)
    }
  })
  test('a deny and an isError result come back by identity too', async () => {
    for (const result of [{ deny: 'no' }, { ref: 1, result: {}, text: 'x', isError: true }]) {
      const { dispatch } = mount()
      expect(await dispatch('tool.call', start(), () => result)).toBe(result)
    }
  })
  test('a non-matching tool is not touched at all (the chain answers)', async () => {
    const { host, dispatch } = mount()
    const result = OK()
    expect(await dispatch('tool.call', call('Bash', { command: 'ls' }), () => result)).toBe(result)
    expect(quiet(host)).toBe(true)
  })
  test('its own bookkeeping throws (a throwing $.state): the result still comes back by identity, nothing is stored', async () => {
    const { host, dispatch } = mount()
    host.stateThrows = true
    const result = OK()
    expect(await dispatch('tool.call', start(), () => result)).toBe(result)
    expect(host.writes).toEqual([])
  })
  test('a throwing clock: the result still comes back by identity', async () => {
    const { host, dispatch } = mount()
    host.clockThrows = true
    const result = OK()
    expect(await dispatch('tool.call', send('local_abc'), () => result)).toBe(result)
    expect(host.writes).toEqual([])
  })
  test('if next itself throws, the .catch replays the chain and returns its result by identity', async () => {
    const { regs } = mount()
    const r = regs.find(x => x.name === 'tool.call') as Reg
    const result = OK()
    expect(await r.c({}, start(), async () => result)).toBe(result)
  })
})

describe('mode off and a disabled hold: no hook effect at all', () => {
  test('mode off: the observer writes nothing and reaches nothing', async () => {
    const { host, dispatch } = mount({ mode: 'off' })
    const result = OK()
    expect(await dispatch('tool.call', start(), () => result)).toBe(result)
    await dispatch('tool.call', send('local_abc'), OK)
    expect(quiet(host)).toBe(true)
  })
  test('a garbage mode reads as off: same', async () => {
    const { host, dispatch } = mount({ mode: 'banana' })
    await dispatch('tool.call', start(), OK)
    expect(quiet(host)).toBe(true)
  })
  test('childHoldMinutes 0, -5, "x", NaN: nothing read, nothing written', async () => {
    for (const v of [0, -5, 'x', Number.NaN]) {
      const { host, dispatch } = mount({ childHoldMinutes: v })
      const result = OK()
      expect(await dispatch('tool.call', start(), () => result)).toBe(result)
      expect(quiet(host)).toBe(true)
    }
  })
  test('childHoldMinutes 5000 clamps to 1440', async () => {
    const { host, dispatch } = mount({ childHoldMinutes: 5000 })
    await dispatch('tool.call', start(), OK)
    expect(held(host)).toBe(T0 + 1440 * MIN)
  })
})

describe('the allowlist: the whole mod reaches only the clock, the state, the status, the notification and command.run', () => {
  test('every registration run once reaches nothing else', async () => {
    const { host, dispatch } = mount()
    await dispatch('session.start', { cwd: '/x', surface: null, isInteractive: false }, () => ({ cwd: '/x' }))
    await dispatch('prompt.submit', { text: 'hi', wait: false, origin: { kind: 'composer' } }, () => ({ text: 'hi' }))
    await dispatch('tool.call', start(), OK)
    await dispatch('tool.call', send('local_abc'), OK)
    await dispatch('command.run', { command: 'close', args: '', origin: { kind: 'composer' } }, () => ({}))
    await dispatch('turn.complete', { answer: 'ok', reason: 'answer' }, () => ({ text: '' }))
    await dispatch('session.end', { reason: 'other', sessionId: 's1', resume: {} }, () => ({ sessionId: 's1' }))
    expect([...host.used].filter(k => k.startsWith('forbidden:'))).toEqual([])
    expect([...host.used].every(k => ALLOWED.has(k))).toBe(true)
  })
})
