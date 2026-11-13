// Pure logic (hooks/lib/warm.ts), explicit options, no `$`: option coercion (W6 garbage values, W10 clamps), person-turn
// origin (W3), the fire verdict (W4, W5), the cache-lapse check, the status line.
import { describe, expect, test } from 'claude-code/testing'

import {
  CHILD_START_TOOL,
  CLOSE,
  DEFAULT_OPTIONS,
  EMPTY_MODEL,
  GUARD_MS,
  HELD_LINE,
  HOLD_MAX,
  MSG,
  cacheLapsed,
  clearsHold,
  closesOn,
  coerceModel,
  delayMs,
  holdActive,
  holdEnabled,
  holdMs,
  isChildCall,
  isPersonPrompt,
  localDay,
  readOptions,
  statusLine,
  verdict,
  type Model,
  type Options,
} from '../hooks/lib/warm'
import { MIN, at, local } from './support'

const D = DEFAULT_OPTIONS
const model = (o: Partial<Model> = {}): Model => ({ ...EMPTY_MODEL, ...o })
const DAY = localDay(at(14, 0))

describe('L1 the constants the spec fixes', () => {
  test('defaults, the command and its arguments, the notification title', () => {
    expect(D).toEqual({ mode: 'submit', ttlMinutes: 60, marginMinutes: 8, minTurns: 3, maxPerDay: 6, childHoldMinutes: 120 })
    expect(CLOSE).toEqual({ command: 'close', args: 'conversation --checkpoint' })
    expect(MSG.submit).toBe('Closing this conversation while its cache is warm: /close conversation --checkpoint')
    expect(MSG.title).toBe('warm-close')
  })
  test('F3 the retry guard waits 180 s', () => {
    expect(GUARD_MS).toBe(180_000)
  })
  test('the fire delay is ttl minus margin, in ms', () => {
    expect(delayMs(D)).toBe(52 * MIN)
    expect(delayMs({ ...D, ttlMinutes: 5, marginMinutes: 1 })).toBe(4 * MIN)
  })
})

describe('L2 readOptions: mode (W6)', () => {
  test('absent or empty options give the defaults, submit included (the default)', () => {
    expect(readOptions(undefined)).toEqual(D)
    expect(readOptions({})).toEqual(D)
    expect(readOptions(null)).toEqual(D)
  })
  test('submit, notify and off are taken exactly', () => {
    for (const mode of ['submit', 'notify', 'off'] as const) expect(readOptions({ mode }).mode).toBe(mode)
  })
  test('anything else is off: wrong case, padding, empty, non-strings, arrays', () => {
    for (const mode of ['Submit', ' submit', 'submit ', 'SUBMIT', '', 'on', 'true', 'yes', 'fill', null, 0, 1, true, false, [], ['submit'], {}]) {
      expect(readOptions({ mode }).mode).toBe('off')
    }
  })
  test('a non-object options value is the defaults, not a throw', () => {
    for (const raw of ['submit', 5, true, [], [1]]) expect(readOptions(raw)).toEqual(D)
  })
})

