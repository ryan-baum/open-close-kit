// Pure logic (hooks/lib/lane.ts), no `$`. The reader is STRICT since fold r3 (see the R3 blocks at the end): one Stamp heading,
// one `lane` mention, one lane-like token. The older X1/X2/R1/R2 blocks stay where their strings still mean the same; the ones
// whose meaning r3 changed say so in their title.
// X1: the lane is found, exactly, in the Stamp section. X2: what must NOT count as
// the lane (every false-accept the spec names). Both directions: a lane read from the wrong place switches the clipboard
// off for a brief that needed it (the paste form, lane L3, left with nothing to paste), or on for one that must not have
// it (lane L3c or L1 told "open a new chat and paste", which invites a second builder).
import { describe, expect, test } from 'claude-code/testing'

import { extractLane } from '../hooks/lib/lane'

const doc = (...lines: string[]) => lines.join('\n')
const PICKUP = 'Read ~/work/20260101-0900_example/CONTRACT.md and execute lane L3.'
/** A whole brief: Pickup, a Plan of attack that mentions lane L1, then the Stamp section with `body` under `heading`. */
const brief = (body: string, heading = '## 12. Stamp') =>
  doc('# Launch: x', '', '## 1. Pickup', '', '```text', PICKUP, '```', '', '## 6. Plan of attack', 'Run it as lane L1 if the chat is short.', '', heading, body, '')

describe('X1 the lane is found in the Stamp section', () => {
  test('the real example from LAUNCH.md section 12', () => {
    const body = 'written: 2026-01-15T09:00Z (previous chat, closing) · lane L3 · re-probe any dated claim before acting.'
    expect(extractLane(brief(body))).toBe('L3')
  })
  test('every spelling the spec names', () => {
    const cases: [string, string][] = [
      ['written: x · lane L3 · y', 'L3'],
      ['written: x · lane L3c · y', 'L3c'],
      ['lane: L3c)', 'L3c'],
      ['lane L3c)', 'L3c'],
      ['Lane L1', 'L1'],
      ['lane L2', 'L2'],
      ['lane l3C', 'L3c'],
      ['lane L3C', 'L3c'],
      ['LANE L3C', 'L3c'],
      ['lane l3c', 'L3c'],
      ['lane=L1', 'L1'],
      ['lane = L2', 'L2'],
      ['lane (L3c)', 'L3c'],
      ['lane:L3', 'L3'],
      ['lane\tL1', 'L1'],
    ]
    for (const [body, want] of cases) expect([body, extractLane(brief(body))]).toEqual([body, want])
  })
  test('the result is normalised: the digit kept, a trailing c lower-case, the L upper-case', () => {
    expect(extractLane(brief('lane l1'))).toBe('L1')
    expect(extractLane(brief('lane l2'))).toBe('L2')
    expect(extractLane(brief('lane l3'))).toBe('L3')
    expect(extractLane(brief('lane l3C'))).toBe('L3c')
  })
  test('CRLF line endings', () => {
    const t = brief('written: x · lane L3c · y').split('\n').join('\r\n')
    expect(extractLane(t)).toBe('L3c')
    expect(extractLane(brief('lane L2').split('\n').join('\r\n'))).toBe('L2')
  })
  test('the Stamp heading: numbered, bare, with trailing words, case-insensitive, tight number', () => {
    for (const h of ['## 12. Stamp', '## Stamp', '## 12. Stamp (lane)', '## 12.Stamp', '## 12. STAMP', '## stamp', '##   12. Stamp', '## 12. Stamp:', ' ## 12. Stamp', '   ## Stamp']) {
      expect([h, extractLane(brief('written: x · lane L3c · y', h))]).toEqual([h, 'L3c'])
    }
  })
  // r3 made any ATX heading end the section; r4 narrowed that to level 1 and 2 (`#`, `##`): `###` and deeper stay inside the Stamp.
  test('r4: a `#` or `##` heading ends the Stamp section; a `###` sub-heading does not (flipped from r3)', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L2', '## 13. Notes', 'lane L1'))).toBe('L2')
    expect(extractLane(doc('## 12. Stamp', 'written: x', '## 13. Notes', 'lane L2'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'written: x', '### Detail', 'lane L2'))).toBe('L2') // inside the Stamp now
    expect(extractLane(doc('## 12. Stamp', 'lane L2', '### Detail', 'lane L1'))).toBeUndefined() // two mentions
  })
  test('r3: the token must sit on a body line of the section; a lane on the heading line itself is not read', () => {
    expect(extractLane(doc('## 12. Stamp lane L1', 'written: x'))).toBeUndefined() // not even a Stamp heading
    expect(extractLane(doc('## 12. Stamp (lane L1)', 'written: x'))).toBeUndefined() // a Stamp heading, but its own text is excluded
    expect(extractLane(doc('## 12. Stamp (lane L1)', 'lane L3'))).toBe('L3') // so the heading's lane cannot conflict with the body's
    expect(extractLane(doc('## 12. Stamp', 'written: x', '', 'previous chat, closing', 'lane L3c'))).toBe('L3c')
  })
  test('a Stamp at the end of the file with no trailing newline', () => {
    expect(extractLane('## Stamp\nlane L1')).toBe('L1')
  })
})

