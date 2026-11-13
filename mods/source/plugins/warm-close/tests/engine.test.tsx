// Kit tests: the mod loaded from this folder with its manifest DEFAULTS (mode "submit", ttl 60, margin 8, minTurns 3,
// maxPerDay 6); the test's `on` hooks are the engine beneath it, the test's `$` makes every call as the REPL does.
// W1 arm and fire, W2 re-arm, W3 SDK/-p protection, W4 no loop, W8 the desktop start (surface null, isInteractive
// false) still arms and fires, W9 every observer returns the chain's result unchanged and a throw passes through.
// Non-default options are tested in controller.test.ts / lib.test.ts, and (if the kit passes them) in the last block.
import { describe, expect, mock, test, type Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const T0 = Date.parse('2026-10-19T12:00:00Z')
const MIN = 60_000
const H = 3_600_000
const pad = (n: number) => String(n).padStart(2, '0')
const local = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Notify = { text: string; title?: string }
type Run = { command: string; args: string; origin: { kind: string; name?: string } }
type World = {
  status: (string | undefined)[]
  notifies: Notify[]
  runs: Run[]
  state: unknown
  version: number
}

type Bottoms = Partial<Record<'session.start' | 'session.end' | 'prompt.submit' | 'turn.complete' | 'tool.call', (...hookArgs: never[]) => unknown>>

/** `bottom` replaces the echoing hook at the bottom of one chain (the kit allows one bottom hook per event). */
function world(on: On, o: { deny?: readonly string[]; bottom?: Bottoms; noRun?: boolean } = {}) {
  const w: World = { status: [], notifies: [], runs: [], state: undefined, version: 0 }
  const denied = new Set(o.deny ?? [])
  const no = (op: string) => ({ deny: `denied by the test world: ${op}` }) as never
  const clock = mock.clock(on, { now: T0 })
  on('ui.status', ($, e) => {
    w.status.push((e as { text: string | undefined }).text)
    return { value: undefined }
  })
  on('ui.notify', ($, e) => {
    const x = e as unknown as { text: string; title?: string }
    w.notifies.push({ text: x.text, title: x.title })
    return { value: { isSent: false, reason: 'disabled' } } as never
  })
  // `noRun`: nothing answers command.run beneath the plugins, so the bottom hook throws and the mod's call rejects
  if (o.noRun !== true) {
    on('command.run', ($, e) => {
      const x = e as unknown as Run
      w.runs.push({ command: x.command, args: x.args, origin: x.origin })
      return {} as never
    })
  }
  on('state.get', () => (denied.has('state.get') ? no('state.get') : ({ value: { value: w.state, version: w.version } } as never)))
  on('state.set', ($, e) => {
    if (denied.has('state.set')) return no('state.set')
    const ev = e as unknown as { value: unknown; ifVersion?: number }
    if (ev.ifVersion !== undefined && ev.ifVersion !== w.version) return { value: { isSet: false, version: w.version } } as never
    w.state = JSON.parse(JSON.stringify(ev.value))
    w.version += 1
    return { value: { isSet: true, version: w.version } } as never
  })
  // the bottom of each chain the mod observes: core echoes its input
  const b = o.bottom ?? {}
  on('session.start', b['session.start'] ?? (($, e) => ({ cwd: e.cwd })))
  on('session.end', b['session.end'] ?? (($, e) => ({ sessionId: (e as { sessionId: string }).sessionId }) as never))
  on('prompt.submit', b['prompt.submit'] ?? (($, e) => ({ text: e.text })))
  on('turn.complete', b['turn.complete'] ?? (() => ({ text: '' })))
  // core's answer to a tool.call: `{ ref, result, text }` (a deny or an isError result comes from a test's bottom)
  on('tool.call', b['tool.call'] ?? (() => ({ ref: 1, result: {}, text: 'ok' }) as never))
  return { w, clock }
}
const lastStatus = (w: World) => w.status[w.status.length - 1]

const START = { cwd: '/tmp', surface: null, isInteractive: false }
const COMPOSER = { kind: 'composer' }
const submit = (origin: unknown = COMPOSER) => ({ text: 'hello', wait: false, origin }) as never
const complete = (extra: Record<string, unknown> = {}) => ({ answer: 'ok', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer', ...extra }) as never
const END = { reason: 'prompt_input_exit', sessionId: 's1', resume: {} } as never

type Eng = Engine
type Clock = ReturnType<typeof mock.clock>

/** n turns: a prompt, a minute of work, its turn.complete. */
async function talk($: Eng, clock: Clock, n: number, origin: unknown = COMPOSER) {
  for (let i = 0; i < n; i++) {
    await $.prompt.submit(submit(origin))
    await clock.advance(MIN)
    await $.turn.complete(complete())
  }
}

// ---------- W1 + W8

describe('W1 the close fires at ttl - margin after the last turn, exactly once', () => {
  test('3 composer turns, then idle: one command.run close with the checkpoint argument, after one notification', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    const last = clock.now()
    expect(lastStatus(w)).toBe(`warm-close · armed ${local(last + 52 * MIN)}`)
    await clock.advance(52 * MIN - 1)
    expect(w.runs).toEqual([])
    await clock.advance(1)
    expect(w.runs).toHaveLength(1)
    expect(w.runs[0].command).toBe('close')
    expect(w.runs[0].args).toBe('conversation --checkpoint')
    expect(w.runs[0].origin.kind).toBe('plugin')
    expect(w.notifies).toEqual([{ text: 'Closing this conversation while its cache is warm: /close conversation --checkpoint', title: 'warm-close' }])
    expect(lastStatus(w)).toBe(`warm-close · closed ${local(last + 52 * MIN)}`)
    await clock.advance(6 * H)
    expect(w.runs).toHaveLength(1)
    expect(lastStatus(w)).toBeUndefined()
  })
  test('two composer turns are not enough', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
    expect(lastStatus(w)).toBeUndefined()
  })
})

describe('W8 surface null and isInteractive false at session.start still arms and fires (the desktop)', () => {
  const starts: [string, unknown][] = [
    ['desktop: surface null, isInteractive false', { cwd: '/tmp', surface: null, isInteractive: false }],
    ['absent surface', { cwd: '/tmp', isInteractive: false }],
    ['terminal, interactive', { cwd: '/tmp', surface: 'terminal', isInteractive: true }],
    ['a known non-drawing surface (vscode), not interactive', { cwd: '/tmp', surface: 'vscode', isInteractive: false }],
    ['mobile, interactive', { cwd: '/tmp', surface: 'mobile', isInteractive: true }],
  ]
  for (const [label, start] of starts) {
    test(label, async ($, on) => {
      const { w, clock } = world(on)
      await $.session.start(start as never)
      await talk($, clock, 3)
      expect(lastStatus(w)).toBe(`warm-close · armed ${local(clock.now() + 52 * MIN)}`)
      await clock.advance(52 * MIN)
      expect(w.runs).toHaveLength(1)
      expect(w.runs[0].command).toBe('close')
    })
  }
  test('no session.start at all (a /clear raises none): turns still arm and fire', async ($, on) => {
    const { w, clock } = world(on)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

// ---------- W2

describe('W2 a turn before the deadline re-arms; nothing fires early', () => {
  test('a turn at +40 min moves the deadline; one close at the new one', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    const first = clock.now()
    await clock.advance(40 * MIN)
    await talk($, clock, 1)
    const second = clock.now()
    await clock.advance(first + 52 * MIN - clock.now() + 5 * MIN)
    expect(w.runs).toEqual([])
    await clock.advance(second + 52 * MIN - clock.now() - 1)
    expect(w.runs).toEqual([])
    await clock.advance(1)
    expect(w.runs).toHaveLength(1)
  })
  test("a subagent's turn.complete (agentId) neither arms nor re-arms", async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    const first = clock.now()
    await clock.advance(30 * MIN)
    await $.turn.complete(complete({ agentId: 'agent-1' }))
    await clock.advance(first + 52 * MIN - clock.now())
    expect(w.runs).toHaveLength(1)
  })
  test('prompts but no main-conversation turn.complete: never armed', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    for (let i = 0; i < 4; i++) {
      await $.prompt.submit(submit())
      await $.turn.complete(complete({ agentId: 'agent-1' }))
    }
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
  })
})

// ---------- W3

describe('W3 zero composer turns never fires (SDK and -p sessions)', () => {
  test('sdk, plugin, bridge, task-notification and scheduled origins only', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false } as never)
    for (const kind of ['sdk', 'plugin', 'bridge', 'task-notification', 'scheduled-trigger', 'peer']) await talk($, clock, 2, { kind })
    await clock.advance(12 * H)
    expect(w.runs).toEqual([])
    expect(w.notifies).toEqual([])
    expect(w.status.filter(s => s !== undefined)).toEqual([])
  })
  test('a prompt a hook above dropped never counts', async ($, on) => {
    const { w, clock } = world(on, { bottom: { 'prompt.submit': () => ({ drop: 'no' }) } })
    await $.session.start(START as never)
    for (let i = 0; i < 3; i++) {
      expect(await $.prompt.submit(submit())).toEqual({ drop: 'no' })
      await clock.advance(MIN)
      await $.turn.complete(complete())
    }
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
  })
})

