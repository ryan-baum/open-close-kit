// Pure logic (hooks/lib/pickup.ts), no `$`. L1: what must be found, and found exactly. L2: what must NOT be found
// (every false-accept the spec names). Both directions: a pickup taken from the wrong place is copied to the
// clipboard as if it were the brief, which is worse than copying nothing.
import { describe, expect, test } from 'claude-code/testing'

import { PICKUP_MAX_BYTES, extractPickup } from '../hooks/lib/pickup'

const LINE = 'Read ~/work/20260101-0900_example/CONTRACT.md and execute lane L3.'
const doc = (...lines: string[]) => lines.join('\n')

describe('L1 extraction finds the block exactly', () => {
  test('## 1. Pickup with a ```text fence', () => {
    const t = doc('# Launch', '', '## 1. Pickup', '', '```text', LINE, '```', '', '## 2. Goal', 'x')
    expect(extractPickup(t)).toBe(LINE)
  })
  test('## Pickup (no number)', () => {
    expect(extractPickup(doc('## Pickup', '```', LINE, '```'))).toBe(LINE)
  })
  test('## 1. Pickup (lane L3): trailing words on the heading', () => {
    expect(extractPickup(doc('## 1. Pickup (lane L3)', '', '```bash', LINE, '```'))).toBe(LINE)
  })
  test('heading is case-insensitive on Pickup and tolerates ## 1.Pickup', () => {
    expect(extractPickup(doc('## 1. PICKUP', '```', LINE, '```'))).toBe(LINE)
    expect(extractPickup(doc('## pickup', '```', LINE, '```'))).toBe(LINE)
    expect(extractPickup(doc('## 1.Pickup', '```', LINE, '```'))).toBe(LINE)
  })
  test('~~~ fence', () => {
    expect(extractPickup(doc('## 1. Pickup', '~~~', LINE, '~~~'))).toBe(LINE)
    expect(extractPickup(doc('## 1. Pickup', '~~~text', LINE, '~~~'))).toBe(LINE)
  })
  test('a 4-backtick outer fence holding a 3-backtick inner fence keeps the inner one as content', () => {
    const t = doc('## 1. Pickup', '````text', 'run this:', '```bash', 'echo hi', '```', 'then stop', '````', '## 2. Goal')
    expect(extractPickup(t)).toBe(doc('run this:', '```bash', 'echo hi', '```', 'then stop'))
  })
  test('a ~~~ fence holding ``` lines, and a ``` fence holding ~~~ lines (the closer is the same character)', () => {
    expect(extractPickup(doc('## Pickup', '~~~', '```', 'x', '```', '~~~'))).toBe(doc('```', 'x', '```'))
    expect(extractPickup(doc('## Pickup', '```', '~~~', 'x', '~~~', '```'))).toBe(doc('~~~', 'x', '~~~'))
  })
  test('a longer closing fence closes; a shorter one does not', () => {
    expect(extractPickup(doc('## Pickup', '```', LINE, '`````'))).toBe(LINE)
    expect(extractPickup(doc('## Pickup', '````', LINE, '```', 'more', '````'))).toBe(doc(LINE, '```', 'more'))
  })
  test('CRLF is normalised to LF; the trailing newline is trimmed', () => {
    const t = ['## 1. Pickup', '', '```text', 'line one', 'line two', '```', '', '## 2. Goal'].join('\r\n') + '\r\n'
    expect(extractPickup(t)).toBe('line one\nline two')
  })
  test('a multi-line block with blank lines and indentation is returned as written', () => {
    expect(extractPickup(doc('## Pickup', '```', 'a', '', '  b', '```'))).toBe('a\n\n  b')
  })
  test('F2 a `## 1. Pickup` example inside an EARLIER fence is not the heading: the real block is returned', () => {
    const md = doc('## 0. Notes', '```md', '## 1. Pickup', 'EXAMPLE LINE', '```', '', '## 1. Pickup', '```text', LINE, '```')
    expect(extractPickup(md)).toBe(LINE)
    const tpl = doc('## 0. Template', '````md', '## 1. Pickup', '```text', 'TEMPLATE LINE', '```', '````', '', '## 1. Pickup', '', '```text', LINE, '```')
    expect(extractPickup(tpl)).toBe(LINE)
  })
  test('F2 a tilde fence earlier holding a Pickup example is skipped too; the fence-skipping does not eat the real heading', () => {
    expect(extractPickup(doc('~~~', '## Pickup', '```', 'EXAMPLE', '```', '~~~', '## Pickup', '```', LINE, '```'))).toBe(LINE)
    expect(extractPickup(doc('```js', 'const a = 1', '```', '## Pickup', '```', LINE, '```'))).toBe(LINE)
  })
  test('F2 a Pickup heading that exists only inside a fence is not found', () => {
    expect(extractPickup(doc('```md', '## 1. Pickup', 'EXAMPLE', '```'))).toBeUndefined()
  })
  test('F2 a Pickup-looking heading inside an earlier fence is content even when the fence is sloppy: not found, never the example', () => {
    expect(extractPickup(doc('## 0. Notes', '```md', 'oops', '## 1. Pickup', '```', LINE, '```'))).toBe(undefined)
  })
  test('prose between the heading and the fence is skipped', () => {
    expect(extractPickup(doc('## 1. Pickup', '', 'Paste this into a new chat:', '', '```text', LINE, '```'))).toBe(LINE)
  })
  test('only the first fence is taken', () => {
    expect(extractPickup(doc('## Pickup', '```', 'first', '```', '```', 'second', '```'))).toBe('first')
  })
  test('the 8 KB cap is inclusive: exactly 8192 bytes is found', () => {
    const body = 'a'.repeat(PICKUP_MAX_BYTES)
    expect(PICKUP_MAX_BYTES).toBe(8192)
    expect(extractPickup(doc('## Pickup', '```', body, '```'))).toBe(body)
  })
})