describe('X2 false-accepts: what must not count as the lane', () => {
  test('`lane L1` in section 6 only, and the Stamp says L3: L3', () => {
    expect(extractLane(brief('written: x · lane L3 · y'))).toBe('L3')
  })
  test('`lane L1` in section 6 (or the Pickup) and a Stamp with no lane token: undefined', () => {
    expect(extractLane(brief('written: 2026-01-15T09:00Z · re-probe any dated claim before acting.'))).toBeUndefined()
    expect(extractLane(brief(''))).toBeUndefined()
  })
  test('a lane token AFTER the Stamp section does not count', () => {
    expect(extractLane(doc('## 12. Stamp', 'written: x', '', '## 13. Notes', 'lane L1'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '', '## 13. Notes', 'lane L1'))).toBe('L3')
  })
  test('a lane token in the Pickup block itself is ignored (the Pickup is not the Stamp)', () => {
    const t = doc('## 1. Pickup', '```text', 'Read CONTRACT.md and execute lane L1.', '```', '', '## 12. Stamp', 'lane L3')
    expect(extractLane(t)).toBe('L3')
    expect(extractLane(doc('## 1. Pickup', '```text', 'execute lane L3c.', '```'))).toBeUndefined()
    expect(extractLane(doc('## 1. Pickup', '```text', 'execute lane L3c.', '```', '## 12. Stamp', 'written: x'))).toBeUndefined()
  })
  test('tokens that are not a lane: L4, L0, L33, L3cc, L3x, L12, bare L, no digit', () => {
    for (const t of ['lane L4', 'lane L0', 'lane L33', 'lane L3cc', 'lane L3x', 'lane L12', 'lane L', 'lane Lx', 'lane L3_', 'lane L3c1', 'lane L9', 'lane 3', 'lane']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
  })
  test('the word `lane` must stand alone: plane, lanes, lane-L3, a joined word', () => {
    for (const t of ['plane L3', 'lanes L3', 'lane-L3', 'xlane L1', 'lane_L2', 'planeL3', 'the lane, L3']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
  })
  test('no Stamp heading at all: undefined, whatever the file says about a lane', () => {
    expect(extractLane('')).toBeUndefined()
    expect(extractLane('# Launch\n\nlane L3c\n')).toBeUndefined()
    expect(extractLane(doc('## 1. Pickup', '```', 'x', '```', '## 6. Plan', 'lane L1'))).toBeUndefined()
  })
  test('headings that are not the Stamp heading: ### Stamp, # Stamp, Stamped, Stamps, Time Stamp, a mid-line Stamp', () => {
    for (const h of ['### Stamp', '# Stamp', '#### 12. Stamp', '## 12. Stamped', '## Stamps', '## Time Stamp', '## 12. Timestamp', 'Stamp', '12. Stamp', '## Stamp'.replace('##', '#!')]) {
      expect([h, extractLane(doc(h, 'written: x · lane L3c · y'))]).toEqual([h, undefined])
    }
    expect(extractLane(doc('text ## Stamp', 'lane L1'))).toBeUndefined()
  })
  test('an example Stamp inside an EARLIER fence is content, not the Stamp: the real one is used', () => {
    const t = doc('## 0. Template', '```md', '## 12. Stamp', 'written: x · lane L1 · y', '```', '', '## 12. Stamp', 'written: x · lane L3 · y')
    expect(extractLane(t)).toBe('L3')
    const tpl = doc('## 0. Template', '````md', '## 12. Stamp', '```text', 'lane L1', '```', '````', '', '## 12. Stamp', 'lane L2')
    expect(extractLane(tpl)).toBe('L2')
    expect(extractLane(doc('~~~', '## Stamp', 'lane L1', '~~~', '## Stamp', 'lane L3c'))).toBe('L3c')
  })
  test('a Stamp that exists only inside a fence is not found; nor is one after a fence that never closes', () => {
    expect(extractLane(doc('```md', '## 12. Stamp', 'lane L1', '```'))).toBeUndefined()
    expect(extractLane(doc('## 0. Notes', '```md', 'never closed', '## 12. Stamp', 'lane L1'))).toBeUndefined()
  })
  test('r3: two Stamp headings are ambiguous: undefined, whichever carries a lane (the r1/r2 reader took the first)', () => {
    expect(extractLane(doc('## 12. Stamp', 'written: x', '', '## 14. Stamp', 'lane L1'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L2', '', '## 14. Stamp', 'lane L1'))).toBeUndefined()
    expect(extractLane(doc('## Stamp', 'lane L1 (template)', '', '## 12. Stamp', 'lane L3'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '', '## Stamp', 'lane L3'))).toBeUndefined()
  })
  test('a non-string is nothing', () => {
    for (const v of [undefined, null, 7, {}, ['## Stamp', 'lane L1']]) expect(extractLane(v as never)).toBeUndefined()
  })
})

// ---- Review round 1 fixes (F1-F3): a wrong skip is the dangerous error, a wrong copy only restores 0.1.0's behaviour. ----
// So anything the extractor cannot read with confidence is `undefined`: a malformed token, a token that is not exactly one
// of the four lanes, or two tokens that disagree.
describe('R1-F1 a conflicting or malformed lane token reads as no lane', () => {
  test('R1-F1a tokens that merely START like a lane: L1c, L2c, L3cc, L3c-ish, L1.5, L1-L3, L1|L2|L3|L3c, L4', () => {
    for (const t of ['lane L4', 'lane L1c', 'lane L2c', 'lane L3cc', 'lane L3c-ish', 'lane L1.5', 'lane L1-L3', 'lane L1|L2|L3|L3c', 'lane L3/L3c', 'lane L1c.', 'lane L3c_x']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
  })
  test('R1-F1b two different lanes in the Stamp: undefined, in either order and with any separator', () => {
    for (const t of ['(was lane L1) · lane L3', 'previously lane L3c; now lane L3', 'lane L3, then lane L1', 'lane L1 · lane L3c', 'lane L3c · lane L3', 'lane: L2 / lane: L3', 'lane L3 (lane L1 was the old one)']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
    expect(extractLane(doc('## 12. Stamp', 'written: x · lane L3', 'previously lane L3c'))).toBeUndefined()
  })
  test('R1-F1c one valid lane next to an invalid one is still undefined (the invalid one may be the real one)', () => {
    expect(extractLane(brief('lane L4 · lane L3c'))).toBeUndefined()
    expect(extractLane(brief('lane L3c · lane L4'))).toBeUndefined()
    expect(extractLane(brief('lane L3c · lane L'))).toBeUndefined()
  })
  test('R1-F1d (inverted in r3) the same lane stated twice is no longer read: exactly ONE `lane` mention', () => {
    expect(extractLane(brief('lane L1 · and again lane L1'))).toBeUndefined()
    expect(extractLane(brief('lane L3c · Lane l3C'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'written: x · lane L3', 'lane: L3'))).toBeUndefined()
  })
  test('R1-F1e the plain spellings still read (a trailing full stop, a close paren, a middle dot)', () => {
    const cases: [string, string][] = [
      ['lane L3c', 'L3c'], ['lane: L3c)', 'L3c'], ['written: x · lane L3 · y', 'L3'], ['lane L3.', 'L3'], ['Re-probe. lane L3c.', 'L3c'],
      ['lane l3C', 'L3c'], ['lane L2;', 'L2'], ['lane L1, then', 'L1'], ['lane (L1)', 'L1'], ['lane L3·x', 'L3'],
    ]
    for (const [body, want] of cases) expect([body, extractLane(brief(body))]).toEqual([body, want])
  })
  // r3 changed the word-start rule: a `lane` counts unless an ASCII LETTER precedes it. So `sublane` and `plane` do not count, but a
  // hyphen or underscore does not hide it (`sub-lane`, `launch-lane`, `_lane_` all count), and every counted mention must be the only one.
  test('R1-F2 (changed in r3) `sub-lane` / `out-of-lane` now COUNT as the one mention; `sublane` and `plane` still do not', () => {
    expect(extractLane(brief('sub-lane L1'))).toBe('L1')
    expect(extractLane(brief('out-of-lane L1'))).toBe('L1')
    expect(extractLane(brief('sublane L1'))).toBeUndefined()
    expect(extractLane(brief('plane L1'))).toBeUndefined()
    expect(extractLane(brief('sub-lane L1 · lane L3c'))).toBeUndefined() // two mentions
    expect(extractLane(brief('out-of-lane L1 · lane L3'))).toBeUndefined()
    expect(extractLane(brief('xlane lane L3'))).toBe('L3') // the glued `xlane` is not a mention, the real one is
    expect(extractLane(brief('plane L1 lane L2'))).toBeUndefined() // `plane` is no mention, but the body now holds two lane-like tokens
  })
  test('R1-F2 (changed in r3) a prose word after `lane` is no longer exempt: `lane notes · lane L3c` is two mentions', () => {
    expect(extractLane(brief('lane notes · lane L3c'))).toBeUndefined()
    expect(extractLane(brief('lane notes'))).toBeUndefined()
  })
})

// ---- Review round 2 fixes. F1: a capture the extractor cannot read is AMBIGUOUS, not ignored. ----
describe('R2-F1 an unreadable capture makes the whole Stamp undefined', () => {
  test('R2-F1a the three probed failures: markdown around the token, backticks, a dash before it', () => {
    for (const t of ['lane: **L3** (earlier draft: lane L1)', 'lane: `L3` — not lane L3c', 'lane — L3 (was lane L1)']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
  })
  test('R2-F1b a digit, markdown, a dash, fullwidth letters or a mix after `lane` is a candidate that is not a lane', () => {
    for (const t of ['lane 3', 'lane 3 · lane L1', 'lane **L3**', 'lane `L3`', 'lane —', 'lane — L3', 'lane Ｌ３', 'lane L1.5', 'lane L1-L3', 'lane L1|L2', 'lane _L3_', 'lane *L3*', 'lane [L3]', 'lane "L3"', "lane 'L3'", 'lane #3', 'lane L3:', 'lane 3c']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
  })
  test('R2-F1c a word that starts with L is a candidate that is not a lane, even when a real lane sits beside it', () => {
    for (const t of ['lane Later', 'lane Low', 'lane Later · lane L3', 'lane L3 · lane Low', 'lane Lx', 'lane L']) {
      expect([t, extractLane(brief(t))]).toEqual([t, undefined])
    }
  })
  test('R2-F1d (inverted in r3) the prose-word exemption is gone: `lane notes`, `lane choice`, `lane was` beside a second mention are undefined', () => {
    expect(extractLane(brief('lane notes · lane L3'))).toBeUndefined()
    expect(extractLane(brief('lane choice · lane L3c'))).toBeUndefined()
    expect(extractLane(brief('lane choice: L3c'))).toBeUndefined() // `choice:` is the capture, and it is not a lane
    expect(extractLane(brief('the lane was L3'))).toBeUndefined() // `was` is the capture
    expect(extractLane(brief('lane was fine · lane L2'))).toBeUndefined()
    expect(extractLane(brief('lane notes.'))).toBeUndefined()
  })
  test('R2-F1e the plain spellings still read (r3: one mention each; the doubled ones are inverted)', () => {
    const cases: [string, string][] = [
      ['written: x · lane L3 · y', 'L3'], ['lane L3c', 'L3c'], ['lane: L3c)', 'L3c'], ['lane L3.', 'L3'], ['lane l3C', 'L3c'],
      ['Lane L2', 'L2'], ['lane (L1)', 'L1'], ['lane=L3c', 'L3c'],
    ]
    for (const [body, want] of cases) expect([body, extractLane(brief(body))]).toEqual([body, want])
    for (const body of ['lane L1 … lane L1', 'lane notes … lane L3']) expect([body, extractLane(brief(body))]).toEqual([body, undefined])
  })
})

// F2: a fence inside the Stamp that mentions `lane` makes the Stamp unreadable (it is neither read nor silently skipped).
describe('R2-F2 a fence inside the Stamp that mentions lane makes the Stamp unreadable', () => {
  test('R2-F2a the probed failure: the declaration sits in a fence with prose after it', () => {
    const t = doc('## 12. Stamp', '```text', 'written: x · lane L3', '```', '(not lane L1)')
    expect(extractLane(t)).toBeUndefined()
    expect(extractLane(brief(doc('```text', 'written: x · lane L3', '```', '(not lane L1)')))).toBeUndefined()
  })
  test('R2-F2b the probed failure: an unclosed fence after `lane L1 (template, delete)`', () => {
    const t = doc('## 12. Stamp', 'lane L1 (template, delete)', '```text', 'written: <when> · lane L3c')
    expect(extractLane(t)).toBeUndefined()
    expect(extractLane(brief(doc('lane L1 (template, delete)', '~~~', 'lane L3c')))).toBeUndefined()
  })
  test('R2-F2c a closed template fence that mentions lane makes a good lane around it undefined', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3c', '```text', 'lane L1', '```'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', '```text', 'lane L1', '```', 'lane L3c'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', '~~~', 'lane L1', '~~~', 'lane L3c'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', '````md', '```text', 'lane L1', '```', '````', 'lane L3c'))).toBeUndefined()
  })
  test('R2-F2d `lane` in any case, or inside a longer word, counts as mentioning it (the conservative direction)', () => {
    for (const inside of ['LANE L1', 'Lane: L1', 'plane L1', 'a sub-lane note', 'lanes']) {
      expect([inside, extractLane(doc('## 12. Stamp', 'lane L3', '```text', inside, '```'))]).toEqual([inside, undefined])
    }
  })
  test('R2-F2e a fence in the Stamp that does NOT mention lane is skipped as before', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3c', '```text', 'written: <when> · <note>', '```'))).toBe('L3c')
    expect(extractLane(doc('## 12. Stamp', '```sh', 'echo hi', '```', 'lane L3'))).toBe('L3')
    expect(extractLane(doc('## 12. Stamp', 'lane L1', '```text', 'never closed, no mention'))).toBe('L1') // an unclosed fence with no mention hides the rest, as before
  })
  test('R2-F2f a fence outside the Stamp section never matters: before it, or after it', () => {
    expect(extractLane(doc('## 0. Notes', '```text', 'lane L1', '```', '', '## 12. Stamp', 'lane L3c'))).toBe('L3c')
    expect(extractLane(doc('## 12. Stamp', 'lane L3c', '', '## 13. Notes', '```text', 'lane L1', '```'))).toBe('L3c')
  })
  test('R2-F2g a lane mentioned only inside a fence in the Stamp stays undefined (no token outside it)', () => {
    expect(extractLane(doc('## 12. Stamp', '```text', 'lane L1', '```'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'written: x', '```text', 'lane L1'))).toBeUndefined()
  })
  test('R2-F2h a fence inside an HTML comment is not a fence: the comment is removed first', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '<!--', '```text', 'lane L1', '```', '-->'))).toBe('L3')
  })
})