// ---------- W4

describe('W4 the close does not retrigger itself', () => {
  test("the close's own turn (a plugin prompt, then its turn.complete) leaves nothing armed", async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
    await talk($, clock, 1, { kind: 'plugin', name: 'warm-close' })
    await clock.advance(24 * H)
    expect(w.runs).toHaveLength(1)
    expect(w.notifies).toHaveLength(1)
  })
  test('two more person turns after a close are not enough; a third closes again', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    await talk($, clock, 2)
    await clock.advance(6 * H)
    expect(w.runs).toHaveLength(1)
    await talk($, clock, 1)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(2)
  })
})

describe('W7 a refused call (the chain throws on command.run) is an answer, not a held call', () => {
  test('positive control: an answered call is made once and never repeated', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
    await clock.advance(6 * H)
    expect(w.runs).toHaveLength(1)
  })
  test('with nothing answering command.run (the call rejects): no retry, and the failure is on the line', async ($, on) => {
    const { w, clock } = world(on, { noRun: true })
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    const fireAt = clock.now()
    expect(w.status.some(s => s === `warm-close · close failed ${local(fireAt)}`)).toBe(true)
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
    expect(w.status.some(s => s !== undefined && s.startsWith('warm-close · close failed '))).toBe(true)
    expect(w.notifies).toHaveLength(1)
  })
})

