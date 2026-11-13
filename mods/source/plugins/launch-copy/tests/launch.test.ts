// Pure logic and the controller (hooks/lib/launch.ts) with fake ports, no `$`.
// L4 which paths count, L5 which tool results count, L7 copy failures, L8 once per changed pickup, L9 modes,
// plus the no-pickup / unreadable branches, a notify that rejects or never answers, and the status line's one timer.
import { describe, expect, test } from 'claude-code/testing'

import { CLEAR_MS, LOCAL_FAILED_REASON, LaunchCopy, MSG, TITLE, copyThrough, isLaunchFile, readOptions, touchedPath, type Ports } from '../hooks/lib/launch'

const LAUNCH = '/x/LAUNCH.md'
const PICKUP = 'Read ~/work/20260101-0900_example/CONTRACT.md and execute lane L3.'
const file = (pickup: string) => ['# Launch: x', '', '## 1. Pickup', '', '```text', pickup, '```', '', '## 2. Goal', 'g'].join('\n')
const T0 = new Date(2026, 9, 19, 14, 7, 0).getTime()
const pad = (n: number) => String(n).padStart(2, '0')
/** Independent oracle for the local HH:MM the status line shows. */
const local = (ms: number) => `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`
const OK = { ref: 1, result: {}, text: 'ok' }
const write = (path: string, extra: Record<string, unknown> = {}) => ({ tool: 'Write', tool_use_id: 'u1', file_path: path, content: 'x', ...extra })
const edit = (path: string, extra: Record<string, unknown> = {}) => ({ tool: 'Edit', tool_use_id: 'u2', file_path: path, old_string: 'a', new_string: 'b', ...extra })

type CopyMode = 'ok' | 'no-surface' | 'no-reason' | 'throw' | 'throw-nonerror' | 'hang' | 'garbage'
type NotifyMode = 'ok' | 'reject' | 'throw' | 'hang'
type Rig = {
  ports: Ports
  files: Record<string, string | Error>
  reads: string[]
  copies: string[]
  notifies: [string, string][]
  statuses: (string | undefined)[]
  timers: { ms: number; live: boolean; fn: () => void }[]
  copyMode: CopyMode
  notifyMode: NotifyMode
  nowFails: boolean
  now: number
  fire: () => void
}
function rig(files: Record<string, string | Error> = { [LAUNCH]: file(PICKUP) }): Rig {
  const r: Rig = {
    files, reads: [], copies: [], notifies: [], statuses: [], timers: [], copyMode: 'ok', notifyMode: 'ok', nowFails: false, now: T0,
    fire: () => {
      for (const t of r.timers) if (t.live) { t.live = false; t.fn() }
    },
    ports: {
      read: async path => {
        r.reads.push(path)
        const f = r.files[path]
        if (f === undefined) throw new Error(`ENOENT ${path}`)
        if (f instanceof Error) throw f
        return f
      },
      copy: async text => {
        r.copies.push(text)
        switch (r.copyMode) {
          case 'ok': return { isCopied: true }
          case 'no-surface': return { isCopied: false, reason: 'no-surface' }
          case 'no-reason': return { isCopied: false }
          case 'garbage': return undefined
          case 'throw': throw new Error('clipboard exploded\nsecond line')
          case 'throw-nonerror': throw 'plain string'
          case 'hang': return new Promise(() => {})
        }
      },
      notify: (text, title) => {
        r.notifies.push([text, title])
        if (r.notifyMode === 'throw') throw new Error('sync boom')
        if (r.notifyMode === 'reject') return Promise.reject(new Error('async boom'))
        if (r.notifyMode === 'hang') return new Promise(() => {})
        return Promise.resolve({ isSent: false, reason: 'disabled' })
      },
      status: text => {
        r.statuses.push(text)
      },
      now: async () => {
        if (r.nowFails) throw new Error('no clock')
        return r.now
      },
      after: (ms, fn) => {
        const t = { ms, live: true, fn }
        r.timers.push(t)
        return { cancel: () => { t.live = false } }
      },
    },
  }
  return r
}
const live = (r: Rig) => r.timers.filter(t => t.live)

describe('L4 which paths count: the exact basename LAUNCH.md', () => {
  test('accepts', () => {
    for (const p of ['/x/LAUNCH.md', '/home/user/work/a_b/LAUNCH.md', '/LAUNCH.md', 'LAUNCH.md', './LAUNCH.md', '/x y/LAUNCH.md']) {
      expect(isLaunchFile(p)).toBe(true)
    }
  })
  test('false-accepts: look-alikes are not it', () => {
    for (const p of ['/x/LAUNCH.md.bak', '/x/MY-LAUNCH.md', '/x/launch.md', '/x/LAUNCH.mdx', '/x/Launch.md', '/x/LAUNCH.md/', '/x/LAUNCH.md/notes.md', '/x/LAUNCH', '/x/ LAUNCH.md', '/x/LAUNCH.md ', '', '/', '/x/LAUNCH.MD', '/x/_LAUNCH.md', '/x/LAUNCH.md~']) {
      expect(isLaunchFile(p)).toBe(false)
    }
    for (const p of [undefined, null, 42, {}, ['/x/LAUNCH.md']]) expect(isLaunchFile(p)).toBe(false)
  })
  test('touchedPath reads file_path of Write and Edit only', () => {
    expect(touchedPath(write(LAUNCH), OK)).toBe(LAUNCH)
    expect(touchedPath(edit(LAUNCH), OK)).toBe(LAUNCH)
    expect(touchedPath(write('/x/LAUNCH.md.bak'), OK)).toBeUndefined()
    expect(touchedPath(write('/x/MY-LAUNCH.md'), OK)).toBeUndefined()
    expect(touchedPath(write('/x/launch.md'), OK)).toBeUndefined()
    expect(touchedPath(write('/x/LAUNCH.mdx'), OK)).toBeUndefined()
    expect(touchedPath({ tool: 'Read', file_path: LAUNCH }, OK)).toBeUndefined()
    expect(touchedPath({ tool: 'Bash', command: `cat > ${LAUNCH}` }, OK)).toBeUndefined()
    expect(touchedPath({ tool: 'NotebookEdit', notebook_path: LAUNCH }, OK)).toBeUndefined()
    expect(touchedPath({ tool: 'Write', path: LAUNCH }, OK)).toBeUndefined()
    expect(touchedPath({ tool: 'Write', file_path: 7 }, OK)).toBeUndefined()
    expect(touchedPath(undefined, OK)).toBeUndefined()
    expect(touchedPath(null, OK)).toBeUndefined()
  })
})

describe('L5 which tool results count', () => {
  test('a deny result is nothing', () => {
    expect(touchedPath(write(LAUNCH), { deny: 'no' })).toBeUndefined()
    expect(touchedPath(write(LAUNCH), { deny: '' })).toBeUndefined()
  })
  test('an isError result is nothing', () => {
    expect(touchedPath(write(LAUNCH), { ref: 1, result: {}, text: 'boom', isError: true })).toBeUndefined()
  })
  test('a subagent-loop call (agentId present) is nothing; an absent agentId is the main loop', () => {
    expect(touchedPath(write(LAUNCH, { agentId: 'agent-7' }), OK)).toBeUndefined()
    expect(touchedPath(write(LAUNCH, { agentId: '' }), OK)).toBeUndefined()
    expect(touchedPath(write(LAUNCH, { agentId: undefined }), OK)).toBe(LAUNCH)
  })
  test('isError false and read-only flags do not block', () => {
    expect(touchedPath(write(LAUNCH), { ...OK, isError: false })).toBe(LAUNCH)
    expect(touchedPath(write(LAUNCH), { ...OK, isReadOnly: true })).toBe(LAUNCH)
  })
})

