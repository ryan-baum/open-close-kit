// State contract for warm-close. Self-contained: no imports.

/**
 * Everything the mod keeps in `$.state`, per session. Counters and times only: never any prompt text.
 * The armed timer itself is not state (it lives in the plugin's environment and dies with it).
 */
export type Model = {
  /** Prompts the person typed (`origin.kind === 'composer'`) and that entered the session. */
  personTurns: number
  /** `personTurns` when the last automatic close (or notification) was recorded; the baseline for `minTurns`. */
  personTurnsAtLastClose: number
  /** When the latest main-conversation `turn.complete` arrived (ms since the epoch). */
  lastTurnAt?: number
  /**
   * Prompts that entered the session and whose main-conversation `turn.complete` has not arrived: a count, not a flag,
   * because a prompt typed while a turn runs is queued behind it. Above 0 the conversation is not idle. A prompt typed
   * while the session was idle (no `turnId`) resets it to 1, which heals a prompt that was merged into a running turn.
   */
  inFlight: number
  /** The local day (`YYYY-MM-DD`) `closes` counts. */
  day?: string
  /** Automatic closes (or notifications) recorded under `day`. */
  closes: number
  /** When the last close was recorded, written before the call is made. */
  lastFireAt?: number
  /**
   * While in the future, the idle timer's fire is skipped: a child session was started or messaged from this conversation
   * (`start_session` that starts a session, or `SendMessage` to a `local_…` id), so the conversation is the conductor
   * waiting, not idle. Set to `now + childHoldMinutes` by the tool.call observer and re-anchored to
   * `max(holdUntil, now + childHoldMinutes)` when the turn that called the child completes; cleared by a prompt whose
   * origin is `sdk` (a child reported, a typed prompt does not clear it) and by `session.start` / `session.end`. A value
   * further than `childHoldMinutes` ahead is not a hold. Absent = no hold (an older stored model).
   */
  holdUntil?: number
}

declare module 'claude-code' {
  interface PluginState {
    'warm-close': {
      model: Model
    }
  }
}
