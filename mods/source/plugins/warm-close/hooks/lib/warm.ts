// warm-close: the pure decisions. No `$`, no clock reads: every time comes in as an argument.
import type { Model } from '../../types'

export type { Model }

export type Mode = 'submit' | 'notify' | 'off'
export type Options = {
  mode: Mode
  ttlMinutes: number
  marginMinutes: number
  minTurns: number
  maxPerDay: number
  /** How long after a child session is started or messaged the idle close is held; 0 = no hold. */
  childHoldMinutes: number
}

export const DEFAULT_OPTIONS: Options = { mode: 'submit', ttlMinutes: 60, marginMinutes: 8, minTurns: 3, maxPerDay: 6, childHoldMinutes: 120 }

/** The child-hold option clamps to [0, HOLD_MAX] minutes. */
export const HOLD_MAX = 1440
/** The tool that starts a child session (desktop `start_session`). */
export const CHILD_START_TOOL = 'mcp__ccd_session__start_session'
/** The status line at a fire that was held. */
export const HELD_LINE = 'warm-close · held, child session running'

/** The slash command the mod runs, exactly as the spec fixes it. */
export const CLOSE = { command: 'close', args: 'conversation --checkpoint' } as const

export const MSG = {
  title: 'warm-close',
  submit: 'Closing this conversation while its cache is warm: /close conversation --checkpoint',
  // notify mode submits nothing, so the spec's "Closing…" wording would be false there
  notify: 'Cache about to lapse: run /close conversation --checkpoint while it is still warm',
}

/**
 * How long after the call, with no turn, no prompt and no answer, the call counts as held. 180 s, not 90:
 * a healthy close that takes a couple of minutes to answer must not be run twice.
 */
export const GUARD_MS = 180_000
/** A timer that fires more than this long before its deadline fired early (a 32-bit overflow fires in ~2 ms). */
export const EARLY_MS = 5_000
/** The prompt-cache TTL option is clamped to this range: a 32-bit timer overflows near 35,791 minutes. */
export const TTL_MIN = 5
export const TTL_MAX = 1440
/** How long the "closed" status line stays after a fire. */
export const CLOSED_MS = 10 * 60_000

const MIN = 60_000

export const EMPTY_MODEL: Model = { personTurns: 0, personTurnsAtLastClose: 0, inFlight: 0, closes: 0 }

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : fallback
}

/**
 * The options as `register(on, options)` receives them. `mode`: exactly `submit` or `notify`, absent = the default
 * `submit` (on by default), anything else present = `off`. Numbers: finite only, whole (floored), else the default; the
 * ttl clamps to [5, 1440] (a longer wait overflows a 32-bit timer and fires at once); the margin clamps to
 * [1, ttl - 1]; minTurns is at least 1 (0 would let a close follow a close); maxPerDay is at least 0 (0 = none).
 */
export function readOptions(raw: unknown): Options {
  const r = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const mode: Mode = r.mode === undefined ? DEFAULT_OPTIONS.mode : r.mode === 'submit' || r.mode === 'notify' ? r.mode : 'off'
  const ttlMinutes = Math.min(Math.max(num(r.ttlMinutes, DEFAULT_OPTIONS.ttlMinutes), TTL_MIN), TTL_MAX)
  const marginMinutes = Math.min(Math.max(num(r.marginMinutes, DEFAULT_OPTIONS.marginMinutes), 1), ttlMinutes - 1)
  const minTurns = Math.max(1, num(r.minTurns, DEFAULT_OPTIONS.minTurns))
  const maxPerDay = Math.max(0, num(r.maxPerDay, DEFAULT_OPTIONS.maxPerDay))
  return { mode, ttlMinutes, marginMinutes, minTurns, maxPerDay, childHoldMinutes: holdOption(r.childHoldMinutes) }
}

/**
 * `childHoldMinutes`: absent = the default (120); a number is floored and clamped to [0, 1440]; 0, a negative number, NaN
 * and every non-number (a string, null, a boolean…) DISABLE the hold, they do not fall back to the default.
 */
function holdOption(v: unknown): number {
  if (v === undefined) return DEFAULT_OPTIONS.childHoldMinutes
  if (typeof v !== 'number' || Number.isNaN(v)) return 0
  return Math.floor(Math.min(Math.max(v, 0), HOLD_MAX))
}

/** The hold is on only for a positive number of minutes. */
export function holdEnabled(o: Options): boolean {
  return o.childHoldMinutes > 0
}

/** How long a child call holds the close, in ms. */
export function holdMs(o: Options): number {
  return o.childHoldMinutes * MIN
}

/**
 * True while a hold is switched on AND recorded as still in the future at `now` AND no further away than the configured
 * hold: a stored value more than `childHoldMinutes` ahead (garbage, or written under a larger setting) is not a hold. A
 * real hold is never further away than that: it is written as `now + holdMs` and only shrinks as time passes.
 */
export function holdActive(m: Model, o: Options, now: number): boolean {
  if (!holdEnabled(o) || !Number.isFinite(now) || m.holdUntil === undefined) return false
  return m.holdUntil > now && m.holdUntil - now <= holdMs(o)
}

/**
 * A `start_session` call that starts a session. The tool's `initiation` says whether it starts one or only shows a card:
 * `user_asked` starts one; `offer` and `own_initiative` only show a card (the person accepts it later) unless the input
 * carries a non-empty string `proposal_id`, which starts one too. A `cloud` target never wakes this conversation.
 */
function startsSession(x: Record<string, unknown>): boolean {
  if (x.target === 'cloud') return false
  if (x.initiation === 'user_asked') return true
  return typeof x.proposal_id === 'string' && x.proposal_id !== ''
}