describe('L9 options: any value but copy / notify / off is off', () => {
  test('unset reads the manifest default (copy)', () => {
    expect(readOptions(undefined).mode).toBe('copy')
    expect(readOptions({}).mode).toBe('copy')
    expect(readOptions(null).mode).toBe('copy')
    expect(readOptions({ mode: undefined }).mode).toBe('copy')
  })
  test('the three words', () => {
    expect(readOptions({ mode: 'copy' }).mode).toBe('copy')
    expect(readOptions({ mode: 'notify' }).mode).toBe('notify')
    expect(readOptions({ mode: 'off' }).mode).toBe('off')
  })
  test('anything else is off (a typo must never become the default)', () => {
    for (const v of ['garbage', 'Copy', 'COPY', ' copy', 'copy ', 'on', 'true', '', 'submit', 1, true, false, null, {}, []]) {
      expect(readOptions({ mode: v }).mode).toBe('off')
    }
  })
})

describe('L3 a write then the end of the turn: one copy, one notify, one status', () => {
  test('copy ok', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.reads).toEqual([LAUNCH])
    expect(r.copies).toEqual([PICKUP])
    expect(r.notifies).toEqual([['Launch brief ready: pickup copied. Open a new chat and paste.', 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · pickup copied ${local(T0)}`])
    expect(TITLE).toBe('launch-copy')
  })
  test('nothing happens before the turn ends, and a turn with no launch write does nothing', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    await lc.onTurn(r.ports)
    expect(r.reads).toEqual([])
    lc.note(write('/x/other.md'), OK)
    lc.note(write(LAUNCH), { deny: 'x' })
    await lc.onTurn(r.ports)
    expect([r.reads, r.copies, r.notifies, r.statuses]).toEqual([[], [], [], []])
  })
  test('the touched set is cleared by the turn: the next turn does not re-read', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    await lc.onTurn(r.ports)
    expect(r.reads).toEqual([LAUNCH])
    expect(r.copies.length).toBe(1)
  })
  test('two different LAUNCH.md files in one turn: each is copied, in order', async () => {
    const r = rig({ '/a/LAUNCH.md': file('first one'), '/b/LAUNCH.md': file('second one') })
    const lc = new LaunchCopy('copy')
    lc.note(write('/a/LAUNCH.md'), OK)
    lc.note(write('/b/LAUNCH.md'), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual(['first one', 'second one'])
  })
})

describe('L7 a failed copy says so, naming the file and the reason', () => {
  const msg = (reason: string) => `Launch brief ready, but the copy failed (${reason}). Pickup is in ${LAUNCH} under "## 1. Pickup".`
  test('isCopied false with a reason', async () => {
    const r = rig()
    r.copyMode = 'no-surface'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies).toEqual([[msg('no-surface'), 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · copy failed (no-surface) ${local(T0)}`])
    expect(MSG.copyFailed(LAUNCH, 'no-surface')).toBe(msg('no-surface'))
  })
  test('a throwing copy: the reason is the first line of its message', async () => {
    const r = rig()
    r.copyMode = 'throw'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies).toEqual([[msg('clipboard exploded'), 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · copy failed (clipboard exploded) ${local(T0)}`])
  })
  test('a throw that is not an Error, a missing reason and a malformed result still say something honest', async () => {
    for (const [mode, reason] of [['throw-nonerror', 'error'], ['no-reason', 'unknown'], ['garbage', 'unknown']] as const) {
      const r = rig()
      r.copyMode = mode
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect(r.notifies.map(n => n[0])).toEqual([msg(reason)])
    }
  })
  test('a failed copy is not remembered as copied: the next edit with the same pickup tries again', async () => {
    const r = rig()
    r.copyMode = 'no-surface'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.copyMode = 'ok'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, PICKUP])
    expect(r.notifies[1][0]).toBe('Launch brief ready: pickup copied. Open a new chat and paste.')
  })
})

describe('L8 once per changed pickup', () => {
  test('two Edits to the same LAUNCH.md in one turn: one copy', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(edit(LAUNCH), OK)
    lc.note(edit(LAUNCH), OK)
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
    expect(r.notifies.length).toBe(1)
    expect(r.reads).toEqual([LAUNCH])
  })
  test('a later turn whose edit leaves the pickup unchanged: no copy, no notify, no status, no new timer', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    const timersAfterFirst = r.timers.length
    r.files[LAUNCH] = file(PICKUP).replace('## 2. Goal', '## 2. Goal (reworded)')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies.length).toBe(1)
    expect(r.notifies.length).toBe(1)
    expect(r.statuses.length).toBe(1)
    expect(r.timers.length).toBe(timersAfterFirst) // nothing asked for, so no new timer of any kind
  })
  test('a changed pickup is copied again', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = file('A different pickup line.')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, 'A different pickup line.'])
    expect(r.notifies.length).toBe(2)
  })
  test('the memory is per path: the same text in another LAUNCH.md is copied', async () => {
    const r = rig({ '/a/LAUNCH.md': file(PICKUP), '/b/LAUNCH.md': file(PICKUP) })
    const lc = new LaunchCopy('copy')
    lc.note(write('/a/LAUNCH.md'), OK)
    await lc.onTurn(r.ports)
    lc.note(write('/b/LAUNCH.md'), OK)
    await lc.onTurn(r.ports)
    expect(r.copies.length).toBe(2)
  })
  test('a copy that never answers does not block the next turn, and the unchanged pickup is not asked for twice', async () => {
    const r = rig()
    r.copyMode = 'hang'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    void lc.onTurn(r.ports)
    for (let i = 0; i < 50; i++) await Promise.resolve()
    expect(r.copies.length).toBe(1)
    r.copyMode = 'ok' // the engine answers the second ask; the first stays pending forever
    r.files[LAUNCH] = file('Changed while the first copy hangs.')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, 'Changed while the first copy hangs.'])
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies.length).toBe(2)
  })
})

describe('L9 modes', () => {
  test('notify: no copy; the notification names the path', async () => {
    const r = rig()
    const lc = new LaunchCopy('notify')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([])
    expect(r.notifies).toEqual([[`Launch brief ready: ${LAUNCH}. Copy its Pickup block into a new chat.`, 'launch-copy']])
    // F3: $.ui.notify is unmeasured on the desktop, so the footer line is the surface that must always say something
    expect(r.statuses).toEqual([`launch-copy · brief ready ${local(T0)}`])
  })
  test('F3 notify: the brief-ready line clears with the same ten-minute timer', async () => {
    const r = rig()
    const lc = new LaunchCopy('notify')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(live(r).map(t => t.ms)).toEqual([600_000])
    r.fire()
    expect(r.statuses[r.statuses.length - 1]).toBeUndefined()
  })
  test('notify: an unchanged pickup is announced once', async () => {
    const r = rig()
    const lc = new LaunchCopy('notify')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.length).toBe(1)
  })
  test('off: no read, no copy, no notify, no status, no timer (even when notes arrive)', async () => {
    const r = rig()
    const lc = new LaunchCopy('off')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect([r.reads, r.copies, r.notifies, r.statuses, r.timers]).toEqual([[], [], [], [], []])
  })
  test('garbage reads as off end to end', async () => {
    const r = rig()
    const lc = new LaunchCopy(readOptions({ mode: 'garbage' }).mode)
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect([r.reads, r.copies, r.notifies, r.statuses, r.timers]).toEqual([[], [], [], [], []])
  })
})

describe('no pickup found', () => {
  const none = (path: string, why = '') => `LAUNCH.md written, but no Pickup block was found${why}: ${path}`
  test('a file with no Pickup block: no copy, a notify naming the path, a status', async () => {
    for (const body of ['# just a title', ['## 1. Pickup', 'prose only', '## 2. Goal', '```', 'other', '```'].join('\n'), '## Pickup\n```\n```', '## Pickup\n```text\nunclosed']) {
      const r = rig({ [LAUNCH]: body })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect(r.copies).toEqual([])
      expect(r.notifies).toEqual([[none(LAUNCH), 'launch-copy']])
      expect(r.statuses).toEqual([`launch-copy · no pickup ${local(T0)}`])
    }
  })
  test('a read failure is the same branch with (could not read)', async () => {
    const r = rig({ [LAUNCH]: new Error('EACCES') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([])
    expect(r.notifies).toEqual([[none(LAUNCH, ' (could not read)'), 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · no pickup ${local(T0)}`])
  })
  test('notify mode with no pickup says so too', async () => {
    const r = rig({ [LAUNCH]: '# nothing' })
    const lc = new LaunchCopy('notify')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies).toEqual([[none(LAUNCH), 'launch-copy']])
  })
  test('a later edit that adds the block copies it', async () => {
    const r = rig({ [LAUNCH]: '# nothing yet' })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = file(PICKUP)
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
  })
})

describe('the UI calls cannot hurt the controller', () => {
  test('a notify that rejects, throws or never answers does not escape or block', async () => {
    for (const mode of ['reject', 'throw', 'hang'] as const) {
      const r = rig()
      r.notifyMode = mode
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      for (let i = 0; i < 20; i++) await Promise.resolve()
      expect(r.copies).toEqual([PICKUP])
      expect(r.notifies.length).toBe(1)
      expect(r.statuses.length).toBe(1)
    }
  })
  test('a status that throws does not stop the notify', async () => {
    const r = rig()
    r.ports.status = () => { throw new Error('no ui') }
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.length).toBe(1)
  })
  test('a clock that fails still copies and still says so (status without the time)', async () => {
    const r = rig()
    r.nowFails = true
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
    expect(r.statuses).toEqual(['launch-copy · pickup copied'])
  })
  test('note() never throws, whatever it is handed', () => {
    const lc = new LaunchCopy('copy')
    for (const [e, res] of [[undefined, undefined], [null, null], [{}, {}], [write(LAUNCH), undefined], [write(LAUNCH), null], [write(LAUNCH), 'str']] as const) {
      expect(() => lc.note(e, res)).not.toThrow()
    }
  })
})

describe('the status line clears after ten minutes, with one timer', () => {
  test('the clearing timer is 10 minutes and clears the line', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(CLEAR_MS).toBe(10 * 60_000)
    expect(r.timers.filter(t => t.ms === 600_000).length).toBe(1)
    expect(live(r).map(t => t.ms)).toEqual([600_000]) // the F4 copy-timeout timer is cancelled once the copy answered
    r.fire()
    expect(r.statuses[r.statuses.length - 1]).toBeUndefined()
  })
  test('a second status replaces the first and its timer: one live timer', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = file('changed')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.timers.filter(t => t.ms === 600_000).length).toBe(2)
    expect(live(r).map(t => t.ms)).toEqual([600_000])
  })
  test('a timer that cannot be set does not stop the rest', async () => {
    const r = rig()
    r.ports.after = () => { throw new Error('no timers') }
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
    expect(r.notifies.length).toBe(1)
  })
})

const settleMicro = async () => {
  for (let i = 0; i < 40; i++) await Promise.resolve()
}

describe('F4 a copy that never answers is reported after 10 s, and its claim is released', () => {
  const COPY_TIMEOUT = 10_000
  const failed = (reason: string) => `Launch brief ready, but the copy failed (${reason}). Pickup is in ${LAUNCH} under "## 1. Pickup".`
  test('at 10 s: the failure branch with reason "no answer"; an identical later edit asks again', async () => {
    const r = rig()
    r.copyMode = 'hang'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    const run = lc.onTurn(r.ports)
    await settleMicro()
    expect([r.notifies, r.statuses]).toEqual([[], []]) // still waiting: nothing claimed yet
    const timer = r.timers.find(t => t.ms === COPY_TIMEOUT && t.live)
    expect(timer).toBeDefined()
    timer!.fn()
    await run
    expect(r.notifies).toEqual([[failed('no answer'), 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · copy failed (no answer) ${local(T0)}`])
    r.copyMode = 'ok'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, PICKUP])
    expect(r.notifies[1][0]).toBe('Launch brief ready: pickup copied. Open a new chat and paste.')
  })
  test('a copy that answers in time leaves no live timeout behind', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.timers.some(t => t.ms === COPY_TIMEOUT)).toBe(true)
    expect(live(r).some(t => t.ms === COPY_TIMEOUT)).toBe(false)
  })
  test('an answer that arrives after the timeout changes nothing more', async () => {
    const r = rig()
    let answer: (v: unknown) => void = () => {}
    r.ports.copy = text => {
      r.copies.push(text)
      return new Promise(res => { answer = res })
    }
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    const run = lc.onTurn(r.ports)
    await settleMicro()
    r.timers.find(t => t.ms === COPY_TIMEOUT && t.live)!.fn()
    await run
    answer({ isCopied: true })
    await settleMicro()
    expect(r.notifies.length).toBe(1)
    expect(r.statuses.length).toBe(1)
  })
  test('a clock that cannot set the timeout still copies', async () => {
    const r = rig()
    r.ports.after = () => { throw new Error('no timers') }
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
  })
})

