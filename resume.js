export const isWebUrl = url => /^https?:\/\//i.test(url || '');

export async function resumeUrls(savedTabs, api = chrome) {
  const urls = [...new Set(savedTabs.map(t => t.url).filter(isWebUrl))];
  const open = await api.tabs.query({});
  const available = new Map();
  for (const tab of open) if (isWebUrl(tab.url) && !available.has(tab.url)) available.set(tab.url, tab);
  const existing = urls.map(url => available.get(url)).filter(Boolean);
  const missing = urls.filter(url => !available.has(url));
  let opened = 0;
  if (missing.length) {
    await api.windows.create({ url: missing, focused: true });
    opened = missing.length;
  } else if (existing.length) {
    await api.windows.update(existing[0].windowId, { focused: true });
    await api.tabs.update(existing[0].id, { active: true });
  }
  return { existing: existing.length, opened };
}
