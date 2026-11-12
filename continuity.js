/* Work grouping is approximate; no inference of intentions or webpage contents. */
const valid = url => /^https?:\/\//i.test(url || '');
export function clusterActivity(history = [], maxGroups = 8) {
  const groups = [];
  for (const entry of [...history].sort((a, b) => b.timestamp - a.timestamp)) {
    if (!Array.isArray(entry.tabs) || !Number.isFinite(entry.timestamp)) continue;
    const tabs = entry.tabs.filter(t => valid(t.url));
    if (!tabs.length) continue;
    const urls = [...new Set(tabs.map(t => t.url))];
    const candidate = groups.find(g => {
      const overlap = urls.filter(url => g.urlSet.has(url)).length;
      // Exact URL overlap, not shared domains alone. Avoid grouping unrelated projects on GitHub.
      return overlap >= 1 && overlap / Math.min(urls.length, g.urlSet.size) >= 0.5;
    });
    if (candidate) {
      candidate.snapshots++;
      candidate.earliest = Math.min(candidate.earliest, entry.timestamp);
      for (const url of urls) candidate.urlSet.add(url);
    } else if (groups.length < maxGroups) {
      groups.push({ id: entry.id, latest: entry.timestamp, earliest: entry.timestamp,
        snapshots: 1, tabs, urlSet: new Set(urls) });
    }
  }
  return groups.map(({urlSet, ...g}) => ({...g, uniqueUrls: urlSet.size}));
}
export function countOpenTaskTabs(task, openTabs = []) {
  const urls = new Set(openTabs.map(t => t.url).filter(valid));
  return [...new Set((task.tabs || []).map(t => t.url).filter(valid))].filter(url => urls.has(url)).length;
}
