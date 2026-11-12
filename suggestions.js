/* Heuristics, not AI. No webpage contents or network requests. */
const valid = url => /^https?:\/\//i.test(url || '');
export function getSuggestions(state, history, dismissed = [], now = Date.now()) {
  const ignored = new Set(dismissed);
  const paused = (state.tasks || [])
    .filter(task => task.status === 'paused' && task.tabs?.length && !ignored.has('task:' + task.id))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 2)
    .map(task => ({ id: 'task:' + task.id, type: 'task', title: task.name, note: task.note || 'Saved workspace ready to resume', tabs: task.tabs, taskId: task.id }));
  const taskUrls = new Set((state.tasks || []).flatMap(t => t.tabs || []).map(t => t.url));
  const selected = [];
  for (const entry of history || []) {
    if (selected.length >= 3) break;
    if (!Number.isFinite(entry.timestamp) || now - entry.timestamp < 15 * 60_000) continue;
    if (now - entry.timestamp > 7 * 24 * 60 * 60_000) continue;
    if (!Array.isArray(entry.tabs)) continue;
    const urls = [...new Set(entry.tabs.map(t => t.url).filter(valid))];
    if (!urls.length) continue;
    // Avoid re-suggesting snapshots already captured in named tasks.
    if (urls.filter(url => taskUrls.has(url)).length / urls.length >= 0.5) continue;
    const signature = [...urls].sort().join('|');
    if (selected.some(s => {
      const previous = new Set(s.tabs.map(t => t.url));
      return urls.filter(url => previous.has(url)).length / Math.max(urls.length, previous.size) >= 0.6;
    })) continue;
    const id = 'session:' + entry.id;
    if (ignored.has(id) || ignored.has('urls:' + signature)) continue;
    selected.push({ id, type: 'session', title: entry.tabs[0]?.title || 'Unsaved browser session', note: 'Possible unfinished browser work · ' + new Date(entry.timestamp).toLocaleString(), tabs: entry.tabs, signature });
  }
  return [...paused, ...selected].slice(0, 4);
}
