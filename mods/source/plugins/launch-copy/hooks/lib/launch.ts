// Pure logic and the controller for launch-copy. No `$` here: the controller talks to the world through `Ports`, so
// every branch can be tested with fakes. register.tsx is the only place `$` is spelled.
//
// What it does (design note M7): a Write or Edit of a file named LAUNCH.md is remembered ("touched"); at the end of the
// main-loop turn the file is read, its Pickup block is extracted (./pickup) and, unless that exact text was already
// handled for that path, copied to the clipboard (mode copy) or announced (mode notify). Every branch says what
// happened. `$.ui.copy` and `$.ui.notify` are unmeasured on the desktop, so no UI call is ever allowed to block, throw
// into, or outlive its welcome in the hook that started the work.
//
// Lane awareness (design note M9): once a pickup is found the brief's lane is read from its Stamp section
// (./lane). Under L1 (the intake chat dispatches a subagent) and L3c (it starts a native child session) nothing is pasted
// anywhere, so the clipboard is left alone and the notice says so; under L2 the pickup is a /compact line for THIS chat;
// L3 and "no lane" are the original paste-into-a-new-chat behaviour. The "already handled" key is the effective lane
// (no lane = L3) plus the pickup text.
import { extractLane, type Lane } from './lane'
import { extractPickup } from './pickup'

export type Mode = 'copy' | 'notify' | 'off'
export type Options = { mode: Mode }
export const DEFAULT_OPTIONS: Options = { mode: 'copy' }

/** The notification title. */
export const TITLE = 'launch-copy'
/** A status line clears itself this long after it was drawn. */
export const CLEAR_MS = 10 * 60_000
/** A copy that has not answered by now is reported as failed (reason `no answer`) and its claim is released. */
export const COPY_TIMEOUT_MS = 10_000
/**
 * A LAUNCH.md longer than this many characters (UTF-16 code units, `text.length`) is not read at all: no pickup, no lane, no
 * copy. 32 KiB is the Launch Protocol's own cap for the file; real briefs are under 11 KB. The guard sits right after
 * `$.fs.read` and before any extraction, because the extractors are quadratic on hostile input and a hook must never hang a
 * turn: an unterminated `<!--` flood (100k of them, 391 KiB) took 16.5 s, and a line of N backticks followed by U+2028, U+2029
 * or a lone CR took 4.9 s at 80k. At this limit the worst case measures well under a second (README, "Known limits").
 */
export const MAX_BRIEF_CHARS = 32768

/** Unset reads the manifest default (copy); copy / notify / off are themselves; ANY other value is off. */
export function readOptions(raw: unknown): Options {
  const r = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  if (r.mode === undefined) return { ...DEFAULT_OPTIONS }
  return { mode: r.mode === 'copy' || r.mode === 'notify' ? r.mode : 'off' }
}

