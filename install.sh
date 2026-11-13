#!/usr/bin/env bash
# Install the open/close kit into a Claude Code config dir.
#   ./install.sh            install into ~/.claude (refuses to overwrite an existing open or close skill)
#   ./install.sh --force    replace them; the old copies are moved to ~/.claude/open-close-backups/<UTC time>/ first
#                           (never beside the skill: Claude Code loads every folder under skills/, so a backup there
#                           would show up as a second /open)
#   CLAUDE_HOME=/some/dir ./install.sh   TESTING ONLY (to install into a scratch folder): the packs name ~/.claude/skills/open/...,
#                                        so a real install must go to ~/.claude
#   OPEN_CLOSE_KNOWLEDGE_DIR=~/notes ./install.sh   use a notes folder you already keep as the knowledge library
# It copies files only. It never installs a mod (see mods/NOTES.md) and never edits settings.
set -euo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_HOME:-$HOME/.claude}"
STATE="${OPEN_CLOSE_STATE_DIR:-$DEST/open-close}"
STATE="${STATE/#\~/$HOME}"
KNOW="${OPEN_CLOSE_KNOWLEDGE_DIR:-$STATE/knowledge}"
KNOW="${KNOW/#\~/$HOME}"
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$DEST/open-close-backups/$STAMP"

# Check everything before copying anything, so a refusal never leaves a half install.
if [ "$FORCE" -eq 0 ]; then
  for name in open close; do
    if [ -e "$DEST/skills/$name" ]; then
      echo "refusing: $DEST/skills/$name already exists (re-run with --force to replace it; the old copy is moved to $DEST/open-close-backups/)" >&2
      exit 1
    fi
  done
  for cmd in open close; do
    if [ -e "$DEST/commands/$cmd.md" ] && ! cmp -s "$KIT/commands/$cmd.md" "$DEST/commands/$cmd.md"; then
      echo "refusing: $DEST/commands/$cmd.md exists and differs (re-run with --force)" >&2
      exit 1
    fi
  done
fi

mkdir -p "$DEST/skills" "$DEST/commands" "$STATE" "$KNOW/incidents"

for name in open close; do
  target="$DEST/skills/$name"
  if [ -e "$target" ]; then
    if [ "$FORCE" -eq 1 ]; then
      mkdir -p "$BACKUP/skills"
      mv "$target" "$BACKUP/skills/$name"
      echo "moved existing $target to $BACKUP/skills/$name"
    else
      echo "refusing: $target already exists (re-run with --force to replace it; the old copy is moved to $DEST/open-close-backups/)" >&2
      exit 1
    fi
  fi
  cp -R "$KIT/skills/$name" "$target"
  echo "installed skill: $target"
done

for cmd in open close; do
  target="$DEST/commands/$cmd.md"
  if [ -e "$target" ] && [ "$FORCE" -eq 0 ] && ! cmp -s "$KIT/commands/$cmd.md" "$target"; then
    echo "refusing: $target exists and differs (re-run with --force)" >&2
    exit 1
  fi
  if [ -e "$target" ] && [ "$FORCE" -eq 1 ]; then mkdir -p "$BACKUP/commands"; cp "$target" "$BACKUP/commands/$cmd.md"; fi
  cp "$KIT/commands/$cmd.md" "$target"
  echo "installed command: $target"
done

echo "state dir: $STATE"
# The knowledge library: closes write notes here, opens read its INDEX.md. An existing index is never touched.
if [ -e "$KNOW/INDEX.md" ]; then
  echo "knowledge library: $KNOW (existing INDEX.md kept)"
else
  cp "$KIT/skills/open/References/_knowledge-index.seed.md" "$KNOW/INDEX.md"
  echo "knowledge library: $KNOW (new, with an empty INDEX.md)"
fi
if command -v bun >/dev/null 2>&1; then
  if (cd "$DEST/skills/open/Tools" && bun test context-clues.test.ts >/dev/null 2>&1); then
    echo "context-clues: tests pass"
  else
    echo "context-clues: tests FAILED (the skills still work; the bare-menu ranking falls back to the fixed grouped menu)" >&2
  fi
else
  echo "bun not found: the bare /open and /close menus will use the fixed grouped menu (install bun for clue ranking)"
fi
echo "done. Start a NEW Claude Code chat and type /open help"