// F4: a removed HTML comment leaves a separator, so it cannot glue the text on either side of it into one token.
describe('R2-F4 a removed HTML comment leaves a separator', () => {
  test('`lane L3<!-- c -->c` reads L3 (a space where the comment was), not L3c', () => {
    expect(extractLane(brief('lane L3<!-- c -->c'))).toBe('L3')
    expect(extractLane(brief('lane L3<!-- -->c'))).toBe('L3')
  })
  test('the same separator inside the token: `lane L<!-- c -->3` is no lane (contrast: `lane<!-- c -->L3` reads either way)', () => {
    expect(extractLane(brief('lane<!-- c -->L3'))).toBe('L3')
    expect(extractLane(brief('lane L<!-- c -->3'))).toBeUndefined() // `L` then a space then `3`: the capture `L` is not a lane
  })
  test('a multi-line comment between two words still separates them', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3<!--', 'x', '-->c'))).toBe('L3')
  })
  test('a word glued to `lane` by a comment is split off too: `p<!-- c -->lane L3` has `lane` standing alone', () => {
    expect(extractLane(brief('p<!-- c -->lane L3'))).toBe('L3')
  })
})

describe('R1-F1 what is not the Stamp: fenced templates and HTML comments', () => {
  // R2-F2 changed these: a fence in the Stamp that mentions `lane` is no longer silently skipped, it makes the Stamp unreadable.
  test('a fenced template that mentions lane, ahead of the real line, makes the Stamp unreadable (r2 F2; it read the real lane in r1)', () => {
    const t = doc('## 12. Stamp', 'Fill in:', '```text', 'written: <when> · lane L1 · <note>', '```', 'written: x · lane L3 · y')
    expect(extractLane(t)).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', '~~~', 'lane L1', '~~~', 'lane L3c'))).toBeUndefined()
  })
  test('a fenced template that does NOT mention lane, ahead of the real line, is skipped and the real lane reads', () => {
    const t = doc('## 12. Stamp', 'Fill in:', '```text', 'written: <when> · <note>', '```', 'written: x · lane L3 · y')
    expect(extractLane(t)).toBe('L3')
    expect(extractLane(doc('## 12. Stamp', '~~~', 'x', '~~~', 'lane L3c'))).toBe('L3c')
  })
  test('a lane that exists only inside a fence within the Stamp is not read; nor is one after a fence that never closes', () => {
    expect(extractLane(doc('## 12. Stamp', '```text', 'lane L1', '```'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'written: x', '```text', 'lane L1'))).toBeUndefined()
  })
  test('a Stamp inside <!-- --> ahead of a real Stamp: the real one is read', () => {
    expect(extractLane(doc('<!--', '## 12. Stamp', 'lane L1', '-->', '', '## 12. Stamp', 'lane L3'))).toBe('L3')
    expect(extractLane(doc('<!-- ## 12. Stamp lane L1 -->', '## 12. Stamp', 'lane L3'))).toBe('L3')
  })
  test('a Stamp that exists only inside a comment is not the Stamp', () => {
    expect(extractLane(doc('<!--', '## 12. Stamp', 'lane L1', '-->'))).toBeUndefined()
    expect(extractLane(doc('# x', '<!-- ## Stamp', 'lane L1 -->'))).toBeUndefined()
  })
  test('a token inside a comment within the real Stamp is not read, so it cannot make a conflict or a lane', () => {
    expect(extractLane(brief('lane L3 <!-- lane L1 -->'))).toBe('L3')
    expect(extractLane(brief('written: x <!-- lane L1 -->'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L3c', '<!--', 'lane L2', '-->'))).toBe('L3c')
  })
  test('an unterminated `<!--` is left as it is: the text around it is read as written', () => {
    expect(extractLane(brief('lane L3 <!-- never closed'))).toBe('L3')
    expect(extractLane(brief('<!-- lane L1'))).toBe('L1')
  })
})

// ---- Fold r3 (the last round): the tolerant reader is replaced by a STRICT one. A lane is read only from the least ambiguous
// Stamp there can be: ONE `## Stamp` heading, ONE `lane` mention in its non-fenced body, ONE lane-like token (`\bL[123]c?\b`) in
// that body, and that token is exactly L1, L2, L3 or L3c. Everything else is `undefined`, i.e. 0.1.0's copy-and-"paste".
describe('R3-A the strict Stamp reads a lane: one heading, one mention, one lane-like token', () => {
  test('the real example, and the spellings a brief really uses', () => {
    const cases: [string, string][] = [
      ['written: 2026-01-15T09:00Z (previous chat, closing) · lane L3 · re-probe any dated claim before acting.', 'L3'],
      ['lane L3c', 'L3c'],
      ['lane: L3c)', 'L3c'],
      ['written: x · lane L3 · y', 'L3'],
      ['lane L3.', 'L3'],
      ['lane l3C', 'L3c'],
      ['lane L3, child session', 'L3'],
      ['lane: L3 child session (start_session…)', 'L3'],
      ['(lane L3, child session; parent local_ id not available to the intake context)', 'L3'],
      ['launch-lane: L3', 'L3'], // a hyphen or underscore before `lane` does not hide it: it is the one mention
      ['lane L3 <!-- L1 -->', 'L3'], // a comment is removed first, so its token is not counted
    ]
    for (const [body, want] of cases) expect([body, extractLane(brief(body))]).toEqual([body, want])
  })
  test('CRLF line endings', () => {
    expect(extractLane(brief('written: x · lane L3 · y').split('\n').join('\r\n'))).toBe('L3')
    expect(extractLane(doc('## 12. Stamp', 'lane L3c', '# Appendix', 'lane L1').split('\n').join('\r\n'))).toBe('L3c')
  })
  test('the Stamp heading: `## Stamp`, `## 12. Stamp`, and `## 12. Stamp (lane)` whose own `lane` is excluded from the count', () => {
    for (const h of ['## Stamp', '## 12. Stamp', '## 12. Stamp (lane)', '## 12. Stamp (lane L1)', '## 12. Stamp (L1, L2)', '## Stamp :', '## Stamp (x) :', '## Stamp(x)', '## Stamp  ', '## Stamp:  ']) {
      expect([h, extractLane(brief('written: x · lane L3 · y', h))]).toEqual([h, 'L3'])
    }
  })
  test('a long run of spaces after `Stamp` does not make the heading test super-linear (and is no heading when text follows)', () => {
    const t0 = Date.now()
    expect(extractLane(brief('lane L3', `## Stamp${' '.repeat(30000)}x`))).toBeUndefined()
    expect(extractLane(brief('lane L3', `## Stamp${' '.repeat(30000)}`))).toBe('L3')
    expect(Date.now() - t0).toBeLessThan(2000)
  })
  test('a fence inside the Stamp that holds a heading-looking line but no `lane` does not truncate it', () => {
    expect(extractLane(doc('## 12. Stamp', '```text', '## Notes', '```', 'lane L3'))).toBe('L3')
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '~~~', '## Notes', '# Appendix', '~~~'))).toBe('L3')
  })
  test('a lane-like token inside a fence that does not say `lane` is not counted (only the non-fenced body is)', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '```text', 'L1', '```'))).toBe('L3')
  })
  test('a `#word` or `#3` line is not a heading, and four spaces of indent are not a heading either: the section goes on', () => {
    expect(extractLane(doc('## 12. Stamp', '#3 in the queue', 'lane L3'))).toBe('L3')
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '    ## 13. Notes', 'lane L1'))).toBeUndefined() // still the Stamp: two mentions
  })
})

