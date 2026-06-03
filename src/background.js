"use strict";

browser.browserAction.onClicked.addListener(async (tab) => {
  await browser.tabs.sendMessage(tab.id, { type: "toggle-annot-panel" });
});