const cmd = (command: string, args = '') => ({ command, args, origin: COMPOSER, presentation: { isFullscreen: false, columns: 80 } }) as never

describe('F1 a prompt typed while a turn runs keeps the conversation busy after that turn completes', () => {
  test('B (turnId set) queued during A: A completes, B waits an hour: no close; B completes: one close', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await $.prompt.submit(submit()) // A
    await clock.advance(MIN)
    await $.prompt.submit({ text: 'b', wait: false, origin: COMPOSER, turnId: 't1' } as never) // B, queued during A
    await clock.advance(MIN)
    await $.turn.complete(complete()) // A
    await clock.advance(60 * MIN)
    expect(w.runs).toEqual([])
    await $.turn.complete(complete()) // B
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

describe('F4 a manual /close moves the baseline', () => {
  test('manual /close conversation, then an hour idle: no automatic close, no notification', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(10 * MIN)
    await $.command.run(cmd('close', 'conversation'))
    expect(w.runs.map(r => r.command)).toEqual(['close'])
    await clock.advance(60 * MIN)
    expect(w.runs.map(r => r.command)).toEqual(['close'])
    expect(w.notifies).toEqual([])
    expect(lastStatus(w)).toBeUndefined()
  })
  test('any arguments count (a bare /close too)', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await $.command.run(cmd('close'))
    await clock.advance(60 * MIN)
    expect(w.runs).toHaveLength(1)
  })
  test('positive control: another command does not move it, so the automatic close still fires', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(10 * MIN)
    await $.command.run(cmd('compact'))
    await clock.advance(60 * MIN)
    expect(w.runs.map(r => r.command)).toEqual(['compact', 'close'])
  })
  test("the observer returns the chain's result unchanged", async ($, on) => {
    const { w } = world(on, { noRun: true })
    on('command.run', () => ({ text: 'from-bottom' }))
    expect(await $.command.run(cmd('close', 'conversation'))).toEqual({ text: 'from-bottom' })
    expect(w.runs).toEqual([])
  })
})