describe('R3-B a level 1 or 2 heading of any shape ends the Stamp section; a lane below it is not read (r4: `###` and deeper do not)', () => {
  const enders = ['# Appendix', ' ## 13. Notes', '  ## 13. Notes', '   ## 13. Notes', '##', '#', '## 13. Notes', ' # Appendix', '##\tNotes']
  test('a lane below the heading is not read: no lane above it is undefined', () => {
    for (const h of enders) expect([h, extractLane(doc('## 12. Stamp', 'written: x', h, 'lane L1'))]).toEqual([h, undefined])
  })
  test('a lane above the heading still reads, and a different lane below it cannot conflict', () => {
    for (const h of enders) expect([h, extractLane(doc('## 12. Stamp', 'written: x · lane L3 · y', h, 'lane L1'))]).toEqual([h, 'L3'])
  })
  test('the same on the Stamp as the last section before a heading with its own lane-like tokens', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3c', '', '## 13. Plan', 'run lane L1 or L2'))).toBe('L3c')
  })
})

describe('R3-C the list class: more than one lane-like token in the body is undefined (the r1/r2 reader took the first)', () => {
  const LISTS = [
    'lane L1 or L3', 'lane L1, L3', 'lane L1,L3', 'lane L1;L3', 'lane L1/L3 with spaces', 'lane L1 & L3', 'lane: L1 | L2 | L3 | L3c',
    'lane (L1, L2, L3, L3c)', 'lane L3 (was L1)', 'lane L3 and L3c', 'lane L3 · fallback L1', 'lane L1 L3',
    'lane L3 sublane L1', 'lane L3 (a plane L1 sketch)', // glued `lane` is no mention, but its token still counts as a second token
  ]
  test('every list, gloss and pair is undefined', () => {
    for (const t of LISTS) expect([t, extractLane(brief(t))]).toEqual([t, undefined])
  })
  test('a second token on another line of the body counts too', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', 'fallback: L1'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L3 <!-- note -->', 'ok'))).toBe('L3')
  })
  test('a lane-like token with no `lane` mention at all is undefined', () => {
    for (const t of ['L3', 'written: x · L3c · y', 'lane-ish L3']) expect([t, extractLane(brief(t))]).toEqual([t, undefined])
  })
})