/**
 * Did this finished `tool.call` start or message a CHILD session? `e` is the call, `result` what `next(e)` resolved to.
 * A child: a `start_session` that starts a session (see `startsSession`: not a card, not a cloud child), or `SendMessage`
 * whose `to` is a desktop session id (a string starting `local_`; a subagent's name or id is not one). A call that was
 * denied, reported an error, or ran in a subagent's loop is nothing. The main loop is `agentId` null or undefined; any
 * other `agentId` is a subagent's loop (`turn.complete` keeps its own, stricter test and is left as it is).
 */
export function isChildCall(e: unknown, result: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false
  const x = e as Record<string, unknown>
  if (x.agentId != null) return false
  if (typeof result === 'object' && result !== null) {
    const r = result as Record<string, unknown>
    if (r.deny !== undefined || r.isError === true) return false
  }
  if (x.tool === CHILD_START_TOOL) return startsSession(x)
  if (x.tool === 'SendMessage') return typeof x.to === 'string' && x.to.startsWith('local_')
  return false
}

/**
 * A prompt that ends the hold: a child's report (`sdk`) and nothing else. A typed prompt (`composer`) does not: the user asking
 * "status?" while the child runs must not let the conductor be closed an idle period later. The hold still ends at its
 * expiry, at `session.start` / `session.end`, and when the option is switched off.
 */
export function clearsHold(origin: unknown): boolean {
  if (typeof origin !== 'object' || origin === null) return false
  return (origin as { kind?: unknown }).kind === 'sdk'
}

/** How long after the last turn the close fires, in ms. */
export function delayMs(o: Options): number {
  return (o.ttlMinutes - o.marginMinutes) * MIN
}

const nat = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
const finite = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** What `$.state` returned, made safe: junk is the empty model, a bad field is dropped. */
export function coerceModel(x: unknown): Model {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { ...EMPTY_MODEL }
  const o = x as Record<string, unknown>
  const m: Model = {
    personTurns: nat(o.personTurns),
    personTurnsAtLastClose: nat(o.personTurnsAtLastClose),
    inFlight: nat(o.inFlight),
    closes: nat(o.closes),
  }
  const t = finite(o.lastTurnAt)
  if (t !== undefined) m.lastTurnAt = t
  if (typeof o.day === 'string') m.day = o.day
  const f = finite(o.lastFireAt)
  if (f !== undefined) m.lastFireAt = f
  const h = finite(o.holdUntil)
  if (h !== undefined) m.holdUntil = h
  return m
}

/** A prompt the person typed: the composer, and nothing else (SDK, bridge, plugin, scheduled, peer, task). */
export function isPersonPrompt(origin: unknown): boolean {
  if (typeof origin !== 'object' || origin === null) return false
  return (origin as { kind?: unknown }).kind === 'composer'
}

/** Closes recorded on `day`; a model counting another day has none on this one. */
export function closesOn(m: Model, day: string): number {
  return m.day === day ? m.closes : 0
}

export type Why = 'off' | 'busy' | 'no-turn' | 'no-person-turns' | 'few-turns' | 'cap'
export type Verdict = { ok: true } | { ok: false; why: Why }

/** Every condition for a close that is not about the clock. `day` is the local day the close would land on. */
export function verdict(m: Model, o: Options, day: string): Verdict {
  if (o.mode === 'off') return { ok: false, why: 'off' }
  if (m.inFlight > 0) return { ok: false, why: 'busy' }
  if (m.lastTurnAt === undefined) return { ok: false, why: 'no-turn' }
  if (m.personTurns < 1) return { ok: false, why: 'no-person-turns' }
  if (m.personTurns - m.personTurnsAtLastClose < o.minTurns) return { ok: false, why: 'few-turns' }
  if (closesOn(m, day) >= o.maxPerDay) return { ok: false, why: 'cap' }
  return { ok: true }
}

/** True when the prompt cache has already lapsed (or cannot be known to be warm) at `now`. */
export function cacheLapsed(m: Model, o: Options, now: number): boolean {
  if (m.lastTurnAt === undefined || !Number.isFinite(now)) return true
  return now >= m.lastTurnAt + o.ttlMinutes * MIN
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Local HH:MM. */
export function localHHMM(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local calendar day, `YYYY-MM-DD`. */
export function localDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export type FireInfo = { at: number; mode: Mode; retriedAt?: number; failed: boolean }

/**
 * The one status line: `warm-close · closed 14:52` for ten minutes after a fire (with ` · retried 14:54` after the
 * second call, `close failed 14:52` when the call was refused, `notified 14:52` in notify mode), else
 * `warm-close · armed 14:52` (the time it will fire) while a timer is armed, else nothing. `held` (a fire that was skipped
 * because a child session is running) wins over all of them until a turn or a prompt redraws the line.
 */
export function statusLine(s: { dueAt: number | null; fire: FireInfo | null; now: number; held?: boolean }, fmt: (ms: number) => string): string | undefined {
  if (s.held === true) return HELD_LINE
  const f = s.fire
  if (f !== null && s.now - f.at < CLOSED_MS) {
    if (f.failed) return `warm-close · close failed ${fmt(f.at)}`
    if (f.mode === 'notify') return `warm-close · notified ${fmt(f.at)}`
    return `warm-close · closed ${fmt(f.at)}${f.retriedAt === undefined ? '' : ` · retried ${fmt(f.retriedAt)}`}`
  }
  if (s.dueAt !== null) return `warm-close · armed ${fmt(s.dueAt)}`
  return undefined
}
