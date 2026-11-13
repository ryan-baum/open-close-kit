// Shared fakes for the controller tests and the register harness: a fake clock whose `after` timers `advance` steps
// through in due order (or `jump` moves without firing on the way, a sleeping machine), and fake ports over an
// in-memory model. No `$` anywhere.
import { EMPTY_MODEL, localDay, localHHMM, type Model } from '../hooks/lib/warm'
import type { Ports } from '../hooks/lib/controller'

export const MIN = 60_000
export const H = 3_600_000
/** Built from local-time parts so day-boundary tests do not depend on the machine's time zone. */
export const at = (h: number, m = 0, dayOfMonth = 19) => new Date(2026, 9, dayOfMonth, h, m, 0).getTime()
/** Independent oracle for the local HH:MM the status line shows. */
export const local = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Timer = { due: number; fn: () => void; live: boolean }

export class FakeClock {
  now: number
  timers: Timer[] = []
  constructor(start: number) {
    this.now = start
  }
  /** The `ms` of every `after` call, in order (F2: no delay may overflow a 32-bit timer). */
  delays: number[] = []
  after = (ms: number, fn: () => void) => {
    this.delays.push(ms)
    const t: Timer = { due: this.now + Math.max(0, ms), fn, live: true }
    this.timers.push(t)
    return {
      cancel: () => {
        t.live = false
      },
    }
  }
  live(): number {
    return this.timers.filter(t => t.live).length
  }
  async settle() {
    for (let i = 0; i < 300; i++) await Promise.resolve()
  }
  async advance(ms: number) {
    const target = this.now + ms
    for (let guard = 0; guard < 100_000; guard++) {
      let due: Timer | undefined
      for (const t of this.timers) if (t.live && t.due <= target && (due === undefined || t.due < due.due)) due = t
      if (due === undefined) break
      due.live = false
      this.now = Math.max(this.now, due.due)
      due.fn()
      await this.settle()
    }
    this.now = target
    await this.settle()
  }
  /** A timer that fires EARLY (a 32-bit overflow does this in ~2 ms): the earliest live one runs now, time unmoved. */
  async fireNext() {
    let first: Timer | undefined
    for (const t of this.timers) if (t.live && (first === undefined || t.due < first.due)) first = t
    if (first === undefined) return
    first.live = false
    first.fn()
    await this.settle()
  }
  /** A sleeping machine: time moves, then every live timer that came due fires once, late. */
  async jump(ms: number) {
    this.now += ms
    for (const t of this.timers.filter(x => x.live && x.due <= this.now)) {
      t.live = false
      t.fn()
      await this.settle()
    }
    await this.settle()
  }
}

/** 'manual': the call stays pending until the test calls `settleRuns()` (a healthy close that takes minutes). */
export type RunMode = 'resolve' | 'hang' | 'reject' | 'throw' | 'manual'
export type NotifyMode = 'ok' | 'reject' | 'hang'

export type Rig = {
  clock: FakeClock
  ports: Ports
  runs: [string, string][]
  notifies: [string, string][]
  status: (string | undefined)[]
  /** What `update` was asked to write, in order. */
  writes: Model[]
  /** The order of port calls that matter: 'notify', 'run'. */
  order: string[]
  runMode: RunMode
  notifyMode: NotifyMode
  /** `update` throws (the state op is denied). */
  updateFails: boolean
  /** The model at the moment each run was called. */
  modelAtRun: Model[]
  /** Resolves every call made in 'manual' mode. */
  settleRuns: () => Promise<void>
  pendingRuns: (() => void)[]
  model: () => Model
  setModel: (m: Model) => void
  /** `now` rejects or returns this. */
  nowOverride?: number | 'reject'
}

export function rig(start: number = at(14, 0)): Rig {
  const clock = new FakeClock(start)
  let model: Model = { ...EMPTY_MODEL }
  const r: Rig = {
    clock,
    runs: [],
    notifies: [],
    status: [],
    writes: [],
    order: [],
    runMode: 'resolve',
    notifyMode: 'ok',
    updateFails: false,
    modelAtRun: [],
    pendingRuns: [],
    settleRuns: async () => {
      for (const f of r.pendingRuns.splice(0)) f()
      await clock.settle()
    },
    model: () => model,
    setModel: m => {
      model = m
    },
    ports: undefined as never,
  }
  r.ports = {
    now: async () => {
      if (r.nowOverride === 'reject') throw new Error('clock denied')
      return r.nowOverride ?? clock.now
    },
    after: clock.after,
    read: async () => model,
    update: async fn => {
      if (r.updateFails) throw new Error('state denied')
      model = JSON.parse(JSON.stringify(fn(model)))
      r.writes.push(model)
      return model
    },
    status: t => {
      r.status.push(t)
    },
    notify: (text, title) => {
      r.order.push('notify')
      r.notifies.push([text, title])
      if (r.notifyMode === 'reject') return Promise.reject(new Error('notify refused'))
      if (r.notifyMode === 'hang') return new Promise(() => {})
      return Promise.resolve({ isSent: false, reason: 'disabled' })
    },
    run: (command, args) => {
      r.order.push('run')
      r.runs.push([command, args])
      r.modelAtRun.push(JSON.parse(JSON.stringify(model)))
      if (r.runMode === 'throw') throw new Error('unknown command')
      if (r.runMode === 'reject') return Promise.reject(new Error('unknown command'))
      if (r.runMode === 'hang') return new Promise(() => {})
      if (r.runMode === 'manual') return new Promise<void>(res => r.pendingRuns.push(res))
      return Promise.resolve({})
    },
    fmt: localHHMM,
    day: localDay,
  }
  return r
}

export const lastStatus = (r: Rig) => r.status[r.status.length - 1]