describe('R3-D the glued / prose class: a prose word, a second mention or an odd prefix is undefined (the r1/r2 reader skipped or took one)', () => {
  const PROSE = [
    'lane is L3', 'lane TBD', 'lane choice: L3c', 'lane, L3', 'lane) L3', 'lane; L3', 'lane· L3',
    'lane is L3 (earlier draft: lane L1)', 'the lane is L3, not lane L1', 'lane set to L3 · lane L1 rejected',
    'lane will be L3 (lane L3c was dropped)', 'lane TBD · lane L1',
    'launch-lane: L3 (was lane L1)', 'launch_lane: L3 (was lane L1)', '_lane_: L3 (was lane L1)', '__lane__: L3 (was lane L1)',
    '_lane_: L3', '__lane__: L3', 'lanes L3', 'lanes: L3', 'laneL3',
    'lane: **L3** (earlier draft: lane L1)', 'lane: `L3` — not lane L3c', 'lane — L3 (was lane L1)', // the three r2 probes
    'lane Ｌ３', 'lane 3', 'lane L1.5', 'lane L', 'lane', 'plane L3', 'sublane L3', 'xlane L1',
  ]
  test('every one is undefined', () => {
    for (const t of PROSE) expect([t, extractLane(brief(t))]).toEqual([t, undefined])
  })
  test('the same text on separate lines of the body is still two mentions', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '(earlier draft: lane L1)'))).toBeUndefined()
  })
  test('a single mention that negates itself reads as written: this is the one residual class parsing cannot fix', () => {
    expect(extractLane(brief('this is NOT lane L3c'))).toBe('L3c')
    expect(extractLane(brief('not lane L1'))).toBe('L1')
  })
})

