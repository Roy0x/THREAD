export const isWebUrl = url => /^https?:\/\//i.test(url || '');

/** Focus a specific saved URL. Reuse a matching live tab or create only that tab. */
export async function focusSavedUrl(url, api = chrome) {
  if (!isWebUrl(url)) throw new Error('This tab cannot be restored');
  const open = await api.tabs.query({});
  const match = open.find(t => t.url === url && !t.incognito);
  if (match) {
    await api.windows.update(match.windowId, { focused: true });
    await api.tabs.update(match.id, { active: true });
    return { existing: 1, opened: 0 };
  }
  await api.tabs.create({ url, active: true });
  return { existing: 0, opened: 1 };
}

/** Restore missing URLs, then focus the intended saved tab, not the first URL. */
export async function resumeUrls(savedTabs, api = chrome, preferredUrl = null) {
  const urls = [...new Set(savedTabs.map(t => t.url).filter(isWebUrl))];
  if (!urls.length) return { existing: 0, opened: 0 };
  const target = urls.includes(preferredUrl) ? preferredUrl :
    (savedTabs.find(t => t.active && urls.includes(t.url))?.url || urls[0]);
  const open = await api.tabs.query({});
  const available = new Map();
  for (const tab of open) if (!tab.incognito && isWebUrl(tab.url) && !available.has(tab.url)) available.set(tab.url, tab);
  const existing = urls.filter(url => available.has(url)).length;
  const missing = urls.filter(url => !available.has(url));
  let newWindow;
  if (missing.length) newWindow = await api.windows.create({ url: missing, focused: true });
  const targetTab = available.get(target) ||
    newWindow?.tabs?.find(t => t.url === target);
  if (targetTab) {
    await api.windows.update(targetTab.windowId ?? newWindow?.id, { focused: true });
    await api.tabs.update(targetTab.id, { active: true });
  } else if (missing.includes(target)) {
    // Some API mocks / Chrome versions omit tab URLs from windows.create().
    const after = await api.tabs.query({});
    const created = after.find(t => t.url === target && !t.incognito);
    if (created) {
      await api.windows.update(created.windowId, { focused: true });
      await api.tabs.update(created.id, { active: true });
    }
  }
  return { existing, opened: missing.length };
}