describe('L3 readOptions: numbers, clamps (W10)', () => {
  test('a finite number is taken; whole numbers are floored', () => {
    expect(readOptions({ ttlMinutes: 5, marginMinutes: 2, minTurns: 2, maxPerDay: 3 })).toEqual({ mode: 'submit', ttlMinutes: 5, marginMinutes: 2, minTurns: 2, maxPerDay: 3, childHoldMinutes: 120 })
    expect(readOptions({ ttlMinutes: 60.9, minTurns: 3.9, maxPerDay: 2.5 })).toEqual({ mode: 'submit', ttlMinutes: 60, marginMinutes: 8, minTurns: 3, maxPerDay: 2, childHoldMinutes: 120 })
  })
  test('non-finite or non-number values fall back to the default', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '60', null, undefined, true, [], {}]) {
      expect(readOptions({ ttlMinutes: v, marginMinutes: v, minTurns: v, maxPerDay: v })).toEqual(D)
    }
  })
  test('margin clamps to [1, ttl - 1]', () => {
    expect(readOptions({ ttlMinutes: 60, marginMinutes: 0 }).marginMinutes).toBe(1)
    expect(readOptions({ ttlMinutes: 60, marginMinutes: -5 }).marginMinutes).toBe(1)
    expect(readOptions({ ttlMinutes: 60, marginMinutes: 0.5 }).marginMinutes).toBe(1)
    expect(readOptions({ ttlMinutes: 60, marginMinutes: 59 }).marginMinutes).toBe(59)
    expect(readOptions({ ttlMinutes: 60, marginMinutes: 60 }).marginMinutes).toBe(59)
    expect(readOptions({ ttlMinutes: 60, marginMinutes: 1000 }).marginMinutes).toBe(59)
  })
  test('ttl 5 works: the default margin 8 clamps to 4, so the close fires 1 minute after the last turn', () => {
    const o = readOptions({ ttlMinutes: 5 })
    expect(o.marginMinutes).toBe(4)
    expect(delayMs(o)).toBe(1 * MIN)
    expect(delayMs(readOptions({ ttlMinutes: 5, marginMinutes: 1 }))).toBe(4 * MIN)
  })
  test('F2 ttl clamps to [5, 1440]: below 5 reads as 5, above a day reads as 1440 (a 32-bit timer overflows near 35,791 minutes)', () => {
    for (const ttl of [4, 2, 1, 0, -3, 1.9]) expect(readOptions({ ttlMinutes: ttl }).ttlMinutes).toBe(5)
    for (const ttl of [1441, 35_792, 1e9, 1e300]) expect(readOptions({ ttlMinutes: ttl }).ttlMinutes).toBe(1440)
    for (const ttl of [5, 60, 1440]) expect(readOptions({ ttlMinutes: ttl }).ttlMinutes).toBe(ttl)
    expect(readOptions({ ttlMinutes: 2 })).toEqual({ mode: 'submit', ttlMinutes: 5, marginMinutes: 4, minTurns: 3, maxPerDay: 6, childHoldMinutes: 120 })
    expect(delayMs(readOptions({ ttlMinutes: 1e9, marginMinutes: 1 }))).toBeLessThan(2 ** 31)
    expect(delayMs(readOptions({ ttlMinutes: 1e9 }))).toBeLessThan(2 ** 31)
  })
  test('minTurns is at least 1 (0 would let a close follow a close); maxPerDay 0 means none, never negative', () => {
    expect(readOptions({ minTurns: 0 }).minTurns).toBe(1)
    expect(readOptions({ minTurns: -4 }).minTurns).toBe(1)
    expect(readOptions({ maxPerDay: 0 }).maxPerDay).toBe(0)
    expect(readOptions({ maxPerDay: -2 }).maxPerDay).toBe(0)
  })
})

describe('L4 isPersonPrompt (W3)', () => {
  test('only the composer is a person', () => {
    expect(isPersonPrompt({ kind: 'composer' })).toBe(true)
    for (const kind of ['bridge', 'sdk', 'task-notification', 'scheduled-trigger', 'peer', 'plugin', 'unclassified', 'Composer', '']) {
      expect(isPersonPrompt({ kind })).toBe(false)
    }
  })
  test('junk origins are not a person', () => {
    for (const o of [undefined, null, 'composer', 5, [], {}, { kind: undefined }, { kind: ['composer'] }]) expect(isPersonPrompt(o)).toBe(false)
  })
})

describe('L5 coerceModel', () => {
  test('a stored model is read back; junk becomes the empty model', () => {
    const m = model({ personTurns: 4, personTurnsAtLastClose: 1, lastTurnAt: 5, inFlight: 2, day: DAY, closes: 2, lastFireAt: 9 })
    expect(coerceModel(m)).toEqual(m)
    for (const junk of [undefined, null, 'x', 5, [], { personTurns: 'many' }, { personTurns: -1, closes: Number.NaN }]) {
      expect(coerceModel(junk)).toEqual(EMPTY_MODEL)
    }
  })
  test('bad fields are dropped one by one', () => {
    expect(coerceModel({ personTurns: 3, lastTurnAt: 'now', inFlight: 'yes', day: 5, lastFireAt: Number.NaN })).toEqual(model({ personTurns: 3 }))
    expect(coerceModel({ inFlight: -2 })).toEqual(EMPTY_MODEL)
  })
})

