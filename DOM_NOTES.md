# Phabricator DOM Structure Notes

Based on `phab.html` (D303899, Diff 1289650).

## Inline Review Comments

Two anchors per comment, same `<tr class="inline" data-sigil="inline-row">`:

- `<td id="anchor-inline-{N}" colspan="2">` — the container cell
- `<a id="inline-{N}" name="inline-{N}">` — named anchor inside that td

**Use `inline-{N}`** for hash links — it's the named anchor, works with browser-native fragment navigation, and matches what Phabricator itself uses in ghost-icon hrefs like `D303899?id=1288740#inline-1641595`.

Comment row structure (6 cells, last has colspan=2):
```
td.n (old line#) | td.left | td.n (new line#, has reveal icon) | td.copy | td[colspan=2, id=anchor-inline-*] (comment body)
```

Key classes on the comment div (`div.differential-inline-comment`):
- `inline-comment-ghost` — comment from a previous diff (has ghost icon)
- `inline-is-done` — marked done
- `inline-comment-is-reply` — reply in thread

## Diff Table — Code Lines

2-up layout. Colgroup defines 6 columns:
```
col.num | col.left | col.num | col.copy | col.right | col.cov
```

But the last `<td>` always has `colspan="2"`, merging right+cov. The coverage column is a structural placeholder — never has its own cell.

### Line number td IDs

Pattern: `C{changesetId}OL{lineNum}` (old) / `C{changesetId}NL{lineNum}` (new).
Actual line number in `data-n` attribute.

### Row types

**Unchanged:** both sides populated, no special class
```html
<tr>
  <td id="C12962250OL3624" class="n" data-n="3624"></td>
  <td data-copy-mode="copy-l">content</td>
  <td id="C12962250NL3624" class="n" data-n="3624"></td>
  <td class="copy"></td>
  <td colspan="2" data-copy-mode="copy-r">content</td>
</tr>
```

**Modified:** old td has class `old`, new td has class `new`
**Added:** left side empty, new td has `new new-full`
**Removed:** right side empty, old td has `old old-full`
**Context/show-more:** `<tr data-sigil="context-target">`, different td layout

## File Sections (Changesets)

Each file wrapped in:
```html
<div class="differential-changeset" id="diff-change-{hash}"
     data-sigil="differential-changeset">
```

File path: `changeset.querySelector('[data-sigil="changeset-header-path-name"]').textContent`

All changesets live inside `<div id="differential-review-stage">`.

9 changesets in this example, 8 with diff tables.

## Revision & Diff IDs

- **Revision ID**: from URL path `/D303899`
- **Diff ID**: from `?id=` query param, or from checked radio `input[name="id"]:checked`
- **Vs ID** (interdiff): from `?vs=` query param, or from checked radio `input[name="vs"]:checked` (value="" means "Base")
- Also in header: `<span class="phui-header-header">Diff 1289650</span>`

History table has rows with `<a href="/D303899?id=1288740">1288740</a>` per diff.

## Storage Key Strategy

Based on user spec:
- Normal diff: `phabvanced:D303899:1289650`
- Interdiff: `phabvanced:D303899:1288746-vs-1289650`
- Latest (no query param): resolve diff id from `input[name="id"]:checked` or header span, then use the resolved id as key

## Review Gutter Strategy

The `col.cov` column exists but is always merged via colspan=2. Best approach:
**Split the colspan** — change last td from `colspan="2"` to `colspan="1"`, insert a new `<td class="phabvanced-gutter">` after it. This reclaims the existing cov column slot without adding new columns to the colgroup.

Lines to annotate are identified by: file path + side (old/new) + line number (`data-n`).