describe('F5 the no-pickup notification is once per path until something changes', () => {
  const none = (path: string, why = '') => `LAUNCH.md written, but no Pickup block was found${why}: ${path}`
  test('the same broken file over three touched turns: one notify, three status lines', async () => {
    const r = rig({ [LAUNCH]: '# nothing yet' })
    const lc = new LaunchCopy('copy')
    for (let i = 0; i < 3; i++) {
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    expect(r.notifies).toEqual([[none(LAUNCH), 'launch-copy']])
    expect(r.statuses.length).toBe(3)
  })
  test('the no-pickup state changing (missing block -> unreadable) notifies again; so does a pickup found in between', async () => {
    const r = rig({ [LAUNCH]: '# nothing yet' })
    const lc = new LaunchCopy('copy')
    const turn = async () => {
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    await turn() // 1: none
    await turn() // quiet
    r.files[LAUNCH] = new Error('EACCES')
    await turn() // 2: unreadable
    await turn() // quiet
    r.files[LAUNCH] = file(PICKUP)
    await turn() // 3: copied
    r.files[LAUNCH] = '# broken again'
    await turn() // 4: none again (re-armed by the pickup)
    expect(r.notifies.map(n => n[0])).toEqual([none(LAUNCH), none(LAUNCH, ' (could not read)'), 'Launch brief ready: pickup copied. Open a new chat and paste.', none(LAUNCH)])
  })
  test('it is per path: a second broken LAUNCH.md notifies on its own', async () => {
    const r = rig({ '/a/LAUNCH.md': '# a', '/b/LAUNCH.md': '# b' })
    const lc = new LaunchCopy('copy')
    for (const p of ['/a/LAUNCH.md', '/b/LAUNCH.md', '/a/LAUNCH.md', '/b/LAUNCH.md']) {
      lc.note(edit(p), OK)
      await lc.onTurn(r.ports)
    }
    expect(r.notifies.map(n => n[0])).toEqual([none('/a/LAUNCH.md'), none('/b/LAUNCH.md')])
  })
  test('notify mode follows the same rule', async () => {
    const r = rig({ [LAUNCH]: '# nothing' })
    const lc = new LaunchCopy('notify')
    for (let i = 0; i < 2; i++) {
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    expect(r.notifies.length).toBe(1)
  })
})

describe('F6 a broken edit forgets the handled pickup, so a restored pickup is copied again', () => {
  test('pickup A, a file with no pickup, pickup A again: copied twice', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = '# the pickup block was deleted'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = file(PICKUP)
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, PICKUP])
  })
  test('the same through an unreadable file', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = new Error('EACCES')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = file(PICKUP)
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, PICKUP])
  })
  test('notify mode announces a restored pickup again too', async () => {
    const r = rig()
    const lc = new LaunchCopy('notify')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = '# broken'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = file(PICKUP)
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.filter(n => n[0].startsWith('Launch brief ready:')).length).toBe(2)
  })
  test('without a broken edit in between, the unchanged pickup is still skipped (L8 holds)', async () => {
    const r = rig()
    const lc = new LaunchCopy('copy')
    for (let i = 0; i < 3; i++) {
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    expect(r.copies).toEqual([PICKUP])
  })
})