describe('L6 verdict: the conditions that are not about time (W1, W4, W5)', () => {
  const ready = model({ personTurns: 3, lastTurnAt: at(14, 0) })
  test('ready: three person turns, nothing closed yet', () => {
    expect(verdict(ready, D, DAY)).toEqual({ ok: true })
  })
  test('off, and zero person turns', () => {
    expect(verdict(ready, { ...D, mode: 'off' }, DAY)).toEqual({ ok: false, why: 'off' })
    expect(verdict(model({ lastTurnAt: 1 }), D, DAY)).toEqual({ ok: false, why: 'no-person-turns' })
  })
  test('minTurns counts person turns since the last close, boundary both sides', () => {
    expect(verdict(model({ personTurns: 2, lastTurnAt: 1 }), D, DAY)).toEqual({ ok: false, why: 'few-turns' })
    expect(verdict(model({ personTurns: 3, lastTurnAt: 1 }), D, DAY).ok).toBe(true)
    expect(verdict(model({ personTurns: 7, personTurnsAtLastClose: 5, lastTurnAt: 1 }), D, DAY)).toEqual({ ok: false, why: 'few-turns' })
    expect(verdict(model({ personTurns: 8, personTurnsAtLastClose: 5, lastTurnAt: 1 }), D, DAY).ok).toBe(true)
    expect(verdict(model({ personTurns: 3, personTurnsAtLastClose: 3, lastTurnAt: 1 }), D, DAY)).toEqual({ ok: false, why: 'few-turns' })
  })
  test('the daily cap counts the given day only, and a new day resets it', () => {
    const capped = model({ personTurns: 9, lastTurnAt: 1, day: DAY, closes: 6 })
    expect(verdict(capped, D, DAY)).toEqual({ ok: false, why: 'cap' })
    expect(verdict({ ...capped, closes: 5 }, D, DAY).ok).toBe(true)
    expect(verdict(capped, D, localDay(at(14, 0, 20))).ok).toBe(true)
    expect(closesOn(capped, DAY)).toBe(6)
    expect(closesOn(capped, localDay(at(14, 0, 20)))).toBe(0)
    expect(verdict(model({ personTurns: 9, lastTurnAt: 1 }), { ...D, maxPerDay: 0 }, DAY)).toEqual({ ok: false, why: 'cap' })
  })
  test('a prompt whose turn has not completed means the conversation is not idle; no turn yet means nothing to wait for', () => {
    expect(verdict({ ...ready, inFlight: 1 }, D, DAY)).toEqual({ ok: false, why: 'busy' })
    expect(verdict({ ...ready, inFlight: 2 }, D, DAY)).toEqual({ ok: false, why: 'busy' })
    expect(verdict({ ...ready, inFlight: 0 }, D, DAY)).toEqual({ ok: true })
    expect(verdict(model({ personTurns: 3 }), D, DAY)).toEqual({ ok: false, why: 'no-turn' })
  })
})

describe('L7 cacheLapsed: a late timer (a sleeping machine) must not close a cold cache', () => {
  const m = model({ lastTurnAt: 1_000_000 })
  test('before ttl is warm, at ttl is lapsed', () => {
    expect(cacheLapsed(m, D, 1_000_000 + 60 * MIN - 1)).toBe(false)
    expect(cacheLapsed(m, D, 1_000_000 + 60 * MIN)).toBe(true)
    expect(cacheLapsed(m, { ...D, ttlMinutes: 5 }, 1_000_000 + 5 * MIN)).toBe(true)
  })
  test('no recorded turn, or a non-finite clock, counts as lapsed (nothing fires on a guess)', () => {
    expect(cacheLapsed(model(), D, 5)).toBe(true)
    expect(cacheLapsed(m, D, Number.NaN)).toBe(true)
  })
})