describe('F5 a prompt still entering when the deadline passes blocks the close', () => {
  test('a slow next(e): the timer fires while the prompt is entering and closes nothing', async ($, on) => {
    let release: () => void = () => {}
    const gate = new Promise<void>(res => {
      release = res
    })
    let slow = false
    const { w, clock } = world(on, {
      bottom: {
        'prompt.submit': async (_$: never, e: never) => {
          if (slow) await gate
          return { text: (e as { text: string }).text }
        },
      },
    })
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(51 * MIN)
    slow = true
    const entering = $.prompt.submit(submit())
    await clock.advance(2 * MIN)
    expect(w.runs).toEqual([])
    expect(w.notifies).toEqual([])
    release()
    await entering
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
    await $.turn.complete(complete())
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

// Above the mod: throws BEFORE calling next(e); its own `.catch` replays the chain, which runs the mod and the bottom.
const THROW_BEFORE = {
  name: 'wc-throw-before',
  tier: 'prepend' as const,
  register(on: On) {
    on('turn.complete', async () => {
      throw new Error('before next')
    }).catch(($, e, next) => next(e))
  },
}

describe('F7 a hook that throws before next(e) is replayed by its .catch with the chain result', () => {
  test('the bottom answer comes back and the mod below still sees every turn', { plugins: [THROW_BEFORE] }, async ($, on) => {
    const { w, clock } = world(on, { bottom: { 'turn.complete': () => ({ text: 'from-bottom' }) } })
    await $.session.start(START as never)
    for (let i = 0; i < 3; i++) {
      await $.prompt.submit(submit())
      await clock.advance(MIN)
      expect(await $.turn.complete(complete())).toEqual({ text: 'from-bottom' })
    }
    expect(lastStatus(w)).toBe(`warm-close · armed ${local(clock.now() + 52 * MIN)}`)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

describe('the session boundary', () => {
  test('session.end cancels the timer and clears the line', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await $.session.end(END)
    expect(lastStatus(w)).toBeUndefined()
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
  })
  test('a new session.start forgets the previous conversation', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await $.session.start(START as never)
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
    await talk($, clock, 2)
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
  })
})

// ---------- W9

describe('W9 every observer returns the chain result unchanged', () => {
  test('prompt.submit, turn.complete, session.start and session.end', async ($, on) => {
    const { clock } = world(on, {
      bottom: {
        'session.start': () => ({ cwd: 'from-bottom' }),
        'session.end': () => ({ sessionId: 'from-bottom' }),
        'prompt.submit': () => ({ text: 'from-bottom', context: ['c'] }),
        'turn.complete': () => ({ text: 'from-bottom' }),
      },
    })
    expect(await $.session.start(START as never)).toEqual({ cwd: 'from-bottom' })
    expect(await $.prompt.submit(submit())).toEqual({ text: 'from-bottom', context: ['c'] })
    await clock.advance(MIN)
    expect(await $.turn.complete(complete())).toEqual({ text: 'from-bottom' })
    expect(await $.session.end(END)).toEqual({ sessionId: 'from-bottom' })
  })
})

// Sits above the plugin under test and draws what the chain says that plugin did.
const TRACER = {
  name: 'wc-tracer',
  tier: 'prepend' as const,
  register(on: On) {
    // Inline plugin bodies are compiled standalone: the plugin's name is a literal here.
    const outcome = (trace: readonly { plugin: string; outcome: string }[]) => trace.find(t => t.plugin === 'warm-close')?.outcome ?? 'absent'
    on('session.start', async ($, e, next) => {
      const r = await next(e)
      $.ui.status(`trace:session.start ${outcome(next.trace)}`)
      return r
    })
    on('session.end', async ($, e, next) => {
      const r = await next(e)
      $.ui.status(`trace:session.end ${outcome(next.trace)}`)
      return r
    })
    on('prompt.submit', async ($, e, next) => {
      const r = await next(e)
      $.ui.status(`trace:prompt.submit ${outcome(next.trace)}`)
      return r
    })
    on('turn.complete', async ($, e, next) => {
      const r = await next(e)
      $.ui.status(`trace:turn.complete ${outcome(next.trace)}`)
      return r
    })
  },
}

describe('W9 a throw inside a hook (a denied $ op) is caught by its .catch and the chain result passes', () => {
  test('state.get denied: all four hooks are caught, none throws, results unchanged', { plugins: [TRACER] }, async ($, on) => {
    const { w, clock } = world(on, {
      deny: ['state.get'],
      bottom: {
        'session.start': () => ({ cwd: 'from-bottom' }),
        'session.end': () => ({ sessionId: 'from-bottom' }),
        'prompt.submit': () => ({ text: 'from-bottom' }),
        'turn.complete': () => ({ text: 'from-bottom' }),
      },
    })
    expect(await $.session.start(START as never)).toEqual({ cwd: 'from-bottom' })
    expect(await $.prompt.submit(submit())).toEqual({ text: 'from-bottom' })
    await clock.advance(MIN)
    expect(await $.turn.complete(complete())).toEqual({ text: 'from-bottom' })
    expect(await $.session.end(END)).toEqual({ sessionId: 'from-bottom' })
    expect(w.status.filter(s => s !== undefined)).toEqual([
      'trace:session.start caught',
      'trace:prompt.submit caught',
      'trace:turn.complete caught',
      'trace:session.end caught',
    ])
    await clock.advance(6 * H)
    expect(w.runs).toEqual([])
  })
  test('positive control: with state working the same four hooks return', { plugins: [TRACER] }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await $.prompt.submit(submit())
    await clock.advance(MIN)
    await $.turn.complete(complete())
    await $.session.end(END)
    const traces = w.status.filter(s => s !== undefined && s.startsWith('trace:'))
    expect(traces).toEqual(['trace:session.start returned', 'trace:prompt.submit returned', 'trace:turn.complete returned', 'trace:session.end returned'])
  })
})

// ---------- options, if the kit hands them to register

describe('W6 and W10 through the kit options (this CLI hands `options` to register; CLI 2.1.282 did not)', () => {
  test('mode notify: the notification only, no command.run', { options: { mode: 'notify' } }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    expect(w.notifies).toHaveLength(1)
    expect(w.notifies[0].title).toBe('warm-close')
  })
  test('a garbage mode reads as off: no call, no notification; the status is cleared once at session.start (F6) and never drawn', { options: { mode: 'banana' } }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 5)
    await clock.advance(12 * H)
    expect(w.runs).toEqual([])
    expect(w.notifies).toEqual([])
    expect(w.status).toEqual([undefined])
  })
  test('F6 mode off: session.start clears a line pinned by an earlier submit run, once, and nothing else is touched', { options: { mode: 'off' } }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    expect(w.status).toEqual([undefined])
    await talk($, clock, 5)
    await $.session.end(END)
    await clock.advance(12 * H)
    expect(w.status).toEqual([undefined])
    expect(w.runs).toEqual([])
    expect(w.notifies).toEqual([])
    expect(w.state).toBeUndefined()
  })
  test('ttl 5: the close fires 1 minute after the last turn', { options: { ttlMinutes: 5 } }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(MIN - 1)
    expect(w.runs).toEqual([])
    await clock.advance(1)
    expect(w.runs).toHaveLength(1)
  })
})