// ---- M9 lane awareness (design note M9) ----
// The lane is read from the Stamp section (./lane): L1 and L3c have nothing to paste (the intake chat starts the builder
// itself), L2 pastes a /compact line in the SAME chat, L3 and "no lane" are today's paste-into-a-new-chat behaviour.
// Every sentence below is spelled out literally, not taken from MSG, so a reworded constant cannot pass its own test.
const COPIED_L3 = 'Launch brief ready: pickup copied. Open a new chat and paste.'
const COPIED_L2 = 'Launch brief ready: the /compact line is copied. Paste it in this chat and send go.'
const noPaste = (lane: string, path = LAUNCH) => `Launch brief ready (lane ${lane}: this chat starts it, nothing to paste): ${path}`
const STAMP_NO_LANE = 'written: 2026-01-15T09:00Z (previous chat, closing) · re-probe any dated claim before acting.'
/** A brief with a Stamp section; `lane` undefined = a Stamp that names no lane. */
const stamped = (lane: string | undefined, pickup = PICKUP) =>
  [file(pickup), '', '## 12. Stamp', lane === undefined ? STAMP_NO_LANE : `written: 2026-01-15T09:00Z (previous chat, closing) · lane ${lane} · re-probe any dated claim before acting.`].join('\n')
const COPY_TIMEOUT_MS = 10_000

