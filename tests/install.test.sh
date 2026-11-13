#!/usr/bin/env bash
# Checks install.sh in throwaway folders. Run from anywhere: bash tests/install.test.sh
set -uo pipefail
KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }
fresh() { T="$(mktemp -d)"; mkdir -p "$T/home"; }
# run [VAR=value ...] [-- install args]: installs into $T/home from inside $T
run() {
  local vars=() ; while [ $# -gt 0 ] && [ "$1" != "--" ]; do vars+=("$1"); shift; done; [ "${1:-}" = "--" ] && shift
  (cd "$T" && env HOME="$T/home" CLAUDE_HOME="$T/home/.claude" "${vars[@]}" bash "$KIT/install.sh" "$@" >"$T/out.txt" 2>&1)
}

# 1. A plain install creates the knowledge library with its index.
fresh; run
K="$T/home/.claude/open-close/knowledge"
[ -f "$K/INDEX.md" ] && pass "default library has INDEX.md" || fail "default library has INDEX.md"
[ -d "$K/incidents" ] && pass "default library has incidents/" || fail "default library has incidents/"
grep -qF "knowledge library: $K" "$T/out.txt" && pass "install reports the library path" || fail "install reports the library path"

# 2. A second install never overwrites an index that has notes in it.
echo "- [Kept](Kept.md) — method · test · must survive" >> "$K/INDEX.md"
run -- --force
grep -q "must survive" "$K/INDEX.md" && pass "re-install keeps the existing index" || fail "re-install keeps the existing index"

# 3. OPEN_CLOSE_KNOWLEDGE_DIR points the library at a folder the user already has, with ~ expanded.
fresh; mkdir -p "$T/home/notes"; echo "# my notes" > "$T/home/notes/Existing.md"
run 'OPEN_CLOSE_KNOWLEDGE_DIR=~/notes'
[ -f "$T/home/notes/INDEX.md" ] && pass "custom library gets INDEX.md" || fail "custom library gets INDEX.md"
[ -f "$T/home/notes/Existing.md" ] && pass "custom library keeps existing notes" || fail "custom library keeps existing notes"
[ ! -e "$T/home/.claude/open-close/knowledge" ] && pass "no default library when a custom one is set" || fail "no default library when a custom one is set"
[ ! -e "$T/~" ] && pass "no literal ~ folder created" || fail "no literal ~ folder created"

# 4. The library follows OPEN_CLOSE_STATE_DIR when only that is set.
fresh; run "OPEN_CLOSE_STATE_DIR=$T/home/state"
[ -f "$T/home/state/knowledge/INDEX.md" ] && pass "library follows OPEN_CLOSE_STATE_DIR" || fail "library follows OPEN_CLOSE_STATE_DIR"

# 5. The installed skill carries the note format the close writes to.
fresh; run
[ -f "$T/home/.claude/skills/open/References/_knowledge.md" ] && pass "note format is installed" || fail "note format is installed"

exit $FAIL