// ---------- M10: the child hold (lane L3c). The kit's `$.tool.call` drops `agentId`, so the subagent
// loop and the by-identity returns are in register.test.ts; here the mod runs under the kit's engine with its manifest
// defaults (hold 120 minutes) or `options`.

const HELD = 'warm-close · held, child session running'
// F1: a start_session starts a child only with initiation `user_asked` (or a proposal_id); `offer` / `own_initiative` show a card
const START_CALL = { tool: 'mcp__ccd_session__start_session', title: 'build', prompt: 'go', initiation: 'user_asked' } as never
const CARD_CALL = { tool: 'mcp__ccd_session__start_session', title: 'build', prompt: 'go', initiation: 'own_initiative' } as never
const CLOUD_CALL = { tool: 'mcp__ccd_session__start_session', title: 'build', prompt: 'go', initiation: 'user_asked', target: 'cloud' } as never
const SEND_CALL = (to?: unknown) => ({ tool: 'SendMessage', ...(to === undefined ? {} : { to }), message: 'status?' }) as never
const REPORT = { kind: 'sdk' }

/** F5: the tool.call observer starts its bookkeeping without awaiting it; let the microtask queue drain before a state read. */
const settle = async () => {
  for (let i = 0; i < 300; i++) await Promise.resolve()
}