describe('X3 wiring: the lane decides whether anything is copied', () => {
  test('L3c and L1: zero copies, one notice naming the lane and the path, the lane status line, no copy timer', async () => {
    for (const lane of ['L3c', 'L1']) {
      const r = rig({ [LAUNCH]: stamped(lane) })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([lane, r.copies]).toEqual([lane, []])
      expect([lane, r.notifies]).toEqual([lane, [[noPaste(lane), 'launch-copy']]])
      expect([lane, r.statuses]).toEqual([lane, [`launch-copy · lane ${lane}, nothing to paste ${local(T0)}`]])
      expect(r.timers.some(t => t.ms === COPY_TIMEOUT_MS)).toBe(false) // the copy path was never entered
    }
  })
  test('L3c and L1 spelled in every way the extractor accepts still copy nothing', async () => {
    for (const spelled of ['L3C', 'l3c', 'l1', 'L1']) {
      const r = rig({ [LAUNCH]: stamped(spelled) })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([spelled, r.copies]).toEqual([spelled, []])
    }
  })
  test('L2: copies as today; the /compact notice and status', async () => {
    const r = rig({ [LAUNCH]: stamped('L2') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
    expect(r.notifies).toEqual([[COPIED_L2, 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · /compact line copied ${local(T0)}`])
  })
  test('L2 with a failed copy keeps the existing failure notice (path and reason) and its status, and the next edit retries', async () => {
    const r = rig({ [LAUNCH]: stamped('L2') })
    r.copyMode = 'no-surface'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies).toEqual([[`Launch brief ready, but the copy failed (no-surface). Pickup is in ${LAUNCH} under "## 1. Pickup".`, 'launch-copy']])
    expect(r.statuses).toEqual([`launch-copy · copy failed (no-surface) ${local(T0)}`])
    r.copyMode = 'ok'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP, PICKUP])
    expect(r.notifies[1][0]).toBe(COPIED_L2)
  })
  test('L3 and no lane: byte-identical to 0.1.0 (the paste notice, the pickup-copied status)', async () => {
    for (const body of [stamped('L3'), stamped('l3'), stamped(undefined), stamped('L4'), file(PICKUP)]) {
      const r = rig({ [LAUNCH]: body })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect(r.copies).toEqual([PICKUP])
      expect(r.notifies).toEqual([[COPIED_L3, 'launch-copy']])
      expect(r.statuses).toEqual([`launch-copy · pickup copied ${local(T0)}`])
    }
  })
  test('false-accept direction: a `lane L1` or `lane L3c` OUTSIDE the Stamp (Plan of attack, the Pickup itself) does not switch the copy off', async () => {
    const plan = ['# Launch: x', '', '## 1. Pickup', '', '```text', 'Read CONTRACT.md and execute lane L3c.', '```', '', '## 6. Plan of attack', 'lane L1 if short.', '', '## 12. Stamp', 'written: x · lane L3 · y'].join('\n')
    const r = rig({ [LAUNCH]: plan })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual(['Read CONTRACT.md and execute lane L3c.'])
    expect(r.notifies).toEqual([[COPIED_L3, 'launch-copy']])
    const noStamp = rig({ [LAUNCH]: plan.replace('## 12. Stamp', '## 12. Notes') })
    const lc2 = new LaunchCopy('copy')
    lc2.note(write(LAUNCH), OK)
    await lc2.onTurn(noStamp.ports)
    expect(noStamp.copies.length).toBe(1)
  })
  test('no pickup keeps today\'s branch whatever the lane (a brief with no Pickup is wrong in every lane)', async () => {
    for (const lane of ['L1', 'L2', 'L3', 'L3c']) {
      const r = rig({ [LAUNCH]: `# Launch: x\n\n## 12. Stamp\nwritten: x · lane ${lane} · y` })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect(r.copies).toEqual([])
      expect([lane, r.notifies]).toEqual([lane, [[`LAUNCH.md written, but no Pickup block was found: ${LAUNCH}`, 'launch-copy']]])
      expect(r.statuses).toEqual([`launch-copy · no pickup ${local(T0)}`])
    }
  })
  test('an unreadable file keeps the unreadable branch whatever the lane', async () => {
    const r = rig({ [LAUNCH]: new Error('EACCES') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies).toEqual([[`LAUNCH.md written, but no Pickup block was found (could not read): ${LAUNCH}`, 'launch-copy']])
  })
  test('a lane notice survives a notify that rejects, throws or never answers, and a status that throws', async () => {
    for (const mode of ['reject', 'throw', 'hang'] as const) {
      const r = rig({ [LAUNCH]: stamped('L3c') })
      r.notifyMode = mode
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      for (let i = 0; i < 20; i++) await Promise.resolve()
      expect(r.notifies.length).toBe(1)
      expect(r.statuses.length).toBe(1)
      expect(r.copies).toEqual([])
    }
    const r = rig({ [LAUNCH]: stamped('L1') })
    r.ports.status = () => { throw new Error('no ui') }
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.length).toBe(1)
  })
  test('the lane status line clears with the same one ten-minute timer', async () => {
    const r = rig({ [LAUNCH]: stamped('L3c') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(live(r).map(t => t.ms)).toEqual([600_000])
    r.fire()
    expect(r.statuses[r.statuses.length - 1]).toBeUndefined()
  })
  test('a clock that fails still says it (status without the time)', async () => {
    const r = rig({ [LAUNCH]: stamped('L3c') })
    r.nowFails = true
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.statuses).toEqual(['launch-copy · lane L3c, nothing to paste'])
  })
})

describe('X4 modes with a lane', () => {
  test('notify mode, L3c and L1: the lane notice and status, no copy', async () => {
    for (const lane of ['L3c', 'L1']) {
      const r = rig({ [LAUNCH]: stamped(lane) })
      const lc = new LaunchCopy('notify')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([lane, r.copies]).toEqual([lane, []])
      expect([lane, r.notifies]).toEqual([lane, [[noPaste(lane), 'launch-copy']]])
      expect([lane, r.statuses]).toEqual([lane, [`launch-copy · lane ${lane}, nothing to paste ${local(T0)}`]])
    }
  })
  test('notify mode, L2: no copy, and the notice does not claim a copy that did not happen', async () => {
    const r = rig({ [LAUNCH]: stamped('L2') })
    const lc = new LaunchCopy('notify')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([])
    expect(r.notifies).toEqual([[`Launch brief ready (lane L2: paste its /compact line in this chat and send go): ${LAUNCH}`, 'launch-copy']])
    expect(r.notifies[0][0]).not.toContain('copied')
    expect(r.statuses).toEqual([`launch-copy · brief ready ${local(T0)}`])
  })
  test('notify mode, L3 and no lane: today\'s wording', async () => {
    for (const body of [stamped('L3'), stamped(undefined), file(PICKUP)]) {
      const r = rig({ [LAUNCH]: body })
      const lc = new LaunchCopy('notify')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect(r.copies).toEqual([])
      expect(r.notifies).toEqual([[`Launch brief ready: ${LAUNCH}. Copy its Pickup block into a new chat.`, 'launch-copy']])
      expect(r.statuses).toEqual([`launch-copy · brief ready ${local(T0)}`])
    }
  })
  test('off and garbage: nothing at all, whatever the lane', async () => {
    for (const mode of ['off', readOptions({ mode: 'garbage' }).mode, readOptions({ mode: 'Copy' }).mode]) {
      for (const lane of ['L1', 'L2', 'L3', 'L3c']) {
        const r = rig({ [LAUNCH]: stamped(lane) })
        const lc = new LaunchCopy(mode)
        lc.note(write(LAUNCH), OK)
        await lc.onTurn(r.ports)
        expect([mode, lane, r.reads, r.copies, r.notifies, r.statuses, r.timers]).toEqual([mode, lane, [], [], [], [], []])
      }
    }
  })
})

describe('X5 dedupe is keyed on the pickup text together with the lane', () => {
  test('the same pickup and the same lane twice: one notice (and for L2 / L3 one copy)', async () => {
    for (const lane of ['L1', 'L2', 'L3', 'L3c']) {
      const r = rig({ [LAUNCH]: stamped(lane) })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([lane, r.notifies.length]).toEqual([lane, 1])
      expect([lane, r.statuses.length]).toEqual([lane, 1])
      expect([lane, r.copies.length]).toEqual([lane, lane === 'L2' || lane === 'L3' ? 1 : 0])
    }
  })
  test('an edit that changes neither the pickup nor the lane does nothing (not even a new timer)', async () => {
    const r = rig({ [LAUNCH]: stamped('L3c') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    const timers = r.timers.length
    r.files[LAUNCH] = stamped('L3c').replace('re-probe any dated claim', 're-probe every dated claim')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect([r.notifies.length, r.statuses.length, r.timers.length]).toEqual([1, 1, timers])
  })
  test('L3 then L3c with the same pickup: two notices; the second copies nothing', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = stamped('L3c')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3, noPaste('L3c')])
    expect(r.copies).toEqual([PICKUP])
  })
  test('L3c then L3 then L3c: three notices; the copy happens each time L3 is the lane', async () => {
    const r = rig({ [LAUNCH]: stamped('L3c') })
    const lc = new LaunchCopy('copy')
    const turn = async (lane: string) => {
      r.files[LAUNCH] = stamped(lane)
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    await turn('L3c')
    await turn('L3')
    await turn('L3c')
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L3c'), COPIED_L3, noPaste('L3c')])
    expect(r.copies).toEqual([PICKUP])
  })
  test('L1 to L3c and L3 to L2 are lane changes too', async () => {
    const a = rig({ [LAUNCH]: stamped('L1') })
    const lcA = new LaunchCopy('copy')
    lcA.note(write(LAUNCH), OK)
    await lcA.onTurn(a.ports)
    a.files[LAUNCH] = stamped('L3c')
    lcA.note(edit(LAUNCH), OK)
    await lcA.onTurn(a.ports)
    expect(a.notifies.map(n => n[0])).toEqual([noPaste('L1'), noPaste('L3c')])
    const b = rig({ [LAUNCH]: stamped('L3') })
    const lcB = new LaunchCopy('copy')
    lcB.note(write(LAUNCH), OK)
    await lcB.onTurn(b.ports)
    b.files[LAUNCH] = stamped('L2')
    lcB.note(edit(LAUNCH), OK)
    await lcB.onTurn(b.ports)
    expect(b.notifies.map(n => n[0])).toEqual([COPIED_L3, COPIED_L2])
  })
  test('a changed pickup under the same lane notifies again', async () => {
    const r = rig({ [LAUNCH]: stamped('L3c') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = stamped('L3c', 'A different pickup line.')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L3c'), noPaste('L3c')])
    expect(r.copies).toEqual([])
  })
  test('no lane and an explicit L3 behave the same, so adding `lane L3` to a handled brief does not copy again', async () => {
    const r = rig({ [LAUNCH]: stamped(undefined) })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = stamped('L3')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
    expect(r.notifies.length).toBe(1)
  })
  test('the memory is per path: the same text and lane in another LAUNCH.md is announced', async () => {
    const r = rig({ '/a/LAUNCH.md': stamped('L3c'), '/b/LAUNCH.md': stamped('L3c') })
    const lc = new LaunchCopy('copy')
    lc.note(write('/a/LAUNCH.md'), OK)
    lc.note(write('/b/LAUNCH.md'), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L3c', '/a/LAUNCH.md'), noPaste('L3c', '/b/LAUNCH.md')])
  })
  test('F6 holds for a lane notice: a broken edit forgets what was handled, so the restored brief is announced again', async () => {
    const r = rig({ [LAUNCH]: stamped('L3c') })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = '# the pickup block was deleted'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    r.files[LAUNCH] = stamped('L3c')
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.filter(n => n[0] === noPaste('L3c')).length).toBe(2)
  })
})

// ---- Review round 1 fixes ----
describe('R1-F3 a token that only starts like a lane (L1c, L2c) is no lane: the paste behaviour, and it dedupes as L3', () => {
  test('the sequence L3, L3c, L3, L1c, L1c makes exactly 2 copies and 1 L3c notice', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const lc = new LaunchCopy('copy')
    for (const lane of ['L3', 'L3c', 'L3', 'L1c', 'L1c']) {
      r.files[LAUNCH] = stamped(lane)
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    expect(r.copies).toEqual([PICKUP, PICKUP])
    expect(r.notifies.filter(n => n[0] === noPaste('L3c')).length).toBe(1)
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3, noPaste('L3c'), COPIED_L3])
  })
  test('L1c and L2c alone are the paste behaviour (copy, the "open a new chat" notice), never a skip', async () => {
    for (const lane of ['L1c', 'L2c', 'L3cc', 'L1.5']) {
      const r = rig({ [LAUNCH]: stamped(lane) })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([lane, r.copies]).toEqual([lane, [PICKUP]])
      expect([lane, r.notifies]).toEqual([lane, [[COPIED_L3, 'launch-copy']]])
    }
  })
  test('two disagreeing lanes in the Stamp are the paste behaviour too', async () => {
    const r = rig({ [LAUNCH]: `${file(PICKUP)}\n\n## 12. Stamp\n(was lane L1) · lane L3c` })
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.copies).toEqual([PICKUP])
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3])
  })
  // r3: the reader is strict. Each of these was read as L1 or L3c by the r1/r2 reader (a wrong skip on a brief that says L3
  // somewhere); now they are no lane, i.e. the paste behaviour: the pickup is copied and the paste notice is shown.
  test('r3: a list, a gloss or a second mention in the Stamp is the paste behaviour, never a skip', async () => {
    for (const stamp of ['lane L1 or L3', 'lane L1, L3', 'lane is L3 (earlier draft: lane L1)', 'lane will be L3 (lane L3c was dropped)', 'lane TBD · lane L1', 'launch-lane: L3 (was lane L1)']) {
      const r = rig({ [LAUNCH]: `${file(PICKUP)}\n\n## 12. Stamp\nwritten: x · ${stamp} · y` })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([stamp, r.copies]).toEqual([stamp, [PICKUP]])
      expect([stamp, r.notifies]).toEqual([stamp, [[COPIED_L3, 'launch-copy']]])
      expect([stamp, r.statuses]).toEqual([stamp, [`launch-copy · pickup copied ${local(T0)}`]])
    }
  })
  test('r3: the clean declaration beside the same words still skips (the strict reader has not switched the feature off)', async () => {
    for (const lane of ['L1', 'L3c']) {
      const r = rig({ [LAUNCH]: `${file(PICKUP)}\n\n## 12. Stamp\nwritten: x · lane ${lane}, child session · y` })
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect([lane, r.copies]).toEqual([lane, []])
      expect([lane, r.notifies]).toEqual([lane, [[noPaste(lane), 'launch-copy']]])
    }
  })
})

describe('R1-F4 a copy that has been superseded says nothing when it settles', () => {
  /** A copy port whose FIRST call stays pending (resolved through `answer`); later calls answer isCopied at once. */
  function slowFirst(r: Rig) {
    const h = { answer: (_v: unknown) => {} }
    let calls = 0
    r.ports.copy = text => {
      r.copies.push(text)
      calls++
      if (calls > 1) return Promise.resolve({ isCopied: true })
      return new Promise(res => { h.answer = res })
    }
    return h
  }
  const firstTurn = async (r: Rig, lc: LaunchCopy) => {
    lc.note(write(LAUNCH), OK)
    const run = lc.onTurn(r.ports)
    await settleMicro()
    expect(r.copies.length).toBe(1) // the slow copy is in flight; nothing has been said yet
    expect([r.notifies, r.statuses]).toEqual([[], []])
    return { run } // wrapped: returning the promise itself would make `await firstTurn()` wait for the slow copy
  }
  const flipTo = async (r: Rig, lc: LaunchCopy, body: string) => {
    r.files[LAUNCH] = body
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
  }
  test('a slow L3 copy, then an edit flips the Stamp to L1: a late success adds no "pickup copied ... paste"', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const h = slowFirst(r)
    const lc = new LaunchCopy('copy')
    const { run: first } = await firstTurn(r, lc)
    await flipTo(r, lc, stamped('L1'))
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L1')])
    h.answer({ isCopied: true })
    await first
    await settleMicro()
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L1')])
    expect(r.statuses).toEqual([`launch-copy · lane L1, nothing to paste ${local(T0)}`])
  })
  test('the same, and the slow copy then times out: no "no answer" notice and no failed status', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    slowFirst(r)
    const lc = new LaunchCopy('copy')
    const { run: first } = await firstTurn(r, lc)
    await flipTo(r, lc, stamped('L1'))
    r.timers.find(t => t.ms === COPY_TIMEOUT_MS && t.live)!.fn()
    await first
    await settleMicro()
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L1')])
    expect(r.statuses.length).toBe(1)
  })
  test('the same, and the slow copy then fails: silent', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const h = slowFirst(r)
    const lc = new LaunchCopy('copy')
    const { run: first } = await firstTurn(r, lc)
    await flipTo(r, lc, stamped('L3c'))
    h.answer({ isCopied: false, reason: 'no-surface' })
    await first
    await settleMicro()
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L3c')])
    expect(r.statuses.length).toBe(1)
  })
  test('a late answer for an old pickup, after the pickup text changed under the same lane: only the newer copy is reported', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const h = slowFirst(r)
    const lc = new LaunchCopy('copy')
    const { run: first } = await firstTurn(r, lc)
    await flipTo(r, lc, stamped('L3', 'A newer pickup line.'))
    expect(r.copies).toEqual([PICKUP, 'A newer pickup line.'])
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3])
    h.answer({ isCopied: true })
    await first
    await settleMicro()
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3])
    expect(r.statuses.length).toBe(1)
  })
  test('a late answer after a broken edit (no pickup): only the no-pickup notice stands', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const h = slowFirst(r)
    const lc = new LaunchCopy('copy')
    const { run: first } = await firstTurn(r, lc)
    await flipTo(r, lc, '# the pickup block was deleted')
    h.answer({ isCopied: true })
    await first
    await settleMicro()
    expect(r.notifies.map(n => n[0])).toEqual([`LAUNCH.md written, but no Pickup block was found: ${LAUNCH}`])
  })
  test('contrast: a copy that is still current when it settles IS reported (a late success, a late failure)', async () => {
    for (const [answer, want] of [[{ isCopied: true }, COPIED_L3], [{ isCopied: false, reason: 'no-surface' }, `Launch brief ready, but the copy failed (no-surface). Pickup is in ${LAUNCH} under "## 1. Pickup".`]] as const) {
      const r = rig({ [LAUNCH]: stamped('L3') })
      const h = slowFirst(r)
      const lc = new LaunchCopy('copy')
      const { run: first } = await firstTurn(r, lc)
      h.answer(answer)
      await first
      expect(r.notifies.map(n => n[0])).toEqual([want])
    }
  })
  test('a superseded failure does not release the NEWER claim: the unchanged newer pickup is not asked for again', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const h = slowFirst(r)
    const lc = new LaunchCopy('copy')
    const { run: first } = await firstTurn(r, lc)
    await flipTo(r, lc, stamped('L3c'))
    h.answer({ isCopied: false, reason: 'no-surface' })
    await first
    await settleMicro()
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports)
    expect(r.notifies.map(n => n[0])).toEqual([noPaste('L3c')])
  })
})