describe('L2 extraction false-accepts: not found', () => {
  test('a fence under ## 2. Goal only (no Pickup heading)', () => {
    expect(extractPickup(doc('# Launch', '## 2. Goal', '```text', LINE, '```'))).toBeUndefined()
  })
  test('### Pickup and # Pickup are not the heading', () => {
    expect(extractPickup(doc('### Pickup', '```', LINE, '```'))).toBeUndefined()
    expect(extractPickup(doc('# Pickup', '```', LINE, '```'))).toBeUndefined()
    expect(extractPickup(doc('#### 1. Pickup', '```', LINE, '```'))).toBeUndefined()
  })
  test('## Pickups / ## Pickup-ish words do not match (word boundary)', () => {
    expect(extractPickup(doc('## Pickups', '```', LINE, '```'))).toBeUndefined()
    expect(extractPickup(doc('## Pickupline', '```', LINE, '```'))).toBeUndefined()
  })
  test('a heading text that merely mentions Pickup later in the line does not match', () => {
    expect(extractPickup(doc('## 1. The Pickup', '```', LINE, '```'))).toBeUndefined()
  })
  test('the heading with no fence before the next ## is not found, and does NOT take the next section\'s fence', () => {
    const t = doc('## 1. Pickup', 'Paste the line from the Goal section.', '', '## 2. Goal', '```text', 'SECRET OTHER BLOCK', '```')
    expect(extractPickup(t)).toBeUndefined()
  })
  test('a ### sub-heading under Pickup does not end the section', () => {
    expect(extractPickup(doc('## 1. Pickup', '### The line', '```', LINE, '```'))).toBe(LINE)
  })
  test('an empty block, and a whitespace-only block', () => {
    expect(extractPickup(doc('## Pickup', '```', '```'))).toBeUndefined()
    expect(extractPickup(doc('## Pickup', '```text', '', '   ', '```'))).toBeUndefined()
  })
  test('over 8 KB: 8193 bytes is not found; multi-byte characters count as bytes', () => {
    expect(extractPickup(doc('## Pickup', '```', 'a'.repeat(PICKUP_MAX_BYTES + 1), '```'))).toBeUndefined()
    expect(extractPickup(doc('## Pickup', '```', 'é'.repeat(PICKUP_MAX_BYTES / 2 + 1), '```'))).toBeUndefined()
    expect(extractPickup(doc('## Pickup', '```', 'é'.repeat(PICKUP_MAX_BYTES / 2), '```'))).toBe('é'.repeat(PICKUP_MAX_BYTES / 2))
  })
  test('F1 a `## ` line inside the Pickup fence ends the search: the fence is unclosed, not found (a pickup is a prompt line)', () => {
    expect(extractPickup(doc('## Pickup', '```', 'intro', '## not a heading', 'tail', '```'))).toBeUndefined()
  })
  test('F1 an unclosed Pickup fence is NOT closed by a later section\'s bare fence', () => {
    const t = doc('## 1. Pickup', '```text', 'Read the contract and go', '', '## 2. Goal', 'do the thing', '', '## 3. Verify', '```', 'bun test', '```')
    expect(extractPickup(t)).toBeUndefined()
  })
  test('F1 a fence opened in Pickup that would close in the next section is not found (any fence style)', () => {
    expect(extractPickup(doc('## Pickup', '````text', 'a', '## 2. Goal', 'b', '````'))).toBeUndefined()
    expect(extractPickup(doc('## Pickup', '~~~', 'a', '## 2. Goal', 'b', '~~~'))).toBeUndefined()
    expect(extractPickup(doc('## Pickup', '```', 'a', '##\tTabbed', 'b', '```'))).toBeUndefined()
  })
  test('F1 a closer on the line just before the next ## still closes (the boundary is a line, not a region)', () => {
    expect(extractPickup(doc('## Pickup', '```', 'a', '```', '## 2. Goal', '```', 'b', '```'))).toBe('a')
  })
  test('an unclosed fence is not found (it does not run to the end of the file)', () => {
    expect(extractPickup(doc('## Pickup', '```text', LINE))).toBeUndefined()
    expect(extractPickup(doc('## Pickup', '````', LINE, '```'))).toBeUndefined()
  })
  test('a ``` run that carries a backtick after it is inline code, not a fence opener', () => {
    expect(extractPickup(doc('## Pickup', '```not a fence```', 'text'))).toBeUndefined()
  })
  test('only the FIRST Pickup heading is considered: when it has no fence, a later Pickup heading is not used', () => {
    const t = doc('## Pickup', 'none here', '## Pickup again', '```', LINE, '```')
    expect(extractPickup(t)).toBeUndefined()
  })
  test('junk in: empty string, no headings, non-strings', () => {
    expect(extractPickup('')).toBeUndefined()
    expect(extractPickup('just text')).toBeUndefined()
    expect(extractPickup(undefined as never)).toBeUndefined()
    expect(extractPickup(42 as never)).toBeUndefined()
  })
})
