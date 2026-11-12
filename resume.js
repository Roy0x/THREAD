export const isWebUrl = url => /^https?:\/\//i.test(url || '');

function matchedSavedTab(saved, open, used = new Set()) {
  if (Number.isInteger(saved.id)) {
    const exact = open.find(t => t.id === saved.id && t.url === saved.url && !t.incognito && !used.has(t.id));
    if (exact) return exact;
  }
  // Legacy saved records have only a URL. Prefer their original window if available.
  return open.find(t => t.url === saved.url && !t.incognito && !used.has(t.id) && Number.isInteger(saved.windowId) && t.windowId === saved.windowId)
    || open.find(t => t.url === saved.url && !t.incognito && !used.has(t.id));
}

async function focus(tab, api) {
  await api.windows.update(tab.windowId, { focused: true });
  await api.tabs.update(tab.id, { active: true });
}

/** Focus exactly the saved Chrome tab when its identity still exists. */
export async function focusSavedUrl(saved, api = chrome) {
  const target = typeof saved === 'string' ? { url: saved } : saved;
  if (!isWebUrl(target?.url)) throw new Error('This tab cannot be restored');
  const open = await api.tabs.query({});
  const match = matchedSavedTab(target, open);
  if (match) {
    await focus(match, api);
    return { existing: 1, opened: 0, tab: match };
  }
  const windowId = Number.isInteger(target.windowId) && open.some(t => t.windowId === target.windowId) ? target.windowId : undefined;
  const created = await api.tabs.create({ url: target.url, active: true, ...(windowId === undefined ? {} : { windowId }) });
  if (created.windowId !== undefined) await api.windows.update(created.windowId, { focused: true });
  return { existing: 0, opened: 1, tab: created };
}

/** Reuse exact tab IDs first and restore missing tabs into the existing workspace window. */
export async function resumeUrls(savedTabs, api = chrome, preferred = null) {
  const saved = (savedTabs || []).filter(t => isWebUrl(t.url));
  if (!saved.length) return { existing: 0, opened: 0 };
  const open = (await api.tabs.query({})).filter(t => !t.incognito);
  const used = new Set(), matched = new Map(), missing = [];
  for (const tab of saved) {
    const found = matchedSavedTab(tab, open, used);
    if (found) { used.add(found.id); matched.set(tab, found); }
    else missing.push(tab);
  }
  const preferredTab = Number.isInteger(preferred)
    ? saved.find(t => t.id === preferred)
    : typeof preferred === 'string' ? saved.find(t => t.url === preferred)
    : null;
  const target = preferredTab || saved.find(t => t.active) || saved[0];
  // Choose a real window associated with this task; never spawn a separate window just because one URL is missing.
  const sameWindow = open.find(t => t.windowId === target.windowId);
  const hostWindowId = matched.get(target)?.windowId || sameWindow?.windowId || matched.values().next().value?.windowId;
  let opened = 0;
  for (const tab of missing) {
    const created = await api.tabs.create({ url: tab.url, active: false, ...(hostWindowId === undefined ? {} : { windowId: hostWindowId }) });
    matched.set(tab, created); opened++;
  }
  const focused = matched.get(target);
  if (focused) await focus(focused, api);
  return { existing: saved.length - opened, opened };
}