/** The one place the file name is decided: the exact, case-sensitive basename LAUNCH.md. */
export function isLaunchFile(path: unknown): path is string {
  if (typeof path !== 'string') return false
  return path.slice(path.lastIndexOf('/') + 1) === 'LAUNCH.md'
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** The reason a copy reports when `$.ui.copy` found no surface and the host's own clipboard refused too. */
export const LOCAL_FAILED_REASON = 'no-surface, local copy failed'

/**
 * `ports.copy`, then the host's clipboard when it answers `no-surface`. Measured live on the desktop (cases A and C): the
 * desktop hosts the session headless, so `$.session.surfaces()` is empty and `$.ui.copy` with no surface answers
 * `no-surface` without copying. The desktop engine runs on the user's own Mac, so pbcopy reaches the clipboard they paste from (macOS only).
 */
export async function copyThrough(ports: Pick<Ports, 'copy' | 'copyLocal'>, text: string): Promise<unknown> {
  const r = await ports.copy(text)
  if (!(isObject(r) && r.isCopied === false && r.reason === 'no-surface') || ports.copyLocal === undefined) return r
  let local: unknown
  try {
    local = await ports.copyLocal(text)
  } catch {
    return r
  }
  return isObject(local) && local.isCopied === true ? local : { isCopied: false, reason: LOCAL_FAILED_REASON }
}

/**
 * The LAUNCH.md a finished tool.call touched, or undefined. Only a Write or Edit of a main-loop call that neither was
 * denied nor reported an error counts: a call that did not happen, or ran in a subagent's loop, is nothing.
 */
export function touchedPath(e: unknown, result: unknown): string | undefined {
  if (!isObject(e)) return undefined
  if (e.tool !== 'Write' && e.tool !== 'Edit') return undefined
  if (e.agentId !== undefined && e.agentId !== null) return undefined
  if (isObject(result) && ('deny' in result || result.isError === true)) return undefined
  return isLaunchFile(e.file_path) ? e.file_path : undefined
}

/** Every sentence the mod shows. */
export const MSG = {
  copied: 'Launch brief ready: pickup copied. Open a new chat and paste.',
  copyFailed: (path: string, reason: string) => `Launch brief ready, but the copy failed (${reason}). Pickup is in ${path} under "## 1. Pickup".`,
  announced: (path: string) => `Launch brief ready: ${path}. Copy its Pickup block into a new chat.`,
  noPickup: (path: string, unreadable: boolean) => `LAUNCH.md written, but no Pickup block was found${unreadable ? ' (could not read)' : ''}: ${path}`,
  statusCopied: 'launch-copy · pickup copied',
  statusFailed: (reason: string) => `launch-copy · copy failed (${reason})`,
  statusNone: 'launch-copy · no pickup',
  // The size guard (fold r4): a file over MAX_BRIEF_CHARS is not read, so it is neither copied nor given a lane.
  oversize: (path: string) => `LAUNCH.md is over 32 KiB (the protocol's cap), not read: ${path}`,
  statusOversize: 'launch-copy · over 32 KiB, not read',
  statusReady: 'launch-copy · brief ready',
  // Lane awareness (design note M9). L1 and L3c: this chat starts the builder itself, so nothing is pasted anywhere.
  laneNoPaste: (lane: Lane, path: string) => `Launch brief ready (lane ${lane}: this chat starts it, nothing to paste): ${path}`,
  statusLaneNoPaste: (lane: Lane) => `launch-copy · lane ${lane}, nothing to paste`,
  // L2: the pickup is a /compact line to paste into THIS chat. In notify mode nothing is copied, so the notice must not say it was.
  copiedCompact: 'Launch brief ready: the /compact line is copied. Paste it in this chat and send go.',
  announcedCompact: (path: string) => `Launch brief ready (lane L2: paste its /compact line in this chat and send go): ${path}`,
  statusCopiedCompact: 'launch-copy · /compact line copied',
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Local HH:MM. */
export function localHHMM(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** A short, one-line reason out of whatever a failed call threw. */
function reasonOfError(err: unknown): string {
  const m = err instanceof Error ? err.message : typeof err === 'object' && err !== null && typeof (err as { message?: unknown }).message === 'string' ? (err as { message: string }).message : ''
  const line = m.split(/\r?\n/)[0].trim()
  return line === '' ? 'error' : line.length > 80 ? `${line.slice(0, 77)}...` : line
}

export type Timer = { cancel: () => void }
/** The world, as the controller sees it. `copy` resolves to a UiCopyResult-shaped value; `notify`'s result is ignored. */
export type Ports = {
  read: (path: string) => Promise<string>
  copy: (text: string) => Promise<unknown>
  /**
   * The host's own clipboard (pbcopy), tried only when `copy` answers `no-surface`. Resolves UiCopyResult-shaped; a
   * rejection (no such program, as off macOS) leaves `copy`'s own answer standing. Absent: no fallback.
   */
  copyLocal?: (text: string) => Promise<unknown>
  notify: (text: string, title: string) => Promise<unknown> | unknown
  status: (text: string | undefined) => void
  now: () => Promise<number>
  after: (ms: number, fn: () => void) => Timer
}

export class LaunchCopy {
  private touched = new Set<string>()
  /**
   * path -> the claim last made for it (copied, or announced in notify mode): the lane + pickup key it is for, and the token
   * of the attempt that made it. The key is what dedupe compares; the token is what a copy that has settled compares, so
   * "is this copy still the current one" is a question about the attempt, never about the key (a brief that is broken and
   * restored to the SAME key gets a new attempt, and the old one must not speak for it).
   */
  private handled = new Map<string, { key: string; token: number }>()
  /** The counter the attempts' tokens come from. */
  private attempts = 0
  /** path -> the kind of "no pickup" last announced for it (cleared when a pickup is found). */
  private noPickup = new Map<string, 'missing' | 'unreadable' | 'oversize'>()
  private timer: Timer | undefined

  constructor(private readonly mode: Mode) {}

  /** Records what a finished Write/Edit touched. Synchronous; never throws; mode off records nothing. */
  note(e: unknown, result: unknown): void {
    if (this.mode === 'off') return
    try {
      const p = touchedPath(e, result)
      if (p !== undefined) this.touched.add(p)
    } catch {
      // bookkeeping only: a failure here must never reach the tool call
    }
  }

  /** The end of a main-loop turn: handles (and clears) every touched path, one after the other. Never rejects. */
  async onTurn(ports: Ports): Promise<void> {
    if (this.mode === 'off') return
    const paths = [...this.touched]
    this.touched.clear()
    for (const path of paths) {
      try {
        await this.handle(ports, path)
      } catch {
        // one path failing must not stop the next, nor reach the hook
      }
    }
  }

  private async handle(ports: Ports, path: string): Promise<void> {
    let text: string | undefined
    let unreadable = false
    try {
      text = await ports.read(path)
    } catch {
      unreadable = true
    }
    // Fold r4: the size guard runs BEFORE any extraction. A text over MAX_BRIEF_CHARS is treated as not read (no pickup, no
    // lane, no copy) and goes down the same branch as "no pickup found", with its own kind of trouble.
    const oversize = typeof text === 'string' && text.length > MAX_BRIEF_CHARS
    const pickup = text === undefined || oversize ? undefined : extractPickup(text)
    if (pickup === undefined) {
      // F6: a broken edit forgets what was handled, so a restored pickup is handled again.
      this.handled.delete(path)
      // F5: the notification is once per path and kind of trouble; the status line is updated every time.
      const kind = oversize ? 'oversize' : unreadable ? 'unreadable' : 'missing'
      const seen = this.noPickup.get(path) === kind
      this.noPickup.set(path, kind)
      if (oversize) await this.say(ports, MSG.oversize(path), MSG.statusOversize, !seen)
      else await this.say(ports, MSG.noPickup(path, unreadable), MSG.statusNone, !seen)
      return
    }
    this.noPickup.delete(path) // a pickup was found: the next trouble is news again
    // The lane is read only once a pickup is found (a brief with no Pickup is wrong in every lane). A brief that names no
    // lane behaves as L3, so the dedupe key uses that effective lane: adding `lane L3` to a handled brief is not news.
    const lane: Lane = (text === undefined ? undefined : extractLane(text)) ?? 'L3'
    const key = `${lane}\n${pickup}`
    if (this.handled.get(path)?.key === key) return
    // Claimed BEFORE the copy is awaited: a later turn must not ask twice for the same text while this one is pending,
    // and a copy that never answers must not hold up a pickup that has since changed. Every claim is a new attempt with its
    // own token.
    const token = ++this.attempts
    this.handled.set(path, { key, token })
    if (lane === 'L1' || lane === 'L3c') {
      // Nothing is pasted anywhere (this chat starts the builder itself), so the clipboard is left alone in every mode.
      await this.say(ports, MSG.laneNoPaste(lane, path), MSG.statusLaneNoPaste(lane))
      return
    }
    if (this.mode === 'notify') {
      // F3: $.ui.notify is unmeasured on the desktop, so the footer line says it too.
      await this.say(ports, lane === 'L2' ? MSG.announcedCompact(path) : MSG.announced(path), MSG.statusReady)
      return
    }
    let failure: string | undefined
    try {
      const r = await this.copyBounded(ports, pickup)
      if (!(typeof r === 'object' && r !== null && (r as { isCopied?: unknown }).isCopied === true)) {
        const reason = typeof r === 'object' && r !== null ? (r as { reason?: unknown }).reason : undefined
        failure = typeof reason === 'string' && reason.trim() !== '' ? reason.trim() : 'unknown'
      }
    } catch (err) {
      failure = reasonOfError(err)
    }
    // F4 (review round 1), per copy since r2 F3: a copy that has been superseded says nothing when it settles (answered,
    // failed or timed out), and neither sets the status nor releases the claim. It is superseded when the path's current
    // claim is not the one this attempt made: an edit in the meantime changed the lane or the pickup, broke the brief, or
    // broke it and restored the SAME key (a newer attempt then holds the claim; comparing keys would let this older copy
    // speak for it and release its claim). The newer attempt, or the newer notice, has said or will say what is true; a
    // late "pickup copied ... paste" would contradict it. The clipboard may still hold the earlier pickup (README).
    if (this.handled.get(path)?.token !== token) return
    if (failure === undefined) {
      if (lane === 'L2') await this.say(ports, MSG.copiedCompact, MSG.statusCopiedCompact)
      else await this.say(ports, MSG.copied, MSG.statusCopied)
      return
    }
    this.handled.delete(path) // a failed copy is retried by the next edit
    await this.say(ports, MSG.copyFailed(path, failure), MSG.statusFailed(failure))
  }

  /**
   * F4: `ports.copy` (and its local fallback, `copyThrough`) raced against a COPY_TIMEOUT_MS timer. The timeout rejects with `no answer`, which the caller reports
   * as a failed copy (and releases its claim); an answer that comes later is ignored. The timer is cancelled as soon as
   * the copy settles, so it never outlives the call. Never calls back twice.
   */
  private copyBounded(ports: Ports, text: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false
      let timer: Timer | undefined
      const once = (fn: (v: unknown) => void) => (v: unknown) => {
        if (settled) return
        settled = true
        try {
          timer?.cancel()
        } catch {
          // ignore
        }
        fn(v)
      }
      const ok = once(resolve)
      const bad = once(reject)
      try {
        timer = ports.after(COPY_TIMEOUT_MS, () => bad(new Error('no answer')))
      } catch {
        // no timer: the copy is awaited without a bound
      }
      try {
        copyThrough(ports, text).then(ok, bad)
      } catch (err) {
        bad(err)
      }
    })
  }

  /** The status line first (it cannot hang), then the notification (never awaited; skipped when `notify` is false). */
  private async say(ports: Ports, notification: string, status: string, notify = true): Promise<void> {
    let when = ''
    try {
      when = localHHMM(await ports.now())
    } catch {
      // no clock: the line goes without a time
    }
    this.draw(ports, when === '' ? status : `${status} ${when}`)
    if (notify) this.fire(ports, notification)
  }

  /** One status line and its one clearing timer: a new line cancels the old timer. */
  private draw(ports: Ports, text: string): void {
    try {
      this.timer?.cancel()
    } catch {
      // ignore
    }
    this.timer = undefined
    try {
      ports.status(text)
    } catch {
      return
    }
    try {
      this.timer = ports.after(CLEAR_MS, () => {
        this.timer = undefined
        try {
          ports.status(undefined)
        } catch {
          // ignore
        }
      })
    } catch {
      // no timer: the line stays until the next one replaces it
    }
  }

  /** Calls notify and ignores the answer. A throw or a rejection is swallowed here; a hang costs nothing. */
  private fire(ports: Ports, text: string): void {
    try {
      Promise.resolve(ports.notify(text, TITLE)).catch(() => {})
    } catch {
      // ignore
    }
  }
}
