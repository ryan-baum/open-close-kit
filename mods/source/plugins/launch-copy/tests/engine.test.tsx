// Kit tests: the mod loaded from this folder with its manifest DEFAULT (mode "copy") unless a test passes
// `{ options }` (F7: `TestOptions.options` sets the plugin's userConfig, checked on CLI 2.1.296; the earlier "the kit
// cannot set options" note was wrong for this kit). The test's `on` hooks are the engine beneath the mod, the test's `$`
// makes every call as the REPL does. The kit's `$.tool.call` still drops `agentId` (a kit
// limit, not the engine's), so the subagent loop and by-identity returns live in tests/register.test.ts,
// which drives the real register.tsx.
// L3 write then turn.complete, L4 look-alike paths, L5 denied / isError, L7 failed copy, L8 once per changed pickup,
// L10 the desktop start (surface null, isInteractive false) still copies, plus the status line clearing.
//
// The mod's work runs DETACHED from turn.complete (a UI call that never answers must not stick a turn), so every
// assertion about what it did waits for it first (`until`), and "nothing happened" is asserted after `settle`.
import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const T0 = Date.parse('2026-10-19T12:00:00Z')
const MIN = 60_000
const pad = (n: number) => String(n).padStart(2, '0')
const local = (ms: number) => `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`

const LAUNCH = '/x/LAUNCH.md'
const PICKUP = 'Read ~/work/20260101-0900_example/CONTRACT.md and execute lane L3.'
const file = (pickup: string, tail = 'g') => ['# Launch: x', '', '## 1. Pickup', '', '```text', pickup, '```', '', '## 2. Goal', tail].join('\n')

type Notify = { text: string; title?: string }
type World = {
  status: (string | undefined)[]
  notifies: Notify[]
  copies: string[]
  reads: string[]
  files: Record<string, string>
  copyResult: unknown
  readDeny: boolean
  toolResult: unknown
}

function world(on: On, o: { files?: Record<string, string>; copyResult?: unknown } = {}) {
  const w: World = { status: [], notifies: [], copies: [], reads: [], files: o.files ?? { [LAUNCH]: file(PICKUP) }, copyResult: o.copyResult ?? { isCopied: true }, readDeny: false, toolResult: undefined }
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
  on('ui.copy', ($, e) => {
    w.copies.push((e as unknown as { text: string }).text)
    return { value: w.copyResult } as never
  })
  on('fs.read', ($, e) => {
    const path = (e as unknown as { path: string }).path
    w.reads.push(path)
    if (w.readDeny || w.files[path] === undefined) return { deny: `ENOENT: ${path}` } as never
    return { value: w.files[path] } as never
  })
  // core's answer to a tool.call: `{ ref, result, text }` (or the same with isError)
  on('tool.call', () => (w.toolResult ?? { ref: 1, result: {}, text: 'ok' }) as never)
  on('session.start', ($, e) => ({ cwd: e.cwd }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  return { w, clock }
}

/** One yield to the engine: a real timer when the test runtime has one, else a round trip through `$`. */
async function yieldOnce($: any) {
  const st = (globalThis as { setTimeout?: (f: () => void, ms: number) => unknown }).setTimeout
  if (typeof st === 'function') await new Promise<void>(r => { st(r, 1) })
  else await $.session.cwd()
}
async function until($: any, done: () => boolean, rounds = 400): Promise<boolean> {
  for (let i = 0; i < rounds && !done(); i++) await yieldOnce($)
  return done()
}
async function settle($: any, rounds = 40) {
  for (let i = 0; i < rounds; i++) await yieldOnce($)
}

const START = { cwd: '/tmp', surface: null, isInteractive: false }
const TURN = { answer: 'done', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer' } as never
const write = ($: any, path: string) => $.tool.call({ tool: 'Write', file_path: path, content: 'x' } as never)
const edit = ($: any, path: string) => $.tool.call({ tool: 'Edit', file_path: path, old_string: 'a', new_string: 'b' } as never)
const quiet = (w: World) => [w.reads, w.copies, w.notifies, w.status].every(a => a.length === 0)

describe('L3 a write to LAUNCH.md, then the end of the turn', () => {
  test('exactly one copy with the pickup, one notify, one status', async ($, on) => {
    const { w } = world(on)
    await $.session.start(START)
    await write($, LAUNCH)
    await settle($, 5)
    expect(w.copies).toEqual([]) // nothing is copied inside the tool call, nor before the turn ends
    await $.turn.complete(TURN)
    expect(await until($, () => w.status.length >= 1 && w.notifies.length >= 1)).toBe(true)
    await settle($)
    expect(w.reads).toEqual([LAUNCH])
    expect(w.copies).toEqual([PICKUP])
    expect(w.notifies).toEqual([{ text: 'Launch brief ready: pickup copied. Open a new chat and paste.', title: 'launch-copy' }])
    expect(w.status).toEqual([`launch-copy · pickup copied ${local(T0)}`])
  })
  test('the tool call itself is untouched: it resolves to what core answered', async ($, on) => {
    const { w } = world(on)
    w.toolResult = { ref: 7, result: { type: 'update' }, text: 'core said this' }
    const r = await write($, LAUNCH)
    expect(r).toEqual({ ref: 7, result: { type: 'update' }, text: 'core said this' })
  })
  test('an Edit counts like a Write', async ($, on) => {
    const { w } = world(on)
    await edit($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.copies.length >= 1)).toBe(true)
    expect(w.copies).toEqual([PICKUP])
  })
})

describe('L4 look-alike paths and other tools do nothing', () => {
  test('LAUNCH.md.bak, MY-LAUNCH.md, launch.md, LAUNCH.mdx', async ($, on) => {
    const files = Object.fromEntries(['/x/LAUNCH.md.bak', '/x/MY-LAUNCH.md', '/x/launch.md', '/x/LAUNCH.mdx'].map(p => [p, file(PICKUP)]))
    const { w } = world(on, { files })
    for (const p of Object.keys(files)) await write($, p)
    await $.turn.complete(TURN)
    await settle($)
    expect(quiet(w)).toBe(true)
  })
  test('a Read of LAUNCH.md and a Bash command naming it are not writes', async ($, on) => {
    const { w } = world(on)
    await $.tool.call({ tool: 'Read', file_path: LAUNCH } as never).catch(() => {})
    await $.tool.call({ tool: 'Bash', command: `cat > ${LAUNCH}` } as never).catch(() => {})
    await $.turn.complete(TURN)
    await settle($)
    expect(quiet(w)).toBe(true)
  })
})

describe('L5 a call that did not happen does nothing', () => {
  test('an isError result', async ($, on) => {
    const { w } = world(on)
    w.toolResult = { ref: 1, result: {}, text: 'File has not been read yet', isError: true }
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    await settle($)
    expect(quiet(w)).toBe(true)
  })
  test('a deny result (the call is refused beneath the mod)', async ($, on) => {
    const { w } = world(on)
    w.toolResult = { deny: 'refused by the test world' }
    await write($, LAUNCH).catch(() => {})
    await $.turn.complete(TURN)
    await settle($)
    expect(quiet(w)).toBe(true)
  })
})

describe('L7 a failed copy names the path and the reason', () => {
  test('isCopied false, no-surface', async ($, on) => {
    const { w } = world(on, { copyResult: { isCopied: false, reason: 'no-surface' } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.notifies.length >= 1 && w.status.length >= 1)).toBe(true)
    expect(w.notifies).toEqual([{ text: `Launch brief ready, but the copy failed (no-surface). Pickup is in ${LAUNCH} under "## 1. Pickup".`, title: 'launch-copy' }])
    expect(w.status).toEqual([`launch-copy · copy failed (no-surface) ${local(T0)}`])
  })
  test('an unreadable file is the no-pickup branch', async ($, on) => {
    const { w } = world(on)
    w.readDeny = true
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.notifies.length >= 1)).toBe(true)
    expect(w.copies).toEqual([])
    expect(w.notifies[0].text).toBe(`LAUNCH.md written, but no Pickup block was found (could not read): ${LAUNCH}`)
    expect(w.status).toEqual([`launch-copy · no pickup ${local(T0)}`])
  })
})