/** A person turn in which `call` runs: prompt, a minute, the tool.call, a minute, turn.complete. */
async function turnWith($: Eng, clock: Clock, call: unknown) {
  await $.prompt.submit(submit())
  await clock.advance(MIN)
  await $.tool.call(call as never)
  await clock.advance(MIN)
  await $.turn.complete(complete())
}

describe('H1 a started child holds the idle close; its report ends the hold and the next idle period fires', () => {
  test('start_session, then idle to the fire: no run, no notification, no counters moved, the held line', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    const before = JSON.stringify(w.state)
    const version = w.version
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    expect(w.notifies).toEqual([])
    expect(w.version).toBe(version)
    expect(JSON.stringify(w.state)).toBe(before)
    expect(lastStatus(w)).toBe(HELD)
    await clock.advance(24 * H)
    expect(w.runs).toEqual([])
  })
  test('false-silence guard: the child reports (sdk prompt), the wake completes, the next idle period closes once', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    await talk($, clock, 1, REPORT)
    const wake = clock.now()
    expect(lastStatus(w)).toBe(`warm-close · armed ${local(wake + 52 * MIN)}`)
    await clock.advance(52 * MIN - 1)
    expect(w.runs).toEqual([])
    await clock.advance(1)
    expect(w.runs).toHaveLength(1)
    expect(w.runs[0].command).toBe('close')
    expect(w.notifies).toHaveLength(1)
  })
  test('positive control: with no child call the same conversation closes at the same instant', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

describe('H2 SendMessage holds only when it goes to a desktop session id (local_…)', () => {
  test('to: local_abc holds', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, SEND_CALL('local_abc'))
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    expect(lastStatus(w)).toBe(HELD)
  })
  const cases: [string, unknown][] = [
    ['a subagent name', 'researcher'],
    ['a subagent id', 'a1234567890abcdef'],
    ['a missing to', undefined],
    ['a non-string to', 5],
  ]
  for (const [label, to] of cases) {
    test(`${label} does not hold: the close fires`, async ($, on) => {
      const { w, clock } = world(on)
      await $.session.start(START as never)
      await talk($, clock, 2)
      await turnWith($, clock, SEND_CALL(to))
      await clock.advance(52 * MIN)
      expect(w.runs).toHaveLength(1)
    })
  }
})

describe('H1/F1 a start_session that only shows a card, or starts a cloud session, holds nothing', () => {
  for (const [label, call] of [['own_initiative with no proposal_id', CARD_CALL], ['target cloud', CLOUD_CALL]] as const) {
    test(`${label}: the close fires at the normal instant`, async ($, on) => {
      const { w, clock } = world(on)
      await $.session.start(START as never)
      await talk($, clock, 2)
      await turnWith($, clock, call)
      await clock.advance(52 * MIN)
      expect(w.runs).toHaveLength(1)
    })
  }
})

describe('F6 the hold is anchored at the end of the turn that called the child', () => {
  test('a turn that keeps working 80 minutes after start_session still holds at its fire', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await $.prompt.submit(submit())
    await clock.advance(MIN)
    await $.tool.call(START_CALL)
    await clock.advance(80 * MIN)
    await $.turn.complete(complete())
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    expect(w.notifies).toEqual([])
    expect(lastStatus(w)).toBe(HELD)
  })
})

describe('H3/F2 only an sdk prompt clears the hold; a composer, peer or task-notification prompt does not', () => {
  test('F2: a composer prompt while the child runs does NOT clear it: the next idle fire is held', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await talk($, clock, 1)
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    expect(lastStatus(w)).toBe(HELD)
  })
  for (const kind of ['peer', 'peer-send-message', 'bridge', 'task-notification']) {
    test(`a ${kind} prompt and its turn leave the hold: the next idle fire is held`, async ($, on) => {
      const { w, clock } = world(on)
      await $.session.start(START as never)
      await talk($, clock, 2)
      await turnWith($, clock, START_CALL)
      await talk($, clock, 1, { kind })
      await clock.advance(52 * MIN)
      expect(w.runs).toEqual([])
      expect(lastStatus(w)).toBe(HELD)
    })
  }
})