describe('L8 localDay and the status line', () => {
  test('localDay is the local calendar date', () => {
    expect(localDay(at(23, 59))).toBe('2026-10-19')
    expect(localDay(at(0, 0, 20))).toBe('2026-10-20')
    expect(localDay(at(0, 1, 1))).toBe('2026-10-01')
  })
  test('armed shows the due time; closed shows the fire time for ten minutes', () => {
    const due = at(14, 52)
    expect(statusLine({ dueAt: due, fire: null, now: at(14, 0) }, local)).toBe('warm-close · armed 14:52')
    expect(statusLine({ dueAt: null, fire: null, now: at(14, 0) }, local)).toBeUndefined()
    const fire = { at: at(14, 52), mode: 'submit' as const, failed: false }
    expect(statusLine({ dueAt: null, fire, now: at(14, 52) }, local)).toBe('warm-close · closed 14:52')
    expect(statusLine({ dueAt: null, fire, now: at(14, 52) + 10 * MIN - 1 }, local)).toBe('warm-close · closed 14:52')
    expect(statusLine({ dueAt: null, fire, now: at(14, 52) + 10 * MIN }, local)).toBeUndefined()
  })
  test('the closed line wins over an armed one inside its window, and the armed line returns after it', () => {
    const fire = { at: at(14, 52), mode: 'submit' as const, failed: false }
    expect(statusLine({ dueAt: at(16, 0), fire, now: at(14, 55) }, local)).toBe('warm-close · closed 14:52')
    expect(statusLine({ dueAt: at(16, 0), fire, now: at(15, 5) }, local)).toBe('warm-close · armed 16:00')
  })
  test('retry, failure and notify-only are said plainly', () => {
    const t = at(14, 52)
    expect(statusLine({ dueAt: null, fire: { at: t, mode: 'submit', retriedAt: t + 90_000, failed: false }, now: t + MIN }, local)).toBe('warm-close · closed 14:52 · retried 14:53')
    expect(statusLine({ dueAt: null, fire: { at: t, mode: 'submit', failed: true }, now: t + MIN }, local)).toBe('warm-close · close failed 14:52')
    expect(statusLine({ dueAt: null, fire: { at: t, mode: 'notify', failed: false }, now: t + MIN }, local)).toBe('warm-close · notified 14:52')
  })
})

// ---------- M10: the child hold (lane L3c)

const START = { tool: CHILD_START_TOOL, tool_use_id: 'u1', title: 'build it', prompt: 'go', initiation: 'user_asked' }
/** A start_session call with `extra` fields on top of a bare one (no initiation, no proposal_id, no target). */
const BARE_START = { tool: CHILD_START_TOOL, tool_use_id: 'u1', title: 'build it', prompt: 'go' }
const START_WITH = (extra: Record<string, unknown>) => ({ ...BARE_START, ...extra })
const SEND = (to: unknown) => ({ tool: 'SendMessage', tool_use_id: 'u2', to, message: 'status?' })
const OK = { ref: 1, result: {}, text: 'ok' }

describe('H4 childHoldMinutes: default 120, clamp [0, 1440], 0 and anything non-numeric disable', () => {
  test('absent = 120 (the default), also through an empty or junk options object', () => {
    expect(D.childHoldMinutes).toBe(120)
    for (const raw of [undefined, null, {}, 'x', 5, []]) expect(readOptions(raw).childHoldMinutes).toBe(120)
    expect(readOptions({ childHoldMinutes: undefined }).childHoldMinutes).toBe(120)
  })
  test('a number is taken, floored, clamped to [0, 1440]', () => {
    expect(readOptions({ childHoldMinutes: 30 }).childHoldMinutes).toBe(30)
    expect(readOptions({ childHoldMinutes: 30.9 }).childHoldMinutes).toBe(30)
    expect(readOptions({ childHoldMinutes: 1440 }).childHoldMinutes).toBe(1440)
    expect(readOptions({ childHoldMinutes: 1441 }).childHoldMinutes).toBe(1440)
    expect(readOptions({ childHoldMinutes: 5000 }).childHoldMinutes).toBe(1440)
    expect(readOptions({ childHoldMinutes: 1e300 }).childHoldMinutes).toBe(1440)
    expect(HOLD_MAX).toBe(1440)
  })
  test('0, a negative number, a fraction below 1, NaN and every non-number disable the hold (NOT the default)', () => {
    for (const v of [0, -0, -5, -1e9, 0.9, Number.NaN, 'x', '30', '', null, true, false, [], [30], {}]) {
      const o = readOptions({ childHoldMinutes: v })
      expect(o.childHoldMinutes).toBe(0)
      expect(holdEnabled(o)).toBe(false)
    }
  })
  test('a hold option never changes the other options', () => {
    expect(readOptions({ childHoldMinutes: 30 })).toEqual({ ...D, childHoldMinutes: 30 })
    expect(readOptions({ childHoldMinutes: 'x' })).toEqual({ ...D, childHoldMinutes: 0 })
  })
  test('holdEnabled and holdMs', () => {
    expect(holdEnabled(D)).toBe(true)
    expect(holdMs(D)).toBe(120 * MIN)
    expect(holdMs({ ...D, childHoldMinutes: 1440 })).toBe(1440 * MIN)
    expect(holdEnabled({ ...D, childHoldMinutes: 0 })).toBe(false)
  })
})