// ---- Review round 2 fixes (F3) ----
// Supersession was decided by comparing KEYS, so a copy A that was superseded by a break-and-restore to the SAME key looked
// current when it settled: it spoke for copy B and released B's claim. Each copy attempt now owns a token stored with its
// claim; only the attempt whose token is the claim's current token may notify, set the status or release the claim.
describe('R2-F3 supersession is per copy, not per key', () => {
  /** A copy port whose every call stays pending until `answers[i]` is called. */
  function deferred(r: Rig) {
    const answers: ((v: unknown) => void)[] = []
    r.ports.copy = text => {
      r.copies.push(text)
      return new Promise(res => { answers.push(res) })
    }
    return answers
  }
  const NO_PICKUP = `LAUNCH.md written, but no Pickup block was found: ${LAUNCH}`
  /** Copy A (key K) hangs; the brief is broken; it is restored to K, so copy B claims K; A settles; then B settles OK. */
  async function scenario(settleA: 'timeout' | 'success' | 'failure') {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const answers = deferred(r)
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    const runA = lc.onTurn(r.ports)
    await settleMicro()
    expect(r.copies).toEqual([PICKUP]) // A is in flight, nothing said yet
    expect(r.notifies).toEqual([])
    r.files[LAUNCH] = '# the pickup block was deleted'
    lc.note(edit(LAUNCH), OK)
    await lc.onTurn(r.ports) // the broken brief removes A's claim and says so
    expect(r.notifies.map(n => n[0])).toEqual([NO_PICKUP])
    r.files[LAUNCH] = stamped('L3') // restored to the very same key K
    lc.note(edit(LAUNCH), OK)
    const runB = lc.onTurn(r.ports)
    await settleMicro()
    expect(r.copies).toEqual([PICKUP, PICKUP]) // B claimed K and is in flight
    // A settles now.
    if (settleA === 'timeout') r.timers.filter(t => t.ms === COPY_TIMEOUT_MS)[0].fn()
    else if (settleA === 'success') answers[0]({ isCopied: true })
    else answers[0]({ isCopied: false, reason: 'no-surface' })
    await runA
    await settleMicro()
    return { r, lc, answers, runB }
  }
  for (const settleA of ['timeout', 'success', 'failure'] as const) {
    test(`A ${settleA} after B claimed the same key: A says nothing and B's claim survives; B succeeds: exactly one success notice; the next identical edit copies nothing`, async () => {
      const { r, lc, answers, runB } = await scenario(settleA)
      expect(r.notifies.map(n => n[0])).toEqual([NO_PICKUP]) // A said nothing: no failure notice, no early "pickup copied"
      expect(r.statuses).toEqual([`launch-copy · no pickup ${local(T0)}`]) // only the broken edit's line: A set no status either
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports) // an identical edit while B is pending: B's claim is intact, so no third copy
      expect(r.copies).toEqual([PICKUP, PICKUP])
      answers[1]({ isCopied: true })
      await runB
      await settleMicro()
      expect(r.notifies.map(n => n[0])).toEqual([NO_PICKUP, COPIED_L3]) // exactly one success notice
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
      expect(r.copies).toEqual([PICKUP, PICKUP]) // the next identical edit copies nothing
      expect(r.notifies.map(n => n[0])).toEqual([NO_PICKUP, COPIED_L3])
    })
  }
  test('A fails late after B claimed the same key, then B FAILS: B alone is reported, and its claim is released (the next edit retries)', async () => {
    const { r, lc, answers, runB } = await scenario('failure')
    answers[1]({ isCopied: false, reason: 'busy' })
    await runB
    await settleMicro()
    expect(r.notifies.map(n => n[0])).toEqual([NO_PICKUP, `Launch brief ready, but the copy failed (busy). Pickup is in ${LAUNCH} under "## 1. Pickup".`])
    lc.note(edit(LAUNCH), OK)
    const retry = lc.onTurn(r.ports)
    await settleMicro()
    expect(r.copies).toEqual([PICKUP, PICKUP, PICKUP]) // B's own failure released the claim, so the unchanged brief is copied again
    answers[2]({ isCopied: true })
    await retry
  })
  test('contrast: a copy whose claim was never replaced still reports and releases as before', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const answers = deferred(r)
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    const run = lc.onTurn(r.ports)
    await settleMicro()
    r.timers.filter(t => t.ms === COPY_TIMEOUT_MS)[0].fn()
    await run
    expect(r.notifies.map(n => n[0])).toEqual([`Launch brief ready, but the copy failed (no answer). Pickup is in ${LAUNCH} under "## 1. Pickup".`])
    lc.note(edit(LAUNCH), OK)
    const again = lc.onTurn(r.ports)
    await settleMicro()
    expect(r.copies.length).toBe(2) // released: asked again
    answers[1]({ isCopied: true })
    await again
  })
})

