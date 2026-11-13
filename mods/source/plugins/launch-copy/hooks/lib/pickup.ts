// Pure: pulls the "Pickup" block out of a LAUNCH.md. No `$`, no I/O.
//
// The contract (design note M7): the FIRST line matching /^##\s+(\d+\.\s*)?Pickup\b/i that is
// not inside a fenced region is the heading (`#` and `###` are not; an example heading in an earlier fence is content);
// the block is the first fenced code block after it and before the next line starting `## `. A fence is three or more
// backticks or tildes with an optional info string; it closes on the same character at least as long, and it must close
// BEFORE the next line starting `## `: a pickup is a prompt line, so a `## ` line met while looking for the closer means
// the fence was never closed, and a later section's fence must not close it (F1). Anything that cannot be read with
// confidence is "not found" (undefined), never a best guess: a pickup taken from the wrong place is put on the
// clipboard as if it were the brief.

/** A pickup is a prompt line, not a document: over this many UTF-8 bytes it is treated as not found. */
export const PICKUP_MAX_BYTES = 8192

const HEADING = /^##\s+(\d+\.\s*)?Pickup\b/i
/** A line that starts the next section for the Pickup (`## `, not `###`). The Stamp reader (./lane) ends on any ATX heading instead. */
export const NEXT_SECTION = /^##\s/
const OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/

/** UTF-8 length of `s` without TextEncoder (the plugin environment need not have one). */
function utf8Bytes(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 0x80) n += 1
    else if (c < 0x800) n += 2
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      n += 4
      i++
    } else n += 3
  }
  return n
}

/** The opening fence on `line` as `[char, length]`, else undefined. A backtick fence's info string has no backtick. */
function openingFence(line: string): [string, number] | undefined {
  const m = OPEN.exec(line)
  if (m === null) return undefined
  const run = m[1]
  if (run[0] === '`' && m[2].includes('`')) return undefined
  return [run[0], run.length]
}

/** True when `line` closes a fence of `char` opened with `len` characters. */
function closesFence(line: string, char: string, len: number): boolean {
  const m = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)
  return m !== null && m[1][0] === char && m[1].length >= len
}

/**
 * The index of the line that closes the fence opened at `open`, or -1. With `stopAtSection` the search ends at the first
 * line starting `## ` (that line is never a closer): a fence opened inside a section does not close in a later one.
 */
function closingLine(lines: string[], open: number, fence: [string, number], stopAtSection: boolean): number {
  for (let j = open + 1; j < lines.length; j++) {
    if (stopAtSection && NEXT_SECTION.test(lines[j])) return -1
    if (closesFence(lines[j], fence[0], fence[1])) return j
  }
  return -1
}

/**
 * The first line matching `heading` OUTSIDE any fenced region (an example heading inside an earlier fence is content), or
 * -1. A fence met on the way that never closes runs to the end of the file, so nothing after it is a heading.
 * Shared with ./lane (the Stamp heading), so a fence is skipped the same way for both.
 */
export function findHeadingLine(lines: string[], heading: RegExp): number {
  for (let i = 0; i < lines.length; i++) {
    const fence = openingFence(lines[i])
    if (fence !== undefined) {
      const close = closingLine(lines, i, fence, false)
      if (close < 0) return -1
      i = close
    } else if (heading.test(lines[i])) return i
  }
  return -1
}

/**
 * For every line of `lines`, whether it sits in a fenced region (each fence's opener and closer lines included, so an info
 * string such as ```` ```lane ```` is part of the region). A fence that never closes runs to the end of `lines`. Computed over
 * the WHOLE text, so a heading-looking line inside a fence is never a heading and never ends a section. Shared with ./lane.
 */
export function fenceMask(lines: string[]): boolean[] {
  const mask: boolean[] = lines.map(() => false)
  for (let i = 0; i < lines.length; i++) {
    const fence = openingFence(lines[i])
    if (fence === undefined) continue
    const close = closingLine(lines, i, fence, false)
    const last = close < 0 ? lines.length - 1 : close
    for (let j = i; j <= last; j++) mask[j] = true
    i = last
  }
  return mask
}

/**
 * `lines` split by fenced region: `outside` is every line that is not in a fence, `fenced` is every line that is (see
 * `fenceMask`). A fence that never closes runs to the end of `lines`: everything from its opener on is `fenced`.
 */
export function splitFences(lines: string[]): { outside: string[]; fenced: string[] } {
  const mask = fenceMask(lines)
  return { outside: lines.filter((_, i) => !mask[i]), fenced: lines.filter((_, i) => mask[i]) }
}

/**
 * `lines` without any fenced region (the fence lines themselves included). A fence that never closes runs to the end, so
 * everything from its opener on is dropped. Shared with ./lane: a template fence inside the Stamp is not the lane.
 */
export function linesOutsideFences(lines: string[]): string[] {
  return splitFences(lines).outside
}

/**
 * The inner text of the first fenced block under the first Pickup heading, CRLF normalised to LF and trailing newlines
 * trimmed, or undefined: no heading, no fence before the next `## ` heading, a fence not closed before the next `## `
 * heading (a pickup is a prompt line, so a `## ` line inside it means it was never closed), an empty block, or a block
 * over PICKUP_MAX_BYTES.
 */
export function extractPickup(text: string): string | undefined {
  if (typeof text !== 'string') return undefined
  const lines = text.split(/\r\n|\n/)
  const h = findHeadingLine(lines, HEADING)
  if (h < 0) return undefined
  for (let i = h + 1; i < lines.length; i++) {
    const line = lines[i]
    const fence = openingFence(line)
    if (fence === undefined) {
      if (NEXT_SECTION.test(line)) return undefined
      continue
    }
    const close = closingLine(lines, i, fence, true)
    if (close < 0) return undefined // unclosed before the next section
    const inner = lines.slice(i + 1, close).join('\n').replace(/\n+$/, '')
    if (inner.trim() === '') return undefined
    return utf8Bytes(inner) > PICKUP_MAX_BYTES ? undefined : inner
  }
  return undefined
}
