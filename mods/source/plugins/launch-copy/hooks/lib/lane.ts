// Pure: reads the launch lane out of a LAUNCH.md's Stamp section. No `$`, no I/O.
//
// The contract (design note M9): **a wrong skip is the dangerous error, a wrong
// copy only restores 0.1.0's behaviour**, so a lane is read only from the least ambiguous Stamp there can be, and everything
// else is "no lane" (undefined). The caller then keeps the copy-and-"paste" behaviour. Rounds 1 and 2 tried to UNDERSTAND free
// prose around the token and every patch moved the surface (first token wins, unreadable tokens dropped, lists read as their
// first token, a true declaration the scan dropped let a stale one win, section boundaries); this reader does not try.
//   1. HTML comments (`<!-- ... -->`, non-greedy, across lines) are replaced by ONE SPACE first (so the text either side of one
//      cannot fuse into a token); an unterminated `<!--` is left as it is. The comment stripper is not Markdown-aware.
//   2. The fenced regions of the WHOLE text are worked out next (pickup.ts's fence rules), so a heading-looking line inside a
//      fence is never a heading and never ends a section.
//   3. A Stamp heading is a line OUTSIDE fences matching /^ {0,3}##\s+(\d+\.\s*)?Stamp\s*(\([^)]*\))?\s*:?\s*$/i. Zero or more
//      than one such heading is undefined (two Stamps are ambiguous; `## 3. Stamp-ready checklist` is not a Stamp heading).
//   4. The section runs from that heading to the next level 1 or 2 heading line outside fences (/^ {0,3}#{1,2}(\s|$)/: `#`, `##`,
//      a bare `##` and an indented one included; `###` and deeper stay inside) or the end of the text. The heading line itself
//      is EXCLUDED from all counting. (Fold r4 narrowed this from "any ATX heading".)
//   5. A fenced region inside the section that contains `lane` (any case) is undefined: the declaration may sit in it, or the
//      prose around it may contradict it.
//   6. In the non-fenced body there must be EXACTLY ONE `lane` (any case) whose preceding character is not an ASCII letter
//      (`launch-lane`, `_lane_`, `lane:` and `lanes` count; `plane` and `sublane` do not).
//   7. The token after it ([\s:=]*, an optional `(`, then a run up to the next space, `)`, `,`, `;` or `·`; one trailing `.`
//      stripped) must be exactly L1, L2, L3 or L3c (any case). There is no prose-word exemption: `lane is L3`, `lane TBD`,
//      `lane choice: L3c` and a bare terminator after `lane` (`lane, L3`) are undefined.
//   8. The non-fenced body must hold exactly ONE lane-like token overall (/\bL[123]c?\b/i), and it must be that token. This is
//      what kills lists and glosses: `lane L1 or L3`, `lane L1, L3`, `lane L1,L3`, `lane (L1, L2, L3, L3c)`, `lane L3 (was L1)`.
// The one residual class parsing cannot fix: a SINGLE mention that negates itself (`this is NOT lane L3c`) reads as `L3c`.
// Nothing outside the Stamp section is read: a `lane L1` in the Plan of attack, or in the Pickup block itself, is prose about
// something else. No regex lookbehind anywhere: a regex the plugin runtime cannot compile would take the whole mod down at
// load, so the preceding-character test is done by hand.
import { fenceMask } from './pickup'

export type Lane = 'L1' | 'L2' | 'L3' | 'L3c'

// The same language as /^ {0,3}##\s+(\d+\.\s*)?Stamp\s*(\([^)]*\))?\s*:?\s*$/i, written so that no two `\s*` are adjacent: a long
// run of spaces after `Stamp` cannot make the match go super-linear (a hook must never hang a turn on a pathological line).
const STAMP_HEADING = /^ {0,3}##\s+(\d+\.\s*)?Stamp(\s*\([^)]*\))?(\s*:)?\s*$/i
// Fold r4: the Stamp section ends only at a level 1 or 2 heading (`#`, `##`); `###` and deeper sub-headings stay INSIDE it, so a
// stale `lane L1` above a `### Final` cannot hide the true `lane L3` below it (two mentions: undefined).
const SECTION_END = /^ {0,3}#{1,2}(\s|$)/
const COMMENT = /<!--[\s\S]*?-->/g
const LANES: readonly Lane[] = ['L1', 'L2', 'L3', 'L3c']

/** A typed predicate over the closed set, case-insensitive: `l3C` is `L3c`. Nothing is cast. */
function toLane(token: string): Lane | undefined {
  const lower = token.toLowerCase()
  return LANES.find(l => l.toLowerCase() === lower)
}

/** True for an ASCII letter. Digits, `-`, `_`, punctuation, whitespace and non-ASCII characters are not letters. */
function isAsciiLetter(ch: string): boolean {
  const c = ch.charCodeAt(0)
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122)
}

/** Where the characters after every word-starting `lane` begin: a `lane` counts unless an ASCII letter precedes it. */
function mentionEnds(body: string): number[] {
  const ends: number[] = []
  const lane = /lane/gi
  for (let m = lane.exec(body); m !== null; m = lane.exec(body)) {
    if (m.index === 0 || !isAsciiLetter(body[m.index - 1])) ends.push(m.index + 4)
    lane.lastIndex = m.index + 1
  }
  return ends
}

/** The lane the brief's Stamp section names, or undefined (anything that is not one clean `lane L<n>` in one clean Stamp). */
export function extractLane(text: string): Lane | undefined {
  if (typeof text !== 'string') return undefined
  // A comment is replaced by ONE SPACE, not nothing: `lane L3<!-- c -->c` must not collapse into the token `L3c`.
  const lines = text.replace(COMMENT, ' ').split(/\r\n|\n/)
  const fenced = fenceMask(lines)

  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (fenced[i] || !STAMP_HEADING.test(lines[i])) continue
    if (start >= 0) return undefined // two Stamp headings are ambiguous
    start = i
  }
  if (start < 0) return undefined

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (!fenced[i] && SECTION_END.test(lines[i])) {
      end = i
      break
    }
  }
  // The heading line (start) is excluded from everything below.
  const inFence: string[] = []
  const body: string[] = []
  for (let i = start + 1; i < end; i++) (fenced[i] ? inFence : body).push(lines[i])
  // A fence in the Stamp that mentions `lane` (closed, or unclosed to the end of the section) is unreadable.
  if (/lane/i.test(inFence.join('\n'))) return undefined
  const section = body.join('\n')

  const ends = mentionEnds(section)
  if (ends.length !== 1) return undefined
  const captured = /^[\s:=]*\(?([^\s),;·]+)/.exec(section.slice(ends[0]))
  if (captured === null) return undefined
  const lane = toLane(captured[1].replace(/\.$/, ''))
  if (lane === undefined) return undefined

  // Exactly one lane-like token in the whole body, and it is the captured one: no lists, no glosses, no `(was L1)`.
  const tokens = section.match(/\bL[123]c?\b/gi) ?? []
  if (tokens.length !== 1 || toLane(tokens[0]) !== lane) return undefined
  return lane
}