describe('R3-E the Stamp section itself: zero or two Stamp headings, no lane, a fence that mentions lane', () => {
  test('a Stamp with no `lane` is undefined; so is an empty one', () => {
    expect(extractLane(doc('## 12. Stamp', 'written: 2026-01-15T09:00Z · re-probe any dated claim before acting.'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', ''))).toBeUndefined()
  })
  test('`## 3. Stamp-ready checklist` is not a Stamp heading, with or without a lane under it', () => {
    expect(extractLane(doc('## 3. Stamp-ready checklist'))).toBeUndefined()
    expect(extractLane(doc('## 3. Stamp-ready checklist', 'lane L3'))).toBeUndefined()
    expect(extractLane(doc('## 3. Stamp-ready checklist', 'lane L3', '', '## 12. Stamp', 'written: x'))).toBeUndefined()
    expect(extractLane(doc('## 3. Stamp-ready checklist', 'x', '', '## 12. Stamp', 'lane L3'))).toBe('L3') // the real one beside it still reads
  })
  test('a heading with words after Stamp is not a Stamp heading: it is not read (the r1/r2 reader accepted `Stamp and lane notes`)', () => {
    for (const h of ['## 3. Stamp and lane notes', '## Stamp - lane L3', '## 12. Stamp lane L1', '## Stamp (lane) now', '## Stamp: written']) {
      expect([h, extractLane(brief('lane L3', h))]).toEqual([h, undefined])
    }
  })
  test('two Stamp sections are ambiguous', () => {
    expect(extractLane(doc('## Stamp', 'lane L1 (template)', '', '## 12. Stamp', 'lane L3'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '## Stamp', 'lane L3'))).toBeUndefined()
  })
  test('a Stamp heading inside a fence is not a heading: with one real Stamp it reads, with none it is undefined', () => {
    expect(extractLane(doc('```md', '## Stamp', 'lane L1', '```', '## 12. Stamp', 'lane L3'))).toBe('L3')
    expect(extractLane(doc('```md', '## Stamp', 'lane L1', '```'))).toBeUndefined()
  })
  test('a fence in the Stamp that mentions lane is undefined, however it is spelled', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '```text', 'lane L1', '```'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '```lane', 'x', '```'))).toBeUndefined() // the info string is part of the fence
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '~~~', 'Lane notes', '~~~'))).toBeUndefined()
  })
})