describe('L8 once per changed pickup', () => {
  test('two Edits in one turn: one copy; an unchanged pickup later: none; a changed one: copied again', async ($, on) => {
    const { w } = world(on)
    await edit($, LAUNCH)
    await edit($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.copies.length >= 1)).toBe(true)
    await settle($)
    expect(w.copies).toEqual([PICKUP])
    expect(w.notifies.length).toBe(1)

    w.files[LAUNCH] = file(PICKUP, 'goal reworded')
    await edit($, LAUNCH)
    await $.turn.complete(TURN)
    await settle($)
    expect(w.copies.length).toBe(1)
    expect(w.notifies.length).toBe(1)

    w.files[LAUNCH] = file('A changed pickup line.')
    await edit($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.copies.length >= 2)).toBe(true)
    await settle($)
    expect(w.copies).toEqual([PICKUP, 'A changed pickup line.'])
    expect(w.notifies.length).toBe(2)
  })
})

describe('L10 the desktop start still copies', () => {
  test('session.start with surface null and isInteractive false', async ($, on) => {
    const { w } = world(on)
    expect(await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })).toEqual({ cwd: '/tmp' })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.copies.length >= 1)).toBe(true)
    expect(w.copies).toEqual([PICKUP])
  })
  test('a terminal start copies too (no gate on the surface either way)', async ($, on) => {
    const { w } = world(on)
    await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.copies.length >= 1)).toBe(true)
  })
})

