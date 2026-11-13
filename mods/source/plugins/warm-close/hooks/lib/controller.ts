// warm-close: the timer, the fire and the retry guard, over explicit ports (no `$`), so tests drive it with a fake clock.
//
// One timer is armed per idle period: a main-conversation turn.complete (re)arms it for `lastTurnAt + ttl - margin`; a
// prompt entering the session cancels it. When it fires, state is re-read and every condition re-checked, the fire is
// recorded in state BEFORE the call (a crash after that point never double-fires), then one notification and one
// `/close conversation --checkpoint`. The call is never awaited on the controller's queue: a held call must
// not stall the next turn. If nothing happened 90 s later (no turn completed, no prompt entered, the call neither
// resolved nor refused) the call is made once more; never a third time.
//
// Child hold (lane L3c): `onChild` records `holdUntil = now + childHoldMinutes` when the conversation started or messaged
// a child session; at the fire, a hold still in the future (and no further away than the configured hold) skips the close
// entirely (no notification, no call, no write). A prompt of origin `sdk` (a child reported) clears it, a typed prompt does
// not; so does a reset. A main-conversation `turn.complete` that ends a turn in which a child was called re-anchors the hold
// at the end of that turn, so a conductor that kept working past `childHoldMinutes` after the call still holds at the fire.
import {
  CLOSE,
  CLOSED_MS,
  EARLY_MS,
  EMPTY_MODEL,
  GUARD_MS,
  MSG,
  cacheLapsed,
  clearsHold,
  delayMs,
  holdActive,
  holdEnabled,
  holdMs,
  isPersonPrompt,
  statusLine,
  verdict,
  type FireInfo,
  type Model,
  type Options,
} from './warm'

export type Timer = { cancel: () => void }

export type Ports = {
  now: () => Promise<number>
  /** One-shot timer; `cancel()` stops it. */
  after: (ms: number, fn: () => void) => Timer
  read: () => Promise<Model>
  /** Reads, applies `fn`, writes, returns the new model (retries on a version miss). */
  update: (fn: (m: Model) => Model) => Promise<Model>
  status: (text: string | undefined) => void
  /** The result is ignored by the controller. */
  notify: (text: string, title: string) => Promise<unknown>
  run: (command: string, args: string) => Promise<unknown>
  /** Local HH:MM. */
  fmt: (ms: number) => string
  /** Local day key. */
  day: (ms: number) => string
}

type Fire = { info: FireInfo; turns: number; prompts: number; settled: boolean; retried: boolean }

/** How many times one arming may re-arm itself after firing early before it gives up (it never fires early). */
const MAX_REARMS = 10

export class WarmController {
  /** Prompts whose `next(e)` has not resolved yet, bumped synchronously: a prompt entering is not idle (F5). */
  private entering = 0
  private rearms = 0
  private timer: Timer | null = null
  /** The `lastTurnAt` the armed timer belongs to; a callback from any other arming is stale. */
  private armedFor: number | null = null
  private dueAt: number | null = null
  private guardTimer: Timer | null = null
  private closedTimer: Timer | null = null
  private fire: Fire | null = null
  private turns = 0
  private prompts = 0
  private drawn: string | undefined = undefined
  /** The last fire was skipped because a child session is running; any turn, prompt, manual close or reset ends it. */
  private held = false
  /** A child call happened in the current turn: its `turn.complete` (main loop) re-anchors the hold, then clears this. */
  private childThisTurn = false
  private latch: Promise<unknown> = Promise.resolve()

  constructor(readonly o: Options) {}

  isArmed(): boolean {
    return this.timer !== null
  }

