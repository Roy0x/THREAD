const HISTORY_KEY = 'threadHistoryV2';
const SETTINGS_KEY = 'threadSettingsV2';
const DEFAULTS = { tracking: false, excludedDomains: [] };
let queue = Promise.resolve();

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

function eligible(tab, excludes) {
  if (tab.incognito || !/^https?:\/\//i.test(tab.url || '')) return false;
  try {
    const host = new URL(tab.url).hostname.toLowerCase();
    return !excludes.some(domain => host === domain || host.endsWith('.' + domain));
  } catch { return false; }
}

async function recordWindow(windowId) {
  const settings = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY] || DEFAULTS;
  if (!settings.tracking || windowId === chrome.windows.WINDOW_ID_NONE) return;
  let win;
  try { win = await chrome.windows.get(windowId); } catch { return; }
  if (win.type !== 'normal' || win.incognito) return;
  const tabs = (await chrome.tabs.query({ windowId }))
    .filter(t => eligible(t, settings.excludedDomains || []))
    .map(t => ({ url: t.url, title: t.title || t.url }));
  if (!tabs.length) return;
  queue = queue.catch(() => {}).then(async () => {
    const old = (await chrome.storage.local.get(HISTORY_KEY))[HISTORY_KEY] || [];
    const signature = JSON.stringify(tabs.map(t => t.url));
    const last = old[0];
    if (last?.windowId === windowId && last.signature === signature) return;
    const entry = { id: crypto.randomUUID(), windowId, timestamp: Date.now(), signature, tabs };
    await chrome.storage.local.set({ [HISTORY_KEY]: [entry, ...old].slice(0, 30) });
  });
  await queue;
}

chrome.tabs.onActivated.addListener(({ windowId }) => { recordWindow(windowId).catch(() => {}); });
chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.status === 'complete' || change.url) recordWindow(tab.windowId).catch(() => {});
});
chrome.tabs.onRemoved.addListener((id, info) => {
  if (!info.isWindowClosing) recordWindow(info.windowId).catch(() => {});
});
chrome.windows.onFocusChanged.addListener(windowId => { recordWindow(windowId).catch(() => {}); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'CAPTURE_WINDOW') return;
  recordWindow(message.windowId).then(() => respond({ ok: true })).catch(e => respond({ ok: false, error: e.message }));
  return true;
});