// F7 the kit CAN set the plugin's userConfig: `test(name, { options }, body)` (TestOptions.options, d.ts). Each mode goes
// through the engine's options, which are validated and have their defaults filled in before `register(on, options)`.
describe('F7 modes through the kit options', () => {
  test('mode notify: no copy, the notification names the path, the brief-ready line', { options: { mode: 'notify' } }, async ($, on) => {
    const { w } = world(on)
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.notifies.length >= 1 && w.status.length >= 1)).toBe(true)
    await settle($)
    expect(w.reads).toEqual([LAUNCH])
    expect(w.copies).toEqual([])
    expect(w.notifies).toEqual([{ text: `Launch brief ready: ${LAUNCH}. Copy its Pickup block into a new chat.`, title: 'launch-copy' }])
    expect(w.status).toEqual([`launch-copy · brief ready ${local(T0)}`])
  })
  for (const mode of ['off', 'garbage', 'Copy', '']) {
    test(`mode ${JSON.stringify(mode)} is off: no read, no copy, no notify, no status`, { options: { mode } }, async ($, on) => {
      const { w } = world(on)
      const r = await write($, LAUNCH)
      expect(r).toEqual({ ref: 1, result: {}, text: 'ok' }) // the call itself is untouched
      await $.turn.complete(TURN)
      await settle($)
      expect(quiet(w)).toBe(true)
    })
  }
  test('mode copy, set explicitly, is the default behaviour', { options: { mode: 'copy' } }, async ($, on) => {
    const { w } = world(on)
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.copies.length >= 1)).toBe(true)
    expect(w.copies).toEqual([PICKUP])
  })
})

// M9 lane awareness through the engine kit: the lane is read from the Stamp section of the file the kit's `fs.read` serves.
describe('X3 the lane decides whether the clipboard is touched (engine kit)', () => {
  const stamped = (lane: string) => `${file(PICKUP)}\n\n## 12. Stamp\nwritten: 2026-01-15T09:00Z (previous chat, closing) · lane ${lane} · re-probe any dated claim before acting.`
  // One lane per test: a kit world registers its `on` handlers on the test's engine, so two worlds in one test would stack.
  test('lane L3c: no ui.copy event at all, one notify naming the lane and the path, the lane status', async ($, on) => {
    const { w } = world(on, { files: { [LAUNCH]: stamped('L3c') } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.status.length >= 1 && w.notifies.length >= 1)).toBe(true)
    await settle($)
    expect(w.copies).toEqual([])
    expect(w.notifies).toEqual([{ text: `Launch brief ready (lane L3c: this chat starts it, nothing to paste): ${LAUNCH}`, title: 'launch-copy' }])
    expect(w.status).toEqual([`launch-copy · lane L3c, nothing to paste ${local(T0)}`])
  })
  test('lane L1: the same', async ($, on) => {
    const { w } = world(on, { files: { [LAUNCH]: stamped('L1') } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.status.length >= 1 && w.notifies.length >= 1)).toBe(true)
    await settle($)
    expect(w.copies).toEqual([])
    expect(w.notifies).toEqual([{ text: `Launch brief ready (lane L1: this chat starts it, nothing to paste): ${LAUNCH}`, title: 'launch-copy' }])
    expect(w.status).toEqual([`launch-copy · lane L1, nothing to paste ${local(T0)}`])
  })
  test('lane L2 copies and says the /compact line is copied', async ($, on) => {
    const { w } = world(on, { files: { [LAUNCH]: stamped('L2') } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.status.length >= 1 && w.notifies.length >= 1)).toBe(true)
    expect(w.copies).toEqual([PICKUP])
    expect(w.notifies).toEqual([{ text: 'Launch brief ready: the /compact line is copied. Paste it in this chat and send go.', title: 'launch-copy' }])
    expect(w.status).toEqual([`launch-copy · /compact line copied ${local(T0)}`])
  })
  test('lane L3 and a brief with no Stamp: today\'s copy and wording', async ($, on) => {
    const { w } = world(on, { files: { [LAUNCH]: stamped('L3') } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.status.length >= 1 && w.notifies.length >= 1)).toBe(true)
    expect(w.copies).toEqual([PICKUP])
    expect(w.notifies).toEqual([{ text: 'Launch brief ready: pickup copied. Open a new chat and paste.', title: 'launch-copy' }])
  })
  test('notify mode with lane L3c: the lane notice, still no copy', { options: { mode: 'notify' } }, async ($, on) => {
    const { w } = world(on, { files: { [LAUNCH]: stamped('L3c') } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.notifies.length >= 1)).toBe(true)
    await settle($)
    expect(w.copies).toEqual([])
    expect(w.notifies[0].text).toBe(`Launch brief ready (lane L3c: this chat starts it, nothing to paste): ${LAUNCH}`)
  })
  test('off with lane L3c: nothing at all', { options: { mode: 'off' } }, async ($, on) => {
    const { w } = world(on, { files: { [LAUNCH]: stamped('L3c') } })
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    await settle($)
    expect(quiet(w)).toBe(true)
  })
})

describe('the status line clears after ten minutes', () => {
  test('nine minutes: still drawn; ten: cleared', async ($, on) => {
    const { w, clock } = world(on)
    await write($, LAUNCH)
    await $.turn.complete(TURN)
    expect(await until($, () => w.status.length >= 1)).toBe(true)
    await clock.advance(9 * MIN)
    await settle($, 5)
    expect(w.status.length).toBe(1)
    await clock.advance(MIN + 1)
    expect(await until($, () => w.status.length >= 2)).toBe(true)
    expect(w.status[1]).toBeUndefined()
  })
})
