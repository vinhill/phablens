"use strict";

let _reviewData = null;
let _storageKeyCache = null;

function _storageKey(revisionId, diffId, vsId) {
  if (vsId) return `phabvanced:${revisionId}:${vsId}-vs-${diffId}`;
  return `phabvanced:${revisionId}:${diffId}`;
}

async function loadReviewData() {
  const revisionId = getRevisionId();
  const diffId = resolveDiffId();
  const vsId = getVsId();
  if (!revisionId) return null;
  if (!diffId) {
    console.error(LOG_PREFIX, "assert failed: diffId is null for", revisionId);
    return null;
  }

  const key = _storageKey(revisionId, diffId, vsId);
  _storageKeyCache = key;
  const result = await browser.storage.local.get(key);
  _reviewData = result[key] || {
    revisionId,
    diffId,
    vsId: vsId || null,
    lines: {},
    updatedAt: null,
  };
  return _reviewData;
}

async function saveReviewData() {
  if (!_reviewData || !_storageKeyCache) return;
  _reviewData.updatedAt = new Date().toISOString();
  await browser.storage.local.set({ [_storageKeyCache]: _reviewData });
}

function getLineState(filePath, side, lineNum) {
  if (!_reviewData) return null;
  const fileData = _reviewData.lines[filePath];
  if (!fileData) return null;
  const key = `${side}:${lineNum}`;
  return fileData[key] || null;
}

function setLineState(filePath, side, lineNum, state, note) {
  if (!_reviewData) return;
  if (!_reviewData.lines[filePath]) _reviewData.lines[filePath] = {};
  const key = `${side}:${lineNum}`;
  if (!state) {
    delete _reviewData.lines[filePath][key];
  } else {
    _reviewData.lines[filePath][key] = { state, note: note || "" };
  }
  saveReviewData();
}