describe('H8 coerceModel: an older stored model without holdUntil reads as no hold', () => {
  test('holdUntil is read back when finite; absent or bad reads as no hold', () => {
    expect(coerceModel(model({ holdUntil: 123 }))).toEqual(model({ holdUntil: 123 }))
    expect(coerceModel({ personTurns: 3 }).holdUntil).toBeUndefined()
    expect('holdUntil' in coerceModel({ personTurns: 3 })).toBe(false)
    for (const bad of ['soon', null, Number.NaN, Number.POSITIVE_INFINITY, {}, true]) expect(coerceModel({ holdUntil: bad }).holdUntil).toBeUndefined()
    expect(coerceModel({ holdUntil: undefined })).toEqual(EMPTY_MODEL)
  })
  test('the empty model carries no hold (so a reset clears it)', () => {
    expect(EMPTY_MODEL.holdUntil).toBeUndefined()
    expect('holdUntil' in EMPTY_MODEL).toBe(false)
  })
})

describe('H1/H4 holdActive: the hold is strictly in the future', () => {
  const now = at(15, 0)
  test('active only while holdUntil > now', () => {
    expect(holdActive(model({ holdUntil: now + 1 }), D, now)).toBe(true)
    expect(holdActive(model({ holdUntil: now }), D, now)).toBe(false)
    expect(holdActive(model({ holdUntil: now - 1 }), D, now)).toBe(false)
    expect(holdActive(model(), D, now)).toBe(false)
  })
  test('a disabled hold option makes a stored hold inert; a bad clock holds nothing', () => {
    expect(holdActive(model({ holdUntil: now + MIN }), { ...D, childHoldMinutes: 0 }, now)).toBe(false)
    expect(holdActive(model({ holdUntil: now + MIN }), D, Number.NaN)).toBe(false)
  })
})

describe('F4 holdActive: a stored hold further away than the configured hold is not a hold', () => {
  const now = at(15, 0)
  test('the cap is the configured hold: exactly holdMs away holds, one ms more does not', () => {
    expect(holdActive(model({ holdUntil: now + 120 * MIN }), D, now)).toBe(true)
    expect(holdActive(model({ holdUntil: now + 120 * MIN + 1 }), D, now)).toBe(false)
    expect(holdActive(model({ holdUntil: now + 3 * 60 * MIN }), D, now)).toBe(false)
  })
  test('the cap follows the option: 30 minutes caps a 31-minute-away value; 1440 allows a day', () => {
    const o30 = { ...D, childHoldMinutes: 30 }
    expect(holdActive(model({ holdUntil: now + 30 * MIN }), o30, now)).toBe(true)
    expect(holdActive(model({ holdUntil: now + 31 * MIN }), o30, now)).toBe(false)
    const o1440 = { ...D, childHoldMinutes: 1440 }
    expect(holdActive(model({ holdUntil: now + 1440 * MIN }), o1440, now)).toBe(true)
    expect(holdActive(model({ holdUntil: now + 1441 * MIN }), o1440, now)).toBe(false)
  })
  test('garbage far in the future (a huge finite number) is not a hold', () => {
    expect(holdActive(model({ holdUntil: Number.MAX_SAFE_INTEGER }), D, now)).toBe(false)
    expect(holdActive(model({ holdUntil: 1e300 }), D, now)).toBe(false)
  })
  test('positive control: a value inside the cap and in the future still holds', () => {
    expect(holdActive(model({ holdUntil: now + 100 * MIN }), D, now)).toBe(true)
  })
})

