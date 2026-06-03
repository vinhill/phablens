"use strict";

let _lensOpen = false;

function isLensApiAvailable() {
  return "documentPictureInPicture" in window.wrappedJSObject;
}

function isLensOpen() {
  return _lensOpen;
}

function _injectLensPageScript() {
  if (document.getElementById("phabvanced-lens-page-script")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = "phabvanced-lens-page-script";
    script.src = browser.runtime.getURL("src/annot-lens-page.js");
    script.addEventListener("load", resolve);
    document.documentElement.append(script);
  });
}

async function openAnnotLens() {
  await _injectLensPageScript();

  if (isLensOpen()) {
    window.dispatchEvent(new CustomEvent("phabvanced-lens-close"));
    _lensOpen = false;
    updateLensButton();
    return;
  }

  const opened = new Promise((resolve) => {
    const onOpened = () => {
      window.removeEventListener("phabvanced-lens-opened", onOpened);
      window.removeEventListener("phabvanced-lens-closed", onFailed);
      resolve(true);
    };
    const onFailed = () => {
      window.removeEventListener("phabvanced-lens-opened", onOpened);
      window.removeEventListener("phabvanced-lens-closed", onFailed);
      resolve(false);
    };
    window.addEventListener("phabvanced-lens-opened", onOpened);
    window.addEventListener("phabvanced-lens-closed", onFailed);
  });

  window.dispatchEvent(new CustomEvent("phabvanced-lens-open"));
  _lensOpen = await opened;

  window.addEventListener("phabvanced-lens-closed", () => {
    _lensOpen = false;
    updateLensButton();
  });

  updateLensButton();
}

function closeAnnotLens() {
  if (!_lensOpen) return;
  window.dispatchEvent(new CustomEvent("phabvanced-lens-close"));
  _lensOpen = false;
  updateLensButton();
}

function updateLensButton() {
  const btn = document.getElementById("phabvanced-lens-btn");
  if (btn) btn.textContent = isLensOpen() ? "Close Lens" : "Open Lens";
}

function updateAnnotLens(annotation, index, side) {
  if (!isLensOpen()) return;

  const color = ANNOT_COLORS[index % ANNOT_COLORS.length];

  let showRef;
  let showSide;
  if (ANNOT_LINKED.has(annotation.category)) {
    const linked = side === "old" ? annotation.to : annotation.from;
    if (linked) {
      showRef = linked;
      showSide = side === "old" ? "new" : "old";
    } else {
      showRef = side === "old" ? annotation.from : annotation.to;
      showSide = side;
    }
  } else {
    showRef = annotation.from || annotation.to;
    showSide = annotation.from ? "old" : "new";
  }

  const parts = [];

  const groupHtml = annotation.group
    ? `<span class="phabvanced-lens-group">${escapeHtml(annotation.group)}</span>`
    : "";
  parts.push(
    `<div class="phabvanced-lens-header">` +
    `<span class="phabvanced-lens-badge" style="background-color:${color}">#${index} ${escapeHtml(annotation.category)}</span>` +
    groupHtml +
    `</div>`
  );

  if (annotation.comment) {
    parts.push(`<div class="phabvanced-lens-comment">${escapeHtml(annotation.comment)}</div>`);
  }

  if (showRef) {
    const name = showRef.name ? ` — ${escapeHtml(showRef.name)}` : "";
    parts.push(
      `<div class="phabvanced-lens-file">${escapeHtml(showRef.file)}:${showRef.lines[0]}-${showRef.lines[1]}${name}</div>`
    );

    const codeHtml = extractCodeRowsHtml(showRef.file, showRef.lines, showSide);
    parts.push(codeHtml || '<div class="phabvanced-lens-empty">Code not visible in current diff view</div>');
  }

  const detail = cloneInto({ html: parts.join("") }, window.wrappedJSObject);
  window.dispatchEvent(new CustomEvent("phabvanced-lens-update", { detail }));
}

function escapeHtml(str) {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function extractCodeRowsHtml(filePath, lines, side) {
  const changesets = document.querySelectorAll('[data-sigil="differential-changeset"]');
  for (const cs of changesets) {
    const pathEl = cs.querySelector('[data-sigil="changeset-header-path-name"]');
    if (!pathEl || pathEl.textContent.trim() !== filePath) continue;

    const table = cs.querySelector("table.differential-diff");
    if (!table) continue;

    const idFragment = side === "old" ? "OL" : "NL";
    const rowsHtml = [];
    for (let n = lines[0]; n <= lines[1]; n++) {
      const td = table.querySelector(`td[id*="${idFragment}"][data-n="${n}"]`);
      if (!td) continue;
      const tr = td.closest("tr");
      if (!tr) continue;

      const cells = tr.querySelectorAll("td");
      // 2-up row: td.n(old) | td(old code) | td.n(new) | td.copy | td[colspan=2](new code)
      const numCell = side === "old" ? cells[0] : cells[2];
      const codeCell = side === "old" ? cells[1] : cells[4];
      if (!numCell || !codeCell) continue;

      const numClone = numCell.cloneNode(true);
      const codeClone = codeCell.cloneNode(true);
      codeClone.removeAttribute("colspan");
      rowsHtml.push(`<tr>${numClone.outerHTML}${codeClone.outerHTML}</tr>`);
    }

    if (rowsHtml.length === 0) return null;
    return `<table class="phabvanced-lens-code remarkup-code"><tbody>${rowsHtml.join("")}</tbody></table>`;
  }

  return null;
}