describe('H4 expiry and the option', () => {
  test('childHoldMinutes 30: the hold lapses before the 52-minute fire, so it runs', { options: { childHoldMinutes: 30 } }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
  // 'x' and NaN never reach the mod through the kit (the engine rejects them against plugin.json's `type: number`:
  // "must be a number" / not JSON); they are covered at the register and lib levels, where the mod is handed them raw.
  for (const v of [0, -5]) {
    test(`childHoldMinutes ${String(v)}: no hold ever, nothing written for the call`, { options: { childHoldMinutes: v } }, async ($, on) => {
      const { w, clock } = world(on)
      await $.session.start(START as never)
      await talk($, clock, 2)
      await $.prompt.submit(submit())
      await clock.advance(MIN)
      const version = w.version
      await $.tool.call(START_CALL)
      await settle()
      expect(w.version).toBe(version)
      await $.turn.complete(complete())
      expect((w.state as { holdUntil?: number }).holdUntil).toBeUndefined()
      await clock.advance(52 * MIN)
      expect(w.runs).toHaveLength(1)
    })
  }
  test('the default is 120 minutes: the stored hold is now + 120 minutes', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await $.prompt.submit(submit())
    await clock.advance(MIN)
    await $.tool.call(START_CALL)
    await settle() // F5: the observer starts its bookkeeping without awaiting it
    expect((w.state as { holdUntil?: number }).holdUntil).toBe(clock.now() + 120 * MIN)
  })
})

describe('H5 a denied or failed call holds nothing', () => {
  test('a deny from the chain', async ($, on) => {
    const { w, clock } = world(on, { bottom: { 'tool.call': () => ({ deny: 'blocked' }) } })
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
  test('an isError result', async ($, on) => {
    const { w, clock } = world(on, { bottom: { 'tool.call': () => ({ ref: 1, result: {}, text: 'boom', isError: true }) } })
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, SEND_CALL('local_abc'))
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

describe('H7 the hold applies in notify mode too', () => {
  test('notify mode with a hold: no notification at the fire, the held line', { options: { mode: 'notify' } }, async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await clock.advance(52 * MIN)
    expect(w.notifies).toEqual([])
    expect(lastStatus(w)).toBe(HELD)
  })
})

describe('H8 the session boundary clears the hold', () => {
  test('a new session.start forgets the hold: the next conversation closes normally', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await $.session.start(START as never)
    expect((w.state as { holdUntil?: number }).holdUntil).toBeUndefined()
    await talk($, clock, 3)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
  test('session.end clears it too', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start(START as never)
    await turnWith($, clock, START_CALL)
    expect((w.state as { holdUntil?: number }).holdUntil).toBeDefined()
    await $.session.end(END)
    expect((w.state as { holdUntil?: number }).holdUntil).toBeUndefined()
  })
  test('an older stored model without holdUntil (a hot reload from 0.1.0) reads as no hold and fires', async ($, on) => {
    const { w, clock } = world(on)
    w.state = { personTurns: 3, personTurnsAtLastClose: 0, inFlight: 0, closes: 0, lastTurnAt: clock.now() }
    w.version = 1
    await $.prompt.submit(submit())
    await clock.advance(MIN)
    await $.turn.complete(complete())
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})

describe('mode off: the observer does nothing, no state write', () => {
  test('a start_session in mode off leaves the state untouched', { options: { mode: 'off' } }, async ($, on) => {
    const { w } = world(on)
    await $.session.start(START as never)
    await $.tool.call(START_CALL)
    await $.tool.call(SEND_CALL('local_abc'))
    await settle()
    expect(w.state).toBeUndefined()
    expect(w.version).toBe(0)
  })
})

describe('H9 the desktop start (surface null, isInteractive false) still arms, holds and fires', () => {
  test('hold, report, idle: the full cycle on the desktop start', async ($, on) => {
    const { w, clock } = world(on)
    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false } as never)
    await talk($, clock, 2)
    await turnWith($, clock, START_CALL)
    await clock.advance(52 * MIN)
    expect(w.runs).toEqual([])
    await talk($, clock, 1, REPORT)
    await clock.advance(52 * MIN)
    expect(w.runs).toHaveLength(1)
  })
})