  /** One controller step at a time; a failed step never blocks the next. */
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.latch.then(fn, fn)
    this.latch = run.catch(() => undefined)
    return run
  }

  private async tryNow(p: Ports): Promise<number> {
    try {
      const n = await p.now()
      return Number.isFinite(n) ? n : Number.NaN
    } catch {
      return Number.NaN
    }
  }

  private draw(p: Ports, now: number): void {
    const text = statusLine({ dueAt: this.dueAt, fire: this.fire === null ? null : this.fire.info, now, held: this.held }, p.fmt)
    if (text === this.drawn) return
    this.drawn = text
    try {
      p.status(text)
    } catch {
      // a status line that cannot be drawn changes nothing else
    }
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.timer.cancel()
    this.timer = null
    this.armedFor = null
    this.dueAt = null
  }

  private cancelGuard(): void {
    if (this.guardTimer !== null) this.guardTimer.cancel()
    this.guardTimer = null
  }

  private cancelClosed(): void {
    if (this.closedTimer !== null) this.closedTimer.cancel()
    this.closedTimer = null
  }

  /** session.start / session.end: forget the conversation. Timers and the line go first, so a failing write leaves nothing armed. */
  reset(p: Ports): Promise<void> {
    return this.serial(async () => {
      this.cancelTimer()
      this.cancelGuard()
      this.cancelClosed()
      this.fire = null
      this.held = false
      this.childThisTurn = false
      this.turns = 0
      this.prompts = 0
      this.drawn = undefined
      try {
        p.status(undefined)
      } catch {
        // see draw
      }
      await p.update(() => ({ ...EMPTY_MODEL }))
    })
  }

  /**
   * A prompt is about to enter the session (call SYNCHRONOUSLY, before `next(e)`): until `endPrompt` a timer or a retry
   * that comes due will not close over it. Pair with `endPrompt` in a `finally`.
   */
  beginPrompt(): void {
    this.entering++
  }

  endPrompt(): void {
    if (this.entering > 0) this.entering--
  }

  /**
   * A prompt entered the session (call after the chain answered; `dropped` = a hook refused it). Not idle until its
   * turn completes. `midTurn` = it was typed while a turn ran (the event carries a `turnId`): it queues behind that
   * turn, so it adds to the count. A prompt typed while idle resets the count to 1: any older count is stale (a prompt
   * merged into a running turn never gets a turn.complete of its own).
   */
  onPrompt(p: Ports, origin: unknown, dropped: boolean, midTurn = false): Promise<void> {
    return this.serial(async () => {
      if (this.o.mode === 'off' || dropped) return
      this.prompts++
      this.held = false
      this.cancelTimer()
      const person = isPersonPrompt(origin)
      // a child's report (sdk) ends the hold; any other origin, a typed prompt included, leaves it as it was
      const clear = clearsHold(origin)
      await p.update(m => {
        const next = { ...m, personTurns: m.personTurns + (person ? 1 : 0), inFlight: midTurn ? m.inFlight + 1 : 1 }
        if (clear) delete next.holdUntil
        return next
      })
      this.draw(p, await this.tryNow(p))
    })
  }

  /**
   * A child session was started or messaged from this conversation (the caller has already judged the tool call with
   * `isChildCall`): the conversation is the conductor waiting, so hold the idle close until `now + childHoldMinutes`. One
   * hold for any number of children. A disabled hold (0) and mode off do nothing at all, not even a state read. The call
   * also marks the current turn, so its `turn.complete` re-anchors the hold (see `onTurn`); the mark is set before the
   * clock and the write, so a call whose own write failed is still anchored at the end of the turn.
   */
  onChild(p: Ports): Promise<void> {
    return this.serial(async () => {
      if (this.o.mode === 'off' || !holdEnabled(this.o)) return
      this.childThisTurn = true
      const now = await this.tryNow(p)
      if (!Number.isFinite(now)) return
      const until = now + holdMs(this.o)
      await p.update(m => ({ ...m, holdUntil: until }))
    })
  }

  /** A manual `/close` (any arguments) ran: the conversation is closed as of its person turns so far. */
  onManualClose(p: Ports): Promise<void> {
    return this.serial(async () => {
      if (this.o.mode === 'off') return
      this.held = false
      this.cancelTimer()
      await p.update(m => ({ ...m, personTurnsAtLastClose: m.personTurns }))
      this.draw(p, await this.tryNow(p))
    })
  }

  /** A main-conversation turn completed: the cache was just refreshed, so (re)arm for ttl - margin from now. */
  onTurn(p: Ports): Promise<void> {
    return this.serial(async () => {
      if (this.o.mode === 'off') return
      this.turns++
      this.held = false
      this.cancelTimer()
      const now = await this.tryNow(p)
      if (!Number.isFinite(now)) {
        this.draw(p, now)
        return
      }
      // one turn.complete retires one prompt; the conversation is idle only when none is left in flight. When a child was
      // called in this turn the hold is re-anchored at its end (never shortened): a conductor that kept working longer than
      // `childHoldMinutes` after the call must still be held at the fire. The mark is cleared once the write has landed.
      const anchor = this.childThisTurn
      const until = now + holdMs(this.o)
      const m = await p.update(x => {
        const n = { ...x, lastTurnAt: now, inFlight: Math.max(0, x.inFlight - 1) }
        if (anchor) n.holdUntil = Math.max(x.holdUntil ?? Number.NEGATIVE_INFINITY, until)
        return n
      })
      if (anchor) this.childThisTurn = false
      const due = now + delayMs(this.o)
      if (verdict(m, this.o, p.day(due)).ok) {
        this.dueAt = due
        this.armedFor = now
        this.rearms = 0
        this.armTimer(p, now, due - now)
      }
      this.draw(p, now)
    })
  }

  private armTimer(p: Ports, armedFor: number, ms: number): void {
    this.timer = p.after(ms, () => {
      this.serial(() => this.onTimer(p, armedFor)).catch(() => undefined)
    })
  }

  private async onTimer(p: Ports, armedFor: number): Promise<void> {
    if (this.armedFor !== armedFor) return
    const now = await this.tryNow(p)
    // F2: a timer that fires early (a 32-bit overflow fires in ~2 ms) re-arms for the rest; it never closes early.
    // After MAX_REARMS the arming is dropped: a missed close, never an early one.
    const due = armedFor + delayMs(this.o)
    if (Number.isFinite(now) && now < due - EARLY_MS) {
      if (this.rearms < MAX_REARMS) {
        this.rearms++
        this.armTimer(p, armedFor, due - now)
        return
      }
      this.cancelTimer()
      this.draw(p, now)
      return
    }
    this.timer = null
    this.armedFor = null
    this.dueAt = null
    if (!Number.isFinite(now)) {
      this.draw(p, now)
      return
    }
    const m = await p.read()
    // still idle (no turn recorded since, none in flight, no prompt entering), every condition still true, and the cache
    // not already lapsed (a late timer)
    if (this.entering > 0 || m.lastTurnAt !== armedFor || !verdict(m, this.o, p.day(now)).ok || cacheLapsed(m, this.o, now)) {
      this.draw(p, now)
      return
    }
    // a child session is running: this conversation is the conductor waiting, not idle. A skipped close, not a close: no
    // notification, no call, and no write (the counters and the baseline stay as they are).
    if (holdActive(m, this.o, now)) {
      this.held = true
      this.draw(p, now)
      return
    }
    // record BEFORE the call; a write that fails means no call at all
    try {
      const day = p.day(now)
      await p.update(x => ({
        ...x,
        // the baseline moves to now, so the next close needs minTurns NEW person turns (no loop)
        personTurnsAtLastClose: x.personTurns,
        lastFireAt: now,
        day,
        closes: (x.day === day ? x.closes : 0) + 1,
      }))
    } catch {
      this.draw(p, now)
      return
    }
    const f: Fire = { info: { at: now, mode: this.o.mode, failed: false }, turns: this.turns, prompts: this.prompts, settled: false, retried: false }
    this.fire = f
    this.cancelGuard()
    this.cancelClosed()
    if (this.o.mode === 'submit') {
      this.notify(p, MSG.submit)
      this.call(p, f)
      this.guardTimer = p.after(GUARD_MS, () => {
        this.serial(() => this.onGuard(p, f)).catch(() => undefined)
      })
    } else {
      this.notify(p, MSG.notify)
    }
    this.closedTimer = p.after(CLOSED_MS, () => {
      this.serial(async () => this.draw(p, await this.tryNow(p))).catch(() => undefined)
    })
    this.draw(p, now)
  }

  /** Fire and forget: the result is ignored, a refusal or a hang changes nothing else. */
  private notify(p: Ports, text: string): void {
    try {
      Promise.resolve(p.notify(text, MSG.title)).catch(() => undefined)
    } catch {
      // a notification that cannot be raised is not a reason to skip the close
    }
  }

  /** Never awaited on the queue. A refusal (or a throw) is an answer: it settles the call as failed. */
  private call(p: Ports, f: Fire): void {
    const done = (failed: boolean) => {
      f.settled = true
      f.info.failed = failed
      this.serial(async () => {
        if (this.fire === f) this.draw(p, await this.tryNow(p))
      }).catch(() => undefined)
    }
    try {
      Promise.resolve(p.run(CLOSE.command, CLOSE.args)).then(
        () => done(false),
        () => done(true),
      )
    } catch {
      done(true)
    }
  }

  private async onGuard(p: Ports, f: Fire): Promise<void> {
    if (this.fire !== f) return
    this.guardTimer = null
    if (f.retried || f.settled || this.o.mode !== 'submit') return
    // a turn that completed or ANY prompt that entered (or is entering) since the call is proof the session is alive,
    // and the close's own prompt.submit counts: do not queue a second close
    if (this.turns > f.turns || this.prompts > f.prompts || this.entering > 0) return
    f.retried = true
    const now = await this.tryNow(p)
    if (Number.isFinite(now)) f.info.retriedAt = now
    this.call(p, f)
    this.draw(p, now)
  }
}