describe('R3-F section boundaries and fences', () => {
  test('a fence that holds `## Notes` and `lane L1 (delete)` inside the Stamp is undefined (the fence mentions lane)', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '```text', '## Notes', 'lane L1 (delete)', '```'))).toBeUndefined()
    expect(extractLane(doc('## 12. Stamp', '```text', '## Notes', 'lane L1 (delete)', '```', 'lane L3'))).toBeUndefined()
  })
  test('a fence that holds `## Notes` with no `lane`, then the real `lane L3` after it, reads L3', () => {
    expect(extractLane(doc('## 12. Stamp', '```text', '## Notes', '```', 'lane L3'))).toBe('L3')
    expect(extractLane(doc('## 12. Stamp', '```text', '## Notes', '```', 'lane L3', '', '## 13. Notes', 'lane L1'))).toBe('L3')
  })
  test('a heading-looking line inside a fence does not end the section, so a lane below it still counts as a second mention', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '```text', '# not a heading', '```', 'lane L1'))).toBeUndefined()
  })
  test('a stray unclosed fence before the Stamp hides it: undefined', () => {
    expect(extractLane(doc('```text', 'oops', '', '## 12. Stamp', 'lane L3'))).toBeUndefined()
  })
  test('an HTML comment is replaced by one space first, even across lines and around the Stamp heading', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '<!--', '## Notes', 'lane L1', '-->', 'x'))).toBe('L3')
    expect(extractLane(doc('<!-- ## Stamp -->', '## 12. Stamp', 'lane L3'))).toBe('L3')
  })
  test('documented limit: the comment stripper is not Markdown-aware, so a backticked `<!--` can swallow the real lane', () => {
    // The backticked `<!--` opens a "comment" that runs to the next `-->`; the real `lane L3` is inside it and the stale mention reads.
    expect(extractLane(doc('## 12. Stamp', 'lane L1 (draft)', 'see `<!--` here: lane L3 -->'))).toBe('L1')
    // With no stale mention left behind there is nothing to read.
    expect(extractLane(doc('## 12. Stamp', 'see `<!--` here: lane L3 -->'))).toBeUndefined()
  })
})