describe('H2 isChildCall: start_session, and SendMessage only to a desktop session id (local_…)', () => {
  test('start_session is a child', () => {
    expect(isChildCall(START, OK)).toBe(true)
    expect(CHILD_START_TOOL).toBe('mcp__ccd_session__start_session')
  })
  test('SendMessage to local_… is a child', () => {
    for (const to of ['local_abc', 'local_0a1b2c3d-4e5f', 'local_']) expect(isChildCall(SEND(to), OK)).toBe(true)
  })
  test('SendMessage to a subagent name or id, a missing or non-string to, or a look-alike is NOT', () => {
    for (const to of ['researcher', 'a1234567890abcdef', 'team-lead', '', 'Local_abc', ' local_abc', 'xlocal_abc', 'local', 'localabc', undefined, null, 5, ['local_abc'], { id: 'local_abc' }, true]) {
      expect(isChildCall(SEND(to), OK)).toBe(false)
    }
    const noTo: Record<string, unknown> = { tool: 'SendMessage', message: 'x' }
    expect(isChildCall(noTo, OK)).toBe(false)
  })
  test('any other tool is not a child, even with a local_ looking field', () => {
    for (const tool of ['Agent', 'Task', 'Bash', 'Read', 'mcp__ccd_session__list_sessions', 'mcp__ccd_session__get_session', 'mcp__ccd_session__start_session_x', 'start_session', undefined, 5]) {
      expect(isChildCall({ tool, to: 'local_abc' }, OK)).toBe(false)
    }
  })
  test('junk events are not a child', () => {
    for (const e of [undefined, null, 'x', 5, [], [START]]) expect(isChildCall(e, OK)).toBe(false)
  })
})

describe('F1 isChildCall: start_session counts a child, not a card (initiation / proposal_id / target)', () => {
  test('initiation user_asked starts a session', () => {
    expect(isChildCall(START_WITH({ initiation: 'user_asked' }), OK)).toBe(true)
  })
  test('offer and own_initiative only show a card: no child without a proposal_id', () => {
    expect(isChildCall(START_WITH({ initiation: 'offer' }), OK)).toBe(false)
    expect(isChildCall(START_WITH({ initiation: 'own_initiative' }), OK)).toBe(false)
  })
  test('a missing or garbage initiation is a card too (no proposal_id)', () => {
    expect(isChildCall(BARE_START, OK)).toBe(false)
    for (const initiation of [undefined, null, '', 'USER_ASKED', 'User_Asked', ' user_asked', 'user_asked ', 'asked', 5, true, [], ['user_asked'], {}]) {
      expect(isChildCall(START_WITH({ initiation }), OK)).toBe(false)
    }
  })
  test('a non-empty string proposal_id starts a session whatever the initiation says', () => {
    for (const initiation of ['offer', 'own_initiative', undefined, 'garbage']) {
      expect(isChildCall(START_WITH({ initiation, proposal_id: 'prop_123' }), OK)).toBe(true)
    }
    expect(isChildCall(START_WITH({ proposal_id: 'prop_123' }), OK)).toBe(true)
    expect(isChildCall(START_WITH({ initiation: 'user_asked', proposal_id: 'prop_123' }), OK)).toBe(true)
  })
  test('an empty or non-string proposal_id does not (and does not hurt user_asked)', () => {
    for (const proposal_id of ['', undefined, null, 5, 0, true, false, [], ['prop_1'], {}, { id: 'prop_1' }]) {
      expect(isChildCall(START_WITH({ initiation: 'offer', proposal_id }), OK)).toBe(false)
      expect(isChildCall(START_WITH({ initiation: 'own_initiative', proposal_id }), OK)).toBe(false)
      expect(isChildCall(START_WITH({ proposal_id }), OK)).toBe(false)
      expect(isChildCall(START_WITH({ initiation: 'user_asked', proposal_id }), OK)).toBe(true)
    }
  })
  test('target: local, ssh and missing count; cloud never wakes this conversation', () => {
    for (const target of ['local', 'ssh', undefined, null, 'remote', '']) {
      expect(isChildCall(START_WITH({ initiation: 'user_asked', target }), OK)).toBe(true)
      expect(isChildCall(START_WITH({ initiation: 'offer', proposal_id: 'p1', target }), OK)).toBe(true)
    }
    expect(isChildCall(START_WITH({ initiation: 'user_asked', target: 'cloud' }), OK)).toBe(false)
    expect(isChildCall(START_WITH({ initiation: 'offer', proposal_id: 'p1', target: 'cloud' }), OK)).toBe(false)
    expect(isChildCall(START_WITH({ proposal_id: 'p1', target: 'cloud' }), OK)).toBe(false)
  })
  test('the card rules do not touch SendMessage: it still needs only a local_ id', () => {
    expect(isChildCall({ tool: 'SendMessage', to: 'local_abc', initiation: 'offer', target: 'cloud' }, OK)).toBe(true)
  })
})