// ---- Fold r4: a size guard before any extraction ----
// A text over 32768 characters is treated as not read (the Launch Protocol's own cap for LAUNCH.md; real briefs are under 11 KB):
// no pickup, no lane, no copy. Reason: the extractors are quadratic on hostile input (an unterminated `<!--` flood took 16.5 s at
// 391 KiB, a line of backticks followed by U+2028, U+2029 or a lone CR 4.9 s at 80k), and a hook must never hang a turn.
describe('R4 the size guard', () => {
  const OVER = (path = LAUNCH) => `LAUNCH.md is over 32 KiB (the protocol's cap), not read: ${path}`
  const OVER_STATUS = `launch-copy · over 32 KiB, not read ${local(T0)}`
  const NO_PICKUP_MSG = `LAUNCH.md written, but no Pickup block was found: ${LAUNCH}`
  /** A valid brief (a pickup, no Stamp) padded with filler in its last section to exactly `n` characters. */
  const briefOf = (n: number, filler = 'x') => {
    const base = file(PICKUP)
    return base + filler.repeat(n - base.length)
  }
  /** One turn over `text` with real time around it (the guard is about wall clock, so `performance.now()`, not the fake clock). */
  async function once(text: string, mode: 'copy' | 'notify' = 'copy') {
    const r = rig({ [LAUNCH]: text })
    const lc = new LaunchCopy(mode)
    lc.note(write(LAUNCH), OK)
    const t0 = performance.now()
    await lc.onTurn(r.ports)
    return { r, lc, ms: performance.now() - t0 }
  }
  const stampTail = '\n\n## 12. Stamp\nlane L1\n' // a Stamp that would skip the copy, so "nothing was read" shows in the notices
  const HOSTILE: [string, string][] = [
    ['a 40 KB text of unterminated `<!--` repeats', file(PICKUP) + stampTail + '<!--'.repeat(10_000)],
    ['a 40 KB line of backticks then U+2028', file(PICKUP) + stampTail + '`'.repeat(40_000) + ' x\n'],
    ['a 40 KB line of backticks then U+2029', file(PICKUP) + stampTail + '`'.repeat(40_000) + ' x\n'],
    ['a 40 KB line of backticks then a lone CR', file(PICKUP) + stampTail + '`'.repeat(40_000) + '\rx\n'],
    ['a 300 KB brief', file(PICKUP) + stampTail + 'x'.repeat(300_000)],
    ['a 391 KiB flood of 100k unterminated `<!--` (16.5 s unguarded)', file(PICKUP) + stampTail + '<!--'.repeat(100_000)],
  ]

  test('an over-size file: no copy, the over-size notice and status, and the controller returns in under 200 ms', async () => {
    for (const [name, text] of HOSTILE) {
      expect(text.length).toBeGreaterThan(32768)
      const { r, ms } = await once(text)
      expect([name, r.copies]).toEqual([name, []])
      expect([name, r.notifies]).toEqual([name, [[OVER(), 'launch-copy']]])
      expect([name, r.statuses]).toEqual([name, [OVER_STATUS]]) // not a lane status, not "pickup copied"
      expect(r.timers.some(t => t.ms === COPY_TIMEOUT_MS)).toBe(false)
      expect([name, ms < 200]).toEqual([name, true])
    }
  })
  test('the boundary: 32768 characters are read, 32769 are not', async () => {
    const at = briefOf(32768)
    const over = briefOf(32769)
    expect([at.length, over.length]).toEqual([32768, 32769])
    const a = await once(at)
    expect(a.r.copies).toEqual([PICKUP])
    expect(a.r.notifies).toEqual([[COPIED_L3, 'launch-copy']])
    const b = await once(over)
    expect(b.r.copies).toEqual([])
    expect(b.r.notifies).toEqual([[OVER(), 'launch-copy']])
  })
  test('the limit counts characters, not bytes: 32768 two-byte characters are read', async () => {
    const at = briefOf(32768, 'é')
    expect(at.length).toBe(32768)
    const a = await once(at)
    expect(a.r.copies).toEqual([PICKUP])
  })
  test('notify mode says the same and copies nothing; off mode reads nothing at all', async () => {
    const n = await once(HOSTILE[4][1], 'notify')
    expect(n.r.copies).toEqual([])
    expect(n.r.notifies).toEqual([[OVER(), 'launch-copy']])
    expect(n.r.statuses).toEqual([OVER_STATUS])
    const off = rig({ [LAUNCH]: HOSTILE[4][1] })
    const lc = new LaunchCopy('off')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(off.ports)
    expect([off.reads, off.copies, off.notifies, off.statuses]).toEqual([[], [], [], []])
  })
  test('same rules as "no pickup found": the notice once per path and state, the status every time, the claim forgotten', async () => {
    const r = rig({ [LAUNCH]: stamped('L3') })
    const lc = new LaunchCopy('copy')
    const turn = async (body: string, how: (p: string) => unknown = edit) => {
      r.files[LAUNCH] = body
      lc.note(how(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    await turn(stamped('L3'), write)
    expect(r.copies).toEqual([PICKUP])
    await turn(HOSTILE[4][1])
    await turn(HOSTILE[4][1])
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3, OVER()]) // once, not twice
    expect(r.statuses.filter(s => s === OVER_STATUS).length).toBe(2) // the line is drawn every time
    await turn(stamped('L3')) // a broken edit forgot what was handled: the restored pickup is copied again
    expect(r.copies).toEqual([PICKUP, PICKUP])
    await turn(HOSTILE[4][1])
    expect(r.notifies.map(n => n[0])).toEqual([COPIED_L3, OVER(), COPIED_L3, OVER()]) // a pickup was found in between: news again
  })
  test('a change of trouble is news: no pickup, then over-size, then over-size again', async () => {
    const r = rig({ [LAUNCH]: '# Launch: x\n\nno pickup here' })
    const lc = new LaunchCopy('copy')
    const turn = async (body: string) => {
      r.files[LAUNCH] = body
      lc.note(edit(LAUNCH), OK)
      await lc.onTurn(r.ports)
    }
    await turn('# Launch: x\n\nno pickup here')
    await turn(HOSTILE[4][1])
    await turn(HOSTILE[4][1])
    await turn('# Launch: x\n\nno pickup here')
    expect(r.notifies.map(n => n[0])).toEqual([NO_PICKUP_MSG, OVER(), NO_PICKUP_MSG])
    expect(r.copies).toEqual([])
  })
})

describe('L11 no-surface falls back to the host clipboard (measured live: the desktop hosts the session headless)', () => {
  const withLocal = (r: Rig, local: (text: string) => Promise<unknown>, locals: string[]) => ({
    ...r.ports,
    copyLocal: async (text: string) => {
      locals.push(text)
      return local(text)
    },
  })
  const failed = (reason: string) => `Launch brief ready, but the copy failed (${reason}). Pickup is in ${LAUNCH} under "## 1. Pickup".`
  test('no-surface, then pbcopy takes it: copied, said once', async () => {
    const r = rig()
    r.copyMode = 'no-surface'
    const locals: string[] = []
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(withLocal(r, async () => ({ isCopied: true }), locals))
    expect(r.copies).toEqual([PICKUP])
    expect(locals).toEqual([PICKUP])
    expect(r.notifies).toEqual([[MSG.copied, TITLE]])
    expect(r.statuses).toEqual([`launch-copy · pickup copied ${local(T0)}`])
  })
  test('a copy that worked never reaches the fallback', async () => {
    const r = rig()
    const locals: string[] = []
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(withLocal(r, async () => ({ isCopied: true }), locals))
    expect(locals).toEqual([])
    expect(r.notifies.map(n => n[0])).toEqual([MSG.copied])
  })
  test('other failures are not retried locally: only no-surface is', async () => {
    for (const mode of ['no-reason', 'garbage', 'throw'] as const) {
      const r = rig()
      r.copyMode = mode
      const locals: string[] = []
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(withLocal(r, async () => ({ isCopied: true }), locals))
      expect(locals).toEqual([])
    }
    expect(await copyThrough({ copy: async () => ({ isCopied: false, reason: 'no-clipboard' }), copyLocal: async () => ({ isCopied: true }) }, 'x')).toEqual({ isCopied: false, reason: 'no-clipboard' })
    expect(await copyThrough({ copy: async () => ({ isCopied: false, reason: 'refused' }), copyLocal: async () => ({ isCopied: true }) }, 'x')).toEqual({ isCopied: false, reason: 'refused' })
  })
  test('pbcopy answers but fails: the failure names both', async () => {
    const r = rig()
    r.copyMode = 'no-surface'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(withLocal(r, async () => ({ isCopied: false, reason: 'pbcopy exit 1' }), []))
    expect(r.notifies.map(n => n[0])).toEqual([failed(LOCAL_FAILED_REASON)])
    expect(r.statuses).toEqual([`launch-copy · copy failed (${LOCAL_FAILED_REASON}) ${local(T0)}`])
  })
  test('pbcopy cannot start (off macOS): the original no-surface stands', async () => {
    const r = rig()
    r.copyMode = 'no-surface'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(withLocal(r, async () => { throw new Error('ENOENT pbcopy') }, []))
    expect(r.notifies.map(n => n[0])).toEqual([failed('no-surface')])
  })
  test('a hanging pbcopy is bounded by the copy timeout and releases the claim', async () => {
    const r = rig()
    r.copyMode = 'no-surface'
    const lc = new LaunchCopy('copy')
    lc.note(write(LAUNCH), OK)
    const turn = lc.onTurn(withLocal(r, () => new Promise(() => {}), []))
    await new Promise(res => setTimeout(res, 0))
    r.fire()
    await turn
    expect(r.notifies.map(n => n[0])).toEqual([failed('no answer')])
    // the claim was released: a re-edit of the same brief copies again
    const locals: string[] = []
    lc.note(write(LAUNCH), OK)
    await lc.onTurn(withLocal(r, async (t: string) => { locals.push(t); return { isCopied: true } }, []))
    expect(locals).toEqual([PICKUP])
    expect(r.notifies.length).toBe(2)
  })
  test('L1 and L3c still copy nothing, locally or otherwise', async () => {
    for (const lane of ['L1', 'L3c']) {
      const r = rig({ [LAUNCH]: file(PICKUP) + `\n\n## 12. Stamp\nwritten: x · lane ${lane}\n` })
      r.copyMode = 'no-surface'
      const locals: string[] = []
      const lc = new LaunchCopy('copy')
      lc.note(write(LAUNCH), OK)
      await lc.onTurn(withLocal(r, async () => ({ isCopied: true }), locals))
      expect(r.copies).toEqual([])
      expect(locals).toEqual([])
    }
  })
})
