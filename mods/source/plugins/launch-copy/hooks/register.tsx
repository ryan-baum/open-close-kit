// launch-copy: when a LAUNCH.md is written or edited, copy the fenced block under its "## 1. Pickup" heading to the
// clipboard at the end of the turn (the default interactive launch lane is a fresh chat), so your part
// is: new chat, paste, Enter.
//
// It only watches. The tool.call hook calls `next(e)` FIRST and returns that very result; it never denies, rewrites,
// approves or adds context (CONVENTIONS rules 1-2), and its bookkeeping is wrapped so a throw there cannot change what
// the call returns. The work happens on the main loop's turn.complete, detached from the hook (a UI call that never
// answers must not stick a turn; `$.ui.copy` and `$.ui.notify` are unmeasured on the desktop). The decisions live in
// ./lib (pure, tested with fake ports); `e.surface` and `e.isInteractive` are deliberately never read: the desktop
// reports surface null and isInteractive false at session.start and is a main surface (CONVENTIONS rule 7).
//
// Lane awareness (M9) lives entirely in ./lib: a brief whose Stamp names lane L1 or L3c never reaches `$.ui.copy`.
//
// Known limit: a LAUNCH.md written through Bash (`cat > LAUNCH.md`) raises no Write or Edit call, so it is not seen.
import type { EngineInterface, Register } from 'claude-code'

import { LaunchCopy, readOptions, type Ports } from './lib/launch'

type $ = EngineInterface

// The desktop engine runs with no LANG/LC_*; pbcopy without a locale reads stdin as MacRoman, so "—" would paste as
// "‚Äî" while the copy reports success. LC_ALL (not LANG) so an inherited LC_CTYPE/LC_ALL=C cannot win; still a fixed
// argv (rule 4). env exits 127 when it cannot find pbcopy (off macOS): that counts as "could not start".
const PBCOPY = ['/usr/bin/env', 'LC_ALL=en_US.UTF-8', 'pbcopy'] as const
const EXIT_NOT_FOUND = 127
const PBCOPY_TIMEOUT_MS = 5_000

// The only place `$.fs.read`, `$.ui.copy`, `$.process.run`, `$.ui.notify`, `$.ui.status` and `$.clock` are spelled.
function portsOf($: $): Ports {
  return {
    read: async path => {
      const text = await $.fs.read(path)
      return typeof text === 'string' ? text : ''
    },
    copy: text => $.ui.copy({ text }),
    // CONVENTIONS rule 4: a fixed argv, its program named in the README. Only reached when `$.ui.copy` says no-surface.
    copyLocal: async text => {
      const r = await $.process.run(PBCOPY, { stdin: text, timeoutMs: PBCOPY_TIMEOUT_MS })
      if (r.exitCode === EXIT_NOT_FOUND) throw new Error('pbcopy not found')
      return r.exitCode === 0 ? { isCopied: true } : { isCopied: false, reason: `pbcopy exit ${r.exitCode}` }
    },
    notify: (text, title) => $.ui.notify(text, { title }),
    status: text => $.ui.status(text),
    now: () => $.clock.now(),
    after: (ms, fn) => $.clock.after(ms, fn),
  }
}

export const register: Register = (on, options) => {
  const o = readOptions(options)
  const ctl = new LaunchCopy(o.mode)

  // The matcher is spelled literally (CONVENTIONS rule 6). Observe only: `next(e)` first, its result returned as is.
  on('tool.call', { tool: ['Write', 'Edit'] }, async ($, e, next) => {
    const r = await next(e)
    try {
      if (o.mode !== 'off') ctl.note(e, r)
    } catch {
      // bookkeeping only: never changes what the call returns
    }
    return r
  }).catch(($, e, next) => next(e))

  // Main loop only: a subagent's turn ending is not the conversation's. The work is not awaited.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    try {
      if (o.mode !== 'off' && e.agentId == null) void ctl.onTurn(portsOf($)).catch(() => {})
    } catch {
      // never reaches the chain
    }
    return r
  }).catch(($, e, next) => next(e))
}
