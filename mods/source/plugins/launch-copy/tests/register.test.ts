// Register-level tests: the REAL hooks/register.tsx driven through a fake `on` and a fake `$`. The kit's `$.tool.call`
// drops `agentId` (see engine.test.tsx; the kit does take `{ options }`, F7), so these own: the registration list, every
// `$` call the mod makes (the allowlist, enforced by a Proxy), the modes with odd values, the subagent loop, and
// L6 — the hooks return `next(e)`'s result BY IDENTITY, for a matching and a non-matching path, when bookkeeping
// throws, and when `$.fs.read` throws.
// The dispatcher emulates the engine: matcher (`{ tool: [...] }` any-of), `next` = the bottom of the chain (replay-safe,
// as the d.ts says), and a throw goes to the registration's `.catch`.
import { describe, expect, test } from 'claude-code/testing'

import { register } from '../hooks/register'

const LAUNCH = '/x/LAUNCH.md'
const PICKUP = 'Read ~/work/20260101-0900_example/CONTRACT.md and execute lane L3.'
const file = (pickup: string) => ['# Launch: x', '', '## 1. Pickup', '', '```text', pickup, '```', '', '## 2. Goal', 'g'].join('\n')
const T0 = new Date(2026, 9, 19, 14, 7, 0).getTime()

type Reg = { name: string; matcher?: unknown; h: any; c?: any }
type Host = {
  files: Record<string, string>
  readThrows: boolean
  copyMode: 'ok' | 'fail' | 'hang'
  /** how the host's pbcopy behaves when `$.ui.copy` says no-surface */
  localMode: 'ok' | 'exit1' | 'exit127' | 'throw'
  /** every `$.process.run`: its argv, stdin and timeout */
  runs: [readonly string[], string | undefined, number | undefined][]
  reads: string[]
  copies: string[]
  notifies: [string, string | undefined][]
  statuses: (string | undefined)[]
  timers: { ms: number; live: boolean; fn: () => void }[]
  /** every `$` member reached, as 'fs.read' …; anything off the allowlist is recorded as 'forbidden:<key>' */
  used: Set<string>
}
// 0.2.2: pbcopy runs under LC_ALL=en_US.UTF-8 (LC_ALL beats any inherited LC_CTYPE/LANG). The desktop engine's process has no LANG/LC_*, and pbcopy without a
// locale reads stdin as MacRoman, so "—" pastes as "‚Äî" while the mod says "copied" (measured live).
const PBCOPY_ARGV = ['/usr/bin/env', 'LC_ALL=en_US.UTF-8', 'pbcopy']
const ALLOWED = new Set(['fs.read', 'ui.copy', 'process.run', 'ui.notify', 'ui.status', 'clock.now', 'clock.after'])

const tick = (ms = 0) => new Promise<void>(r => setTimeout(r, ms))
/** Lets the detached work run out. */
async function flush() {
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 50; j++) await Promise.resolve()
    await tick(1)
  }
}