describe('R3-G sample Stamp lines in the shapes real briefs used', () => {
  test('the three that follow the playbook convention (one `lane L<n>`, nothing else lane-like) read L3', () => {
    // the template's own line
    expect(extractLane(doc('## 12. Stamp', 'written: 2026-01-15T09:00Z (previous chat, closing) · lane L3 · re-probe any dated claim before acting.'))).toBe('L3')
    // a lane with a gloss after a comma
    expect(extractLane(doc('## 12. Stamp', '', 'written: 2026-01-15T10:30Z (lane L3, child session; parent local_ id not available to the intake context)'))).toBe('L3')
    // a lane with a colon and a parenthesised note
    expect(extractLane(doc('## Stamp', 'written: 2026-01-15T11:45Z · lane: L3 child session (start_session, fresh, opus, high) · parent: local_00000000-0000-4000-8000-000000000001 · re-probe any dated claim before acting', ''))).toBe('L3')
  })
  test('a Stamp written as a top-level `# Stamp` heading is not a Stamp heading: no lane (copy and "paste")', () => {
    // a brief with a top-level `# Stamp` then `lane:L1; re-probe any dated claim before acting.`
    expect(extractLane(doc('# Stamp', '', 'lane:L1; re-probe any dated claim before acting.'))).toBeUndefined()
  })
})

// ---- Fold r4 (c): the Stamp section ends only at `#` / `##` headings; `###` and deeper stay inside it. ----
describe('R4 the Stamp section ends only at level 1 and 2 headings', () => {
  const deeper = ['### Detail', '#### Detail', '##### Detail', '###### Deep', '### Provenance', ' ### Detail', '   #### x']
  test('a benign sub-heading keeps its lane (the sub-heading is body text without a lane of its own)', () => {
    for (const h of deeper) expect([h, extractLane(doc('## 12. Stamp', 'written: x · lane L3 · y', h, 'parent: local_0000'))]).toEqual([h, 'L3'])
  })
  test('a lane below a sub-heading counts: a stale lane above it makes two mentions (undefined), never a stale win', () => {
    for (const h of deeper) {
      expect([h, extractLane(doc('## 12. Stamp', 'lane L1 (stale)', h, 'lane L3'))]).toEqual([h, undefined])
      expect([h, extractLane(doc('## 12. Stamp', 'written: x', h, 'lane L3c'))]).toEqual([h, 'L3c'])
    }
  })
  test('the sub-heading text is body: a lane-like token in it is a second token', () => {
    expect(extractLane(doc('## 12. Stamp', 'lane L3', '### Plan L1'))).toBeUndefined()
  })
  test('a `# Appendix`, a `## 13. Notes`, an indented one and a bare `##` still end it, after a sub-heading too', () => {
    for (const h of ['# Appendix', '## 13. Notes', ' ## 13. Notes', '   ## 13. Notes', '##']) {
      expect([h, extractLane(doc('## 12. Stamp', 'lane L3', '### Detail', 'x', h, 'lane L1'))]).toEqual([h, 'L3'])
      expect([h, extractLane(doc('## 12. Stamp', 'written: x', '### Detail', 'x', h, 'lane L1'))]).toEqual([h, undefined])
    }
  })
})
