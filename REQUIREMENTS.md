# Phabvanced — Requirements

Firefox extension enhancing Phabricator's differential (code review) UI.

## Feature 1: Permalink to Review Comments

Each inline comment has two anchors in the same `<tr class="inline">`:
- `<td id="anchor-inline-{N}">` — the container cell
- `<a id="inline-{N}" name="inline-{N}" class="differential-inline-comment-anchor">` — named anchor inside

We use `#inline-{N}` for hash links (matches Phabricator's own ghost-icon hrefs).

### Behavior
- A `#<id>` link button is injected into each comment's `.inline-head-right` area.
- Browser-native fragment scroll handles navigation on page load.

## Feature 2: Line-Level Review Tracking

Mark individual diff lines as "reviewed" (green) or "flagged" (red), optionally with a note.

### DOM structure (2-up mode)
Colgroup defines 6 columns: `num | left | num | copy | right | cov`. The `cov` column is always merged into the last `<td>` via `colspan="2"`. We split that colspan back to 1 and append a gutter `<td>` to reclaim the coverage slot.

Line number cells have IDs: `C{changesetId}OL{lineNum}` / `C{changesetId}NL{lineNum}`, with `data-n` holding the line number. File path from `[data-sigil="changeset-header-path-name"]`.

### UX
- Each code line gets a narrow (6px) gutter cell at the right edge.
- Click: cycle null → reviewed (green) → flagged (red) → null.
- Shift-click: range select from last clicked line.
- Right-click: note popover.
- Fixed badge bottom-right: `N/M reviewed`.

### Storage

Key format:
- Normal diff: `phabvanced:D303899:1289650`
- Interdiff: `phabvanced:D303899:1288746-vs-1289650`
- No query param: resolve diff id from `input[name="id"]:checked` or header span.

Schema:
```json
{
  "revisionId": "D303899",
  "diffId": "1289650",
  "vsId": null,
  "lines": {
    "dom/base/Document.h": {
      "new:3624": { "state": "reviewed", "note": "" },
      "old:2944": { "state": "flagged", "note": "looks suspicious" }
    }
  },
  "updatedAt": "2026-06-03T..."
}
```

Line keys use `{side}:{lineNum}` to distinguish old vs new side in 2-up diffs.

### Edge cases
- Switching diffs (query param change) loads different stored state.
- Inline comment rows and context/show-more rows get a spacer td but no gutter.
- MutationObserver re-runs injection when Phabricator lazily loads content.

## Non-goals (for now)
- Syncing review state across devices.
- Interaction with Phabricator's API or Conduit.
- Supporting other browsers (Chrome/Edge) — Firefox-only for now.

## Tech stack
- Plain JS, no build step. Ship `manifest.json` + content script + CSS.
- `browser.storage.local` for persistence.
- Manifest v2 with `browser_specific_settings.gecko`.
