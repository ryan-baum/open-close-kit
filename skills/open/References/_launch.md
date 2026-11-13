# Launch protocol (LAUNCH.md)

BLUF: the chat that works out what you want is often the wrong context to build it in. Once the approach is committed, write a brief for the receiver (`LAUNCH.md` in the run folder, beside `CONTRACT.md`), announce the launch in one line, and run the build in a fresh context. Optional: nothing in `/open` or `/close` requires it, but `/close` and the launch-copy mod read it when it exists.

## When to launch

Launch only when all three hold:
1. A run is registered: the work has a run folder and a `CONTRACT.md`.
2. The remaining work is long: more than about 15 tool calls, or at least one dispatched lane (a subagent or child session, see Lanes below), are still ahead.
3. The intake left residue the build won't need: a research lane ran, about 10 or more files were read to decide the approach, a decision was reversed during intake, or the context is past about 40%.

Never launch when the next step needs the user's answer, when the ask finishes in under about 15 calls, or mid-build. The user's plain words outrank the rule ("launch it", "no launch"). Announce first, in one line, so the user can veto: `Launching: intake read 23 files; ~40 calls left; lane L1.` The thresholds are starting values; tune them.

## Lanes

| Lane | When | What the user does | How |
|---|---|---|---|
| `L1` subagent | bounded work with a testable done and no mid-run taste calls | nothing | the intake chat dispatches a subagent: "Read <run folder>/LAUNCH.md and execute it", then checks the result on disk |
| `L2` in place | an interactive run the user steers, in this same chat | types one line | `/compact` with an instruction to keep LAUNCH.md and the user's messages verbatim (lossy by design; compaction cannot be undone) |
| `L3` fresh chat | as L2, when the intake chat should stay alive | new chat, paste, Enter | the pickup is pasted into a new chat |
| `L3c` child session | as L3, when the app can start a linked child session and the intake chat conducts it | says "go" | the intake chat starts the child with the pickup as its prompt; nothing to paste |

## Required sections

Target 8 KB or less; hard cap 32 KB (the launch-copy mod will not read a larger file).

1. **Pickup**: one fenced `text` block holding the L1 prompt, the L3 paste, or the L2 `/compact` line. The heading is exactly `## 1. Pickup`.
2. **Goal, in the user's words**, verbatim, plus every clarification given during intake, verbatim and dated.
3. **Done**: a pointer to the contract's Criteria, plus the stop condition in one line. Never copy the criteria.
4. **Decisions made**: who decided and when, and what not to reopen.
5. **Read order**: absolute paths, pointers not dumps.
6. **Plan of attack**: ordered units, each with a done-check; lanes with explicit models and call caps.
7. **In flight**: every lane dispatched during intake, and who owns its result after the boundary.
8. **Hazards and must-not-run**: anything already done that must not be redone.
9. **Authority map**: what is approved, and what stays the user's.
10. **What a fresh context would most likely get wrong**: at least three items.
11. **Unsure**: each item with a confidence.
12. **Stamp**: under the heading `## 12. Stamp` (the only section with that heading): `written: <UTC time from the system clock, for example $(date -u +%Y-%m-%dT%H:%MZ)>`, the lane, and "re-probe any dated claim before acting". Write the word `lane` exactly once and exactly one lane token: `L1`, `L2`, `L3` or `L3c`. No legend and no "was L1" gloss: the launch-copy mod reads anything else as `L3` (copy and "paste").

An example is in the kit's `examples/LAUNCH.example.md`.

## Who does what across the boundary

| | Intake chat | Launched context (L2/L3/L3c) or lane (L1) | Close |
|---|---|---|---|
| Owns | the goal verbatim, the contract and its criteria, ambiguity resolved, the plan | the build, verification, evidence, folding discoveries into the contract | the Learning Router runs once: in the launched context for L2/L3/L3c, in the intake chat for L1 |
| Writes | `CONTRACT.md`, `LAUNCH.md`, one Decisions line pointing at it | the build | the bridge, `phase: complete` |
| Never | starts the build | redoes a gate the contract records as passed; re-asks a decision LAUNCH.md lists | runs the learn step twice |

A `/close conversation` in the intake chat of an L3/L3c run therefore leaves the contract's phase alone (the `close` skill's launched-run gotcha). An L2 run has no separate intake chat after its `/compact`: the close there is the launched context's close and completes normally.

## Gotchas

- Ceremony creep is the likeliest way this dies. If launch announcements start appearing on asks that finish in a handful of calls, the trigger is wrong; tighten it.
- A brief written once is not verified. Before launching a high-stakes brief, have a fresh reader cold-read it against the sources, and make the launched context re-check live state as its first step: the world can move between the brief and the build.
- A child session cannot run above its parent's model; check before naming one.
