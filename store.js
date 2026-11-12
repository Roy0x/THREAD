/* Shared local-first state model. No page content is accessed or transmitted. */
const KEY = 'threadStateV1';
export const emptyState = () => ({ tasks: [], activeId: null });
export async function readState() {
  const value = (await chrome.storage.local.get(KEY))[KEY];
  return value && Array.isArray(value.tasks) ? value : emptyState();
}
export async function writeState(state) {
  await chrome.storage.local.set({ [KEY]: state });
}
export function createTask(state, name, tabs, note = '') {
  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(), name: name.trim(), note: note.trim(),
    status: 'active', createdAt: now, updatedAt: now,
    preferredUrl: tabs.find(t => t.active && /^https?:\/\//i.test(t.url || ''))?.url || tabs[0]?.url || null,
    preferredTabId: tabs.find(t => t.active)?.id ?? null,
    tabs: dedupeTabs(tabs)
  };
  return { tasks: [task, ...state.tasks.map(t => t.id === state.activeId ? { ...t, status: 'paused' } : t)], activeId: task.id };
}
export function dedupeTabs(tabs) {
  const seen = new Set();
  return tabs.filter(t => {
    if (!/^https?:\/\//i.test(t.url || '')) return false;
    // Different Chrome tabs can have the exact same URL and still hold different user work.
    const key = Number.isInteger(t.id) ? 'tab:' + t.id : 'url:' + t.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(t => ({
    url: t.url, title: t.title || t.url,
    ...(Number.isInteger(t.id) ? { id: t.id } : {}),
    ...(Number.isInteger(t.windowId) ? { windowId: t.windowId } : {}),
    ...(t.active ? { active: true } : {})
  }));
}
export function updateTask(state, id, changes) {
  const tasks = state.tasks.map(t => t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t);
  return { ...state, tasks };
}
export function activateTask(state, id) {
  return { activeId: id, tasks: state.tasks.map(t => ({ ...t, status: t.id === id ? 'active' : 'paused', updatedAt: t.id === id ? new Date().toISOString() : t.updatedAt })) };
}
