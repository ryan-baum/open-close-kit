# open-close-mods: conventions both mods follow

The kit root's `.claude-plugin/marketplace.json` is the plugin marketplace: it lists each mod under
`mods/source/plugins/<name>/` by relative path. Run the commands below from the kit root. Keep these rules if you change a mod or add one; the code comments cite them by number.

## Layout per mod
```
plugins/<name>/
  .claude-plugin/plugin.json   {"name","version","description","types":"./types/index.d.ts" (if $.state is used)}
  hooks/hooks.json             {"modules": ["./register.tsx"]}
  hooks/register.tsx           exports register(on, options)
  hooks/lib/*.ts               pure logic (parsers, formatters): importable by tests, no `$`
  types/index.d.ts             the PluginState contract (only if $.state is used)
  tests/*.test.ts(x)           `claude plugin test mods/source/plugins/<name>` runs these
  README.md                    what it does, events, calls, options, known limits
```

## Safety rules
1. No `tool.check` hooks. No hook approves a tool call or rewrites a tool call's input (auto mode denies rewritten
   input, and a mod must never widen what your other security hooks allow).
2. No `$.http.fetch`. No `$.prompt.submit` unless the mod's README explicitly allows it behind an option that defaults
   off. (warm-close records its one exception: it runs a slash command, `$.command.run`, by default.)
3. Every hook registration gets `.catch(($, e, next) => next(e))` (or the event's pass-through). A broken mod degrades to
   "nothing drawn, nothing changed", never to a blocked prompt, a lost session start, or a stuck turn.
4. `$.process.run` only with a fixed argv whose program is named in the README (for example `env` and `pbcopy`), never a
   shell string.
5. Pure logic lives in `hooks/lib/` with no `$` so it can be unit-tested exhaustively; `register.tsx` stays thin.
6. Spell `on("event", …)` and `$.noun.method(…)` literally; helpers that take `$` are top-level functions (static
   extraction by `claude plugin validate` requires it).
7. Draw on `terminal` and `desktop`; on any surface without drawing, store state and draw nothing. The desktop app
   reports `surface: null` at `session.start` (it hosts the session headless) yet draws the footer status, so never gate
   `$.ui.status` on the start-time surface: null or absent is unknown, and draws.

## Validation contract (each mod, after every change)
- `claude plugin validate mods/source/plugins/<name>` is clean, and its `hooks:` and `calls:` lines match the ones pasted in the
  mod's README. A new hook or call is a design change: update the README in the same edit.
- `claude plugin test mods/source/plugins/<name>` exits 0, with failure-direction tests (what must NOT happen) beside the happy path.
- Before trusting a change to a decision (a predicate that copies, closes or holds), force that predicate true and false
  in a scratch copy and confirm the right tests go red. "N of N pass" alone is not proof.

## Naming
Names are descriptive (`warm-close`, `launch-copy`). Names may not start with `claude-`.

## Tooling hazards
- Never run `claude plugin init`: it scaffolds into `~/.claude/skills/<name>/`, which auto-loads in every session.
  Create mod folders by hand under `plugins/`.
- Never run `claude plugin configure`: it has no scope flag and may write your user `settings.json`. The mods read their
  manifest defaults when options are unset.
- On a managed install the security guard closes a list of events to user mods, and the list grows between engine
  versions. Re-read it before designing on an event (see the kit's `mods/NOTES.md`, "The security guard").
- On the desktop app `session.start` reports `surface: null` and `isInteractive: false`; never gate on either (rule 7).
- Wall-clock tests flake under heavy load. Check `uptime` first and run one heavy suite at a time.
- A mod installed or updated mid-chat does not load in that chat: it loads when a chat starts. Test a change in a new
  chat started in the folder where the mod is installed.
