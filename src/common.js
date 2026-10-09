"use strict";

const LOG_PREFIX = "[phablens]";

function getRevisionId() {
  const match = window.location.pathname.match(/\/(D\d+)/);
  return match ? match[1] : null;
}

function getDiffId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || null;
}

function getVsId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vs") || null;
}

function resolveDiffId() {
  const explicit = getDiffId();
  if (explicit) return explicit;
  const radio = document.querySelector('input[name="id"]:checked');
  if (radio && radio.value) return radio.value;
  const header = document.querySelector(".phui-header-header");
  if (header) {
    const m = header.textContent.match(/Diff\s+(\d+)/);
    if (m) return m[1];
  }
  return null;
}