describe('H5 isChildCall: a denied or failed call, or one from a subagent loop, holds nothing', () => {
  test('a deny (any reason text, even empty) is not a child', () => {
    for (const deny of ['no', '', 'blocked by policy']) {
      expect(isChildCall(START, { deny })).toBe(false)
      expect(isChildCall(SEND('local_abc'), { deny })).toBe(false)
    }
  })
  test('isError true is not a child; isError false or absent is', () => {
    expect(isChildCall(START, { ...OK, isError: true })).toBe(false)
    expect(isChildCall(SEND('local_abc'), { ...OK, isError: true })).toBe(false)
    expect(isChildCall(START, { ...OK, isError: false })).toBe(true)
    expect(isChildCall(START, { ...OK, deny: undefined })).toBe(true)
  })
  test("a subagent loop's call (agentId present) is not a child, for both tools", () => {
    expect(isChildCall({ ...START, agentId: 'a1234567890abcdef' }, OK)).toBe(false)
    expect(isChildCall({ ...SEND('local_abc'), agentId: 'a1' }, OK)).toBe(false)
    expect(isChildCall({ ...START, agentId: undefined }, OK)).toBe(true)
  })
  test('F3: the main loop is agentId null or undefined (!= null means subagent); any other value is a subagent', () => {
    expect(isChildCall({ ...START, agentId: null }, OK)).toBe(true)
    expect(isChildCall({ ...SEND('local_abc'), agentId: null }, OK)).toBe(true)
    for (const agentId of ['', 'a1', 0, false, {}, []]) {
      expect(isChildCall({ ...START, agentId }, OK)).toBe(false)
      expect(isChildCall({ ...SEND('local_abc'), agentId }, OK)).toBe(false)
    }
  })
  test('positive control: the same calls with a clean result and no agentId ARE children', () => {
    expect(isChildCall(START, OK)).toBe(true)
    expect(isChildCall(SEND('local_abc'), OK)).toBe(true)
  })
})

describe('H3/F2 clearsHold: only a child report (sdk); a typed prompt (composer) does not', () => {
  test('sdk clears', () => {
    expect(clearsHold({ kind: 'sdk' })).toBe(true)
  })
  test('F2: composer does NOT clear (the user typing "status?" while the child runs must not end the hold)', () => {
    expect(clearsHold({ kind: 'composer' })).toBe(false)
  })
  test('peer, task-notification, plugin, bridge, scheduled-trigger, a bad origin do not', () => {
    for (const kind of ['peer', 'peer-send-message', 'task-notification', 'plugin', 'bridge', 'scheduled-trigger', 'cron', 'SDK', 'Composer', '']) expect(clearsHold({ kind })).toBe(false)
    for (const o of [undefined, null, 'sdk', 5, [], {}, { kind: undefined }, { kind: 5 }, { name: 'sdk' }]) expect(clearsHold(o)).toBe(false)
  })
})

describe('the held status line', () => {
  test('held wins over armed and over a closed line, and says what is happening', () => {
    expect(HELD_LINE).toBe('warm-close · held, child session running')
    const fire = { at: at(14, 52), mode: 'submit' as const, failed: false }
    expect(statusLine({ dueAt: null, fire: null, now: at(14, 52), held: true }, local)).toBe(HELD_LINE)
    expect(statusLine({ dueAt: at(16, 0), fire: null, now: at(14, 52), held: true }, local)).toBe(HELD_LINE)
    expect(statusLine({ dueAt: null, fire, now: at(14, 55), held: true }, local)).toBe(HELD_LINE)
  })
  test('held false or absent changes nothing about the existing lines', () => {
    expect(statusLine({ dueAt: at(14, 52), fire: null, now: at(14, 0), held: false }, local)).toBe('warm-close · armed 14:52')
    expect(statusLine({ dueAt: null, fire: null, now: at(14, 0), held: false }, local)).toBeUndefined()
    expect(statusLine({ dueAt: null, fire: null, now: at(14, 0) }, local)).toBeUndefined()
  })
})

// keeps the unused-type import honest for the type checker
export type _Unused = Options
