"use strict";

(function () {
  let pipWindow = null;
  let container = null;

  const LENS_STYLES = [
    "* { box-sizing: border-box; margin: 0; }",
    "body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #24292f; background: #fff; overflow: auto; }",
    ".phablens-lens { padding: 10px; display: flex; flex-direction: column; gap: 8px; }",
    ".phablens-lens-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }",
    ".phablens-lens-badge { color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }",
    ".phablens-lens-group { color: #57606a; font-size: 12px; }",
    ".phablens-lens-comment { padding: 6px 8px; background: #f6f8fa; border-radius: 4px; font-size: 12px; color: #24292f; }",
    ".phablens-lens-file { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #57606a; padding: 4px 0; word-break: break-all; }",
    ".phablens-lens-code { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; border: 1px solid #d0d7de; border-radius: 4px; overflow: auto; }",
    ".phablens-lens-code td { padding: 1px 6px; white-space: pre; border-top: 1px solid #eee; }",
    ".phablens-lens-empty { color: #57606a; font-size: 12px; padding: 20px; text-align: center; }",
  ].join("\n");

  window.addEventListener("phablens-lens-open", async () => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      pipWindow = null;
      container = null;
      window.dispatchEvent(new CustomEvent("phablens-lens-closed"));
      return;
    }

    try {
      pipWindow = await documentPictureInPicture.requestWindow({
        width: 600,
        height: 700,
      });
    } catch (e) {
      console.error("phablens: PiP open failed", e);
      window.dispatchEvent(new CustomEvent("phablens-lens-closed"));
      return;
    }

    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      pipWindow.document.head.append(link.cloneNode(true));
    }
    for (const style of document.querySelectorAll("style")) {
      pipWindow.document.head.append(style.cloneNode(true));
    }

    const style = pipWindow.document.createElement("style");
    style.textContent = LENS_STYLES;
    pipWindow.document.head.append(style);

    container = pipWindow.document.createElement("div");
    container.className = "phablens-lens";
    container.innerHTML = '<div class="phablens-lens-empty">Hover an annotation cell to inspect it</div>';
    pipWindow.document.body.append(container);

    pipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
      container = null;
      window.dispatchEvent(new CustomEvent("phablens-lens-closed"));
    });

    window.dispatchEvent(new CustomEvent("phablens-lens-opened"));
  });

  window.addEventListener("phablens-lens-close", () => {
    if (pipWindow && !pipWindow.closed) pipWindow.close();
    pipWindow = null;
    container = null;
  });

  window.addEventListener("phablens-lens-update", (e) => {
    if (!pipWindow || pipWindow.closed || !container) return;
    container.innerHTML = e.detail.html;
  });
})();
