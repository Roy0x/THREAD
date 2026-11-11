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
    tabs: dedupeTabs(tabs)
  };
  return { tasks: [task, ...state.tasks.map(t => t.id === state.activeId ? { ...t, status: 'paused' } : t)], activeId: task.id };
}
export function dedupeTabs(tabs) {
  const seen = new Set();
  return tabs.filter(t => {
    if (!/^https?:\/\//i.test(t.url || '') || seen.has(t.url)) return false;
    seen.add(t.url);
    return true;
  }).map(t => ({ url: t.url, title: t.title || t.url }));
}
export function updateTask(state, id, changes) {
  const tasks = state.tasks.map(t => t.id === id ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t);
  return { ...state, tasks };
}
export function activateTask(state, id) {
  return { activeId: id, tasks: state.tasks.map(t => ({ ...t, status: t.id === id ? 'active' : 'paused', updatedAt: t.id === id ? new Date().toISOString() : t.updatedAt })) };
}
