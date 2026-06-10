# PhabLens — Requirements

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
- Each code line gets a narrow (14px) gutter cell at the right edge.
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
- Collapsed/deleted files (no code rows visible): gutter injection is deferred until the file is expanded.
- MutationObserver re-runs injection when Phabricator lazily loads content.

## Feature 3: Annotation Mapping Gutter

Visualize how code maps between files in large refactoring diffs (e.g. JS→C++ port). A JSON mapping file is loaded via an in-page panel (toggled by the toolbar icon); a second gutter column appears with per-annotation color-coded cells.

### Mapping file format

```json
{
  "annotations": [
    {
      "category": "ported",
      "group": "Lifecycle & setup",
      "from": { "file": "old/path.js", "lines": [10, 25], "name": "setup" },
      "to": { "file": "new/path.cpp", "lines": [42, 57], "name": "Setup" },
      "comment": "Core logic moved to native impl"
    }
  ]
}
```

- `category`: one of `ported`, `new`, `inlined`, `removed`, `merged`, `split`.
- `from` / `to`: optional depending on category. Each has `file` (string), `lines` ([start, end] inclusive). Optional `name` for the function/symbol name.
- `group`: optional grouping label (e.g. "Lifecycle & setup", "Event listeners").
- `comment`: optional free-text annotation.

### Categories

| Category | Linked? | Meaning |
|----------|---------|---------|
| ported | yes | Code moved from→to with adaptation |
| new | no | Newly written code |
| inlined | yes | Code inlined into another location |
| removed | no | Code deleted, not moved |
| merged | yes | Multiple sources merged into one |
| split | yes | One source split into multiple |

Colors are not per-category. Each annotation gets its own color from a 10-color cycling palette (by annotation index), so adjacent blocks of the same category are visually distinct.

### Loading

- Toolbar icon click → background script sends `toggle-annot-panel` message → content script toggles an in-page floating panel with file picker, clear, and close buttons.
- File reading and validation happen inside the content script (avoids Firefox popup-dies-on-file-picker issue).
- Annotations stored in memory (session-only, no persistence).

### DOM injection

Same strategy as Feature 2: appends a `<col class="phabvanced-annot-col">` and per-row `<td class="phabvanced-annot">` cells. Annotation matching: `from` side matches old-side lines, `to` side matches new-side lines, by file path and line range.

### UX

- Hover: native tooltip shows `#index — category — comment`.
- Click (linked categories): scrolls to the counterpart file/line in the diff. Toast if target not visible.
- Clear: removes all annotation gutter cells and columns.
- Collapsed files: gutter injection is deferred until the file is expanded (MutationObserver re-runs injection).

### Validation

Content script validates on load: `annotations` array present, each entry has valid `category` and at least one of `from`/`to`, each side has `file` (string) and `lines` ([int, int]). Extra fields (`group`, `name`, `comment`) are passed through without validation.

## Feature 4: Annotation Lens (Document Picture-in-Picture)

A floating Document Picture-in-Picture window that acts as a detail lens for annotations. Hovering over annotation gutter cells updates the PiP window with the annotation's metadata and corresponding code.

### Prerequisites

Requires Firefox flag `dom.pictureInPictureAPI.documentEnabled` set to `true` in `about:config`. The "Open Lens" button is hidden when the API is unavailable.

### Activation

- A new **Open Lens** button in the annotation panel (between Clear and Close). Only visible when `documentPictureInPicture` is available.
- Clicking it opens a Document PiP window and the button label changes to **Close Lens**.
- Clicking again (or closing the PiP window externally) tears down the lens.
- Clearing annotations also closes the lens.

### PiP window content

On hover over an annotation gutter cell, the lens displays:

1. **Header** — annotation index, category badge (colored), group label if present.
2. **Comment** — the annotation's `comment` field, if any.
3. **Code** — the relevant source lines, cloned from the diff table.

Which code is shown depends on the annotation:

| Scenario | Code shown |
|----------|-----------|
| Linked annotation (ported/inlined/merged/split), hovered on `from` side | The `to` (counterpart) code |
| Linked annotation, hovered on `to` side | The `from` (counterpart) code |
| Unlinked annotation with only `from` (e.g. `removed`) | The `from` code |
| Unlinked annotation with only `to` (e.g. `new`) | The `to` code |

### Code extraction

- Locate the target file's `table.differential-diff` by matching the file path from the annotation's `from`/`to` ref.
- Query rows by line number range (`td[data-n]` between `lines[0]` and `lines[1]`).
- Clone matched rows into a `<table>` inside the PiP document.
- Copy the extension's stylesheet into the PiP window for consistent rendering.

### Implementation

- **New file: `src/annot-lens.js`** — PiP window lifecycle (`openAnnotLens`, `closeAnnotLens`) and content rendering (`updateAnnotLens`).
- **`src/annotations.js`** — add `mouseenter` listener on annotation cells to call `updateAnnotLens`; add lens button to the panel.
- **`src/styles.css`** — styles for lens content (header, category badge, code table).
- **`manifest.json`** — add `src/annot-lens.js` to the content scripts list (after `annotations.js`).

### Edge cases

- If the counterpart file/lines are not visible in the diff (collapsed or not loaded), show a message instead of code.
- If the PiP window is closed externally (user clicks PiP close button), reset the panel button state.
- When annotations are cleared, close any open lens window.

## Non-goals (for now)
- Syncing review state across devices.
- Interaction with Phabricator's API or Conduit.
- Supporting other browsers (Chrome/Edge) — Firefox-only for now.

## Tech stack
- Plain JS, no build step. Ship `manifest.json` + content scripts + background script + CSS.
- `browser.storage.local` for persistence (review tracking only; annotations are session-only).
- Manifest v2 with `browser_specific_settings.gecko`.