function mount(options?: unknown, files: Record<string, string> = { [LAUNCH]: file(PICKUP) }) {
  const host: Host = { files, readThrows: false, copyMode: 'ok', localMode: 'ok', runs: [], reads: [], copies: [], notifies: [], statuses: [], timers: [], used: new Set() }
  const regs: Reg[] = []
  const on = (name: string, a: any, b?: any) => {
    const r: Reg = typeof b === 'function' ? { name, matcher: a, h: b } : { name, h: a }
    regs.push(r)
    return { catch(c: any) { r.c = c; return this } }
  }
  const real = {
    fs: {
      read: async (path: string) => {
        host.reads.push(path)
        if (host.readThrows) throw new Error('EACCES')
        const f = host.files[path]
        if (f === undefined) throw new Error('ENOENT')
        return f
      },
    },
    ui: {
      copy: async (a: { text: string }) => {
        host.copies.push(a.text)
        if (host.copyMode === 'hang') return new Promise(() => {})
        return host.copyMode === 'ok' ? { isCopied: true } : { isCopied: false, reason: 'no-surface' }
      },
      notify: async (text: string, o?: { title?: string }) => {
        host.notifies.push([text, o?.title])
        return { isSent: false, reason: 'disabled' }
      },
      status: (t: string | undefined) => { host.statuses.push(t) },
    },
    process: {
      run: async (argv: readonly string[], init?: { stdin?: string; timeoutMs?: number }) => {
        host.runs.push([argv, init?.stdin, init?.timeoutMs])
        if (host.localMode === 'throw') throw new Error('ENOENT')
        return { exitCode: host.localMode === 'ok' ? 0 : host.localMode === 'exit127' ? 127 : 1, stdout: '', stderr: '' }
      },
    },
    clock: {
      now: async () => T0,
      after: (ms: number, fn: () => void) => {
        const t = { ms, live: true, fn }
        host.timers.push(t)
        return { cancel: () => { t.live = false } }
      },
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
  /** Raises `name` with `e`; `bottom` is what core answers. Resolves to what the chain resolved to. */
  const dispatch = async (name: string, e: any, bottom: () => unknown) => {
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
  return { host, regs, dispatch }
}

const OK = () => ({ ref: 1, result: {}, text: 'ok' })
const write = (path: string, extra: Record<string, unknown> = {}) => ({ tool: 'Write', tool_use_id: 'u1', file_path: path, content: 'x', ...extra })
const edit = (path: string, extra: Record<string, unknown> = {}) => ({ tool: 'Edit', tool_use_id: 'u2', file_path: path, old_string: 'a', new_string: 'b', ...extra })
const TURN = () => ({ answer: 'done', reason: 'answer' })
const quiet = (h: Host) => [h.reads, h.copies, h.notifies, h.statuses, h.timers].every(a => a.length === 0)

describe('registration', () => {
  test('exactly tool.call{Write|Edit} and turn.complete, each with a .catch', () => {
    const { regs } = mount()
    expect(regs.map(r => r.name)).toEqual(['tool.call', 'turn.complete'])
    expect(regs[0].matcher).toEqual({ tool: ['Write', 'Edit'] })
    expect(regs.every(r => typeof r.c === 'function')).toBe(true)
  })
  test('the .catch of each hook passes the chain through: it returns what next resolves to', async () => {
    const { regs } = mount()
    const marker = {}
    for (const r of regs) expect(await r.c({}, {}, async () => marker)).toBe(marker)
  })
  test('registration is the same for every mode (modes are decided inside the hooks)', () => {
    for (const m of ['copy', 'notify', 'off', 'garbage']) expect(mount({ mode: m }).regs.map(r => r.name)).toEqual(['tool.call', 'turn.complete'])
  })
})

describe('the allowlist: only fs.read, ui.copy, process.run (pbcopy), ui.notify, ui.status, clock.now, clock.after are ever reached on $', () => {
  test('a full copy run, a failed copy and a no-pickup run reach nothing else', async () => {
    const { host, dispatch } = mount(undefined, { [LAUNCH]: file(PICKUP), '/y/LAUNCH.md': '# none' })
    await dispatch('tool.call', write(LAUNCH), OK)
    await dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    host.copyMode = 'fail'
    host.files[LAUNCH] = file('another line')
    await dispatch('tool.call', edit(LAUNCH), OK)
    await dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    await dispatch('tool.call', write('/y/LAUNCH.md'), OK)
    await dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    expect(host.copies).toEqual([PICKUP, 'another line'])
    // process.run is reached only for the no-surface copy, with the fixed argv and the pickup on stdin
    expect(host.runs).toEqual([[PBCOPY_ARGV, 'another line', 5000]])
    expect([...host.used].filter(k => k.startsWith('forbidden:'))).toEqual([])
    expect([...host.used].sort()).toEqual([...ALLOWED].sort())
  })
})

describe('L11 the real register: no-surface falls back to pbcopy', () => {
  const run = async (localMode: Host['localMode']) => {
    const m = mount()
    m.host.copyMode = 'fail'
    m.host.localMode = localMode
    await m.dispatch('tool.call', write(LAUNCH), OK)
    await m.dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    return m.host
  }
  const failed = (reason: string) => `Launch brief ready, but the copy failed (${reason}). Pickup is in ${LAUNCH} under "## 1. Pickup".`
  test('pbcopy exits 0: copied', async () => {
    const host = await run('ok')
    expect(host.runs).toEqual([[PBCOPY_ARGV, PICKUP, 5000]])
    expect(host.notifies.map(n => n[0])).toEqual(['Launch brief ready: pickup copied. Open a new chat and paste.'])
  })
  test('the argv carries LC_ALL=en_US.UTF-8, and a non-ASCII pickup is passed to stdin verbatim (the encoding itself is a live measurement, see README)', async () => {
    const m = mount(undefined, { [LAUNCH]: file('A—B→C§D') })
    m.host.copyMode = 'fail'
    await m.dispatch('tool.call', write(LAUNCH), OK)
    await m.dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    expect(m.host.runs).toEqual([[PBCOPY_ARGV, 'A—B→C§D', 5000]])
  })
  test('exit 127 (env found no pbcopy, as off macOS): could not start, the original no-surface stands', async () => {
    const host = await run('exit127')
    expect(host.notifies.map(n => n[0])).toEqual([failed('no-surface')])
  })
  test('pbcopy exits non-zero: the failure says the local copy failed too', async () => {
    const host = await run('exit1')
    expect(host.notifies.map(n => n[0])).toEqual([failed('no-surface, local copy failed')])
  })
  test('pbcopy cannot start: the original no-surface stands', async () => {
    const host = await run('throw')
    expect(host.notifies.map(n => n[0])).toEqual([failed('no-surface')])
  })
  test('a copy that worked runs nothing', async () => {
    const m = mount()
    await m.dispatch('tool.call', write(LAUNCH), OK)
    await m.dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    expect(m.host.runs).toEqual([])
  })
})

describe('X3 the real register: a lane with nothing to paste never even reads $.ui.copy', () => {
  const stamped = (lane: string) => `${file(PICKUP)}\n\n## 12. Stamp\nwritten: 2026-01-15T09:00Z (previous chat, closing) · lane ${lane} · re-probe any dated claim before acting.`
  const run = async (lane: string, options?: unknown) => {
    const m = mount(options, { [LAUNCH]: stamped(lane) })
    await m.dispatch('tool.call', write(LAUNCH), OK)
    await m.dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    return m.host
  }
  test('L3c and L1 in copy mode: zero copies, the property itself is never read, one notice, the lane status', async () => {
    for (const lane of ['L3c', 'L1']) {
      const host = await run(lane)
      expect([lane, host.copies]).toEqual([lane, []])
      expect([lane, host.used.has('ui.copy')]).toEqual([lane, false])
      expect([lane, [...host.used].filter(k => k.startsWith('forbidden:'))]).toEqual([lane, []])
      expect([lane, host.notifies]).toEqual([lane, [[`Launch brief ready (lane ${lane}: this chat starts it, nothing to paste): ${LAUNCH}`, 'launch-copy']]])
      expect(host.statuses[0]).toMatch(new RegExp(`^launch-copy · lane ${lane}, nothing to paste \\d\\d:\\d\\d$`))
    }
  })
  test('L3c in notify mode: the lane notice, no copy, ui.copy never read', async () => {
    const host = await run('L3c', { mode: 'notify' })
    expect(host.copies).toEqual([])
    expect(host.used.has('ui.copy')).toBe(false)
    expect(host.notifies.map(n => n[0])).toEqual([`Launch brief ready (lane L3c: this chat starts it, nothing to paste): ${LAUNCH}`])
  })
  test('L2 and L3 do read ui.copy (the contrast that gives the test above its meaning)', async () => {
    for (const lane of ['L2', 'L3']) {
      const host = await run(lane)
      expect([lane, host.copies]).toEqual([lane, [PICKUP]])
      expect([lane, host.used.has('ui.copy')]).toEqual([lane, true])
    }
  })
  test('off and garbage with a lane: nothing at all', async () => {
    for (const m of ['off', 'garbage']) {
      const host = await run('L3c', { mode: m })
      expect(quiet(host)).toBe(true)
      expect([...host.used]).toEqual([])
    }
  })
})

describe('L6 the hooks return next(e)\'s result by identity', () => {
  test('tool.call: a matching path, a non-matching path, an Edit', async () => {
    for (const e of [write(LAUNCH), write('/x/other.md'), edit(LAUNCH), write('/x/LAUNCH.md.bak')]) {
      const { dispatch } = mount()
      const answer = OK()
      expect(await dispatch('tool.call', e, () => answer)).toBe(answer)
    }
  })
  test('tool.call: a deny and an isError answer come back as the very same object, untouched', async () => {
    const { dispatch } = mount()
    const deny = { deny: 'refused' }
    const err = { ref: 1, result: {}, text: 'boom', isError: true }
    expect(await dispatch('tool.call', write(LAUNCH), () => deny)).toBe(deny)
    expect(await dispatch('tool.call', write(LAUNCH), () => err)).toBe(err)
    expect(deny).toEqual({ deny: 'refused' })
    expect(err).toEqual({ ref: 1, result: {}, text: 'boom', isError: true })
  })
  test('tool.call: the answer is not modified (frozen answers are fine) and no context is added', async () => {
    const { dispatch } = mount()
    const answer = Object.freeze({ ref: 1, result: Object.freeze({}), text: 'ok' })
    expect(await dispatch('tool.call', write(LAUNCH), () => answer)).toBe(answer)
  })
  test('tool.call: bookkeeping that throws (a hostile input, a hostile answer) still returns the answer', async () => {
    const hostileInput = { tool: 'Write', get file_path(): string { throw new Error('getter boom') } }
    // `then` is left readable: awaiting a thenable-check that throws would reject in the test's dispatcher, not in the mod
    const hostileAnswer = new Proxy({}, { has: () => { throw new Error('has boom') }, get: (_t, k) => { if (k === 'then') return undefined; throw new Error('get boom') } })
    const { dispatch } = mount()
    const answer = OK()
    expect(await dispatch('tool.call', hostileInput, () => answer)).toBe(answer)
    expect(await dispatch('tool.call', write(LAUNCH), () => hostileAnswer)).toBe(hostileAnswer)
  })
  test('turn.complete: the result is next\'s, by identity, with work to do, with nothing to do, in a subagent, and when fs.read throws', async () => {
    const { host, dispatch } = mount()
    const a = { text: 'a' }
    expect(await dispatch('turn.complete', TURN(), () => a)).toBe(a) // nothing touched
    await dispatch('tool.call', write(LAUNCH), OK)
    const b = { text: 'b' }
    expect(await dispatch('turn.complete', TURN(), () => b)).toBe(b) // work to do
    await flush()
    const c = { text: 'c' }
    expect(await dispatch('turn.complete', { ...TURN(), agentId: 'agent-1' }, () => c)).toBe(c) // subagent
    host.readThrows = true
    host.files[LAUNCH] = file('changed')
    await dispatch('tool.call', edit(LAUNCH), OK)
    const d = { text: 'd' }
    expect(await dispatch('turn.complete', TURN(), () => d)).toBe(d) // fs.read throws
    await flush()
    expect(host.reads.length).toBe(2)
  })
  test('turn.complete does not wait for the work: a copy that never answers cannot stick it', async () => {
    const { host, dispatch } = mount()
    host.copyMode = 'hang'
    await dispatch('tool.call', write(LAUNCH), OK)
    const a = { text: 'a' }
    const got = await Promise.race([dispatch('turn.complete', TURN(), () => a), tick(500).then(() => 'HUNG')])
    expect(got).toBe(a)
    await flush()
    expect(host.copies).toEqual([PICKUP])
  })
})

describe('L5 a subagent loop does nothing', () => {
  test('a Write with agentId raises nothing at the end of the main turn', async () => {
    const { host, dispatch } = mount()
    await dispatch('tool.call', write(LAUNCH, { agentId: 'agent-9' }), OK)
    await dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    expect(quiet(host)).toBe(true)
  })
  test('a subagent\'s turn.complete neither consumes nor triggers the main loop\'s work', async () => {
    const { host, dispatch } = mount()
    await dispatch('tool.call', write(LAUNCH), OK)
    await dispatch('turn.complete', { ...TURN(), agentId: 'agent-9' }, () => ({ text: '' }))
    await flush()
    expect(quiet(host)).toBe(true)
    await dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    expect(host.copies).toEqual([PICKUP])
  })
  test('a denied and an isError Write raise nothing', async () => {
    for (const answer of [{ deny: 'no' }, { ref: 1, result: {}, text: 'x', isError: true }]) {
      const { host, dispatch } = mount()
      await dispatch('tool.call', write(LAUNCH), () => answer)
      await dispatch('turn.complete', TURN(), () => ({ text: '' }))
      await flush()
      expect(quiet(host)).toBe(true)
    }
  })
})

describe('L9 modes through the real register', () => {
  test('unset options: the manifest default, copy', async () => {
    for (const o of [undefined, {}, { mode: undefined }]) {
      const { host, dispatch } = mount(o)
      await dispatch('tool.call', write(LAUNCH), OK)
      await dispatch('turn.complete', TURN(), () => ({ text: '' }))
      await flush()
      expect(host.copies).toEqual([PICKUP])
    }
  })
  test('notify: no copy, the notification names the path, and (F3) a brief-ready status line', async () => {
    const { host, dispatch } = mount({ mode: 'notify' })
    await dispatch('tool.call', write(LAUNCH), OK)
    await dispatch('turn.complete', TURN(), () => ({ text: '' }))
    await flush()
    expect(host.copies).toEqual([])
    expect(host.notifies).toEqual([[`Launch brief ready: ${LAUNCH}. Copy its Pickup block into a new chat.`, 'launch-copy']])
    expect(host.statuses).toEqual([`launch-copy · brief ready ${String(new Date(T0).getHours()).padStart(2, '0')}:${String(new Date(T0).getMinutes()).padStart(2, '0')}`])
  })
  test('off and garbage: no read, no copy, no notify, no status, no timer; the answers still come back', async () => {
    for (const m of ['off', 'garbage', 'Copy', '', 7, null]) {
      const { host, dispatch } = mount({ mode: m })
      const a = OK()
      const b = { text: 'b' }
      expect(await dispatch('tool.call', write(LAUNCH), () => a)).toBe(a)
      expect(await dispatch('turn.complete', TURN(), () => b)).toBe(b)
      await flush()
      expect(quiet(host)).toBe(true)
      expect([...host.used]).toEqual([])
    }
  })
})
