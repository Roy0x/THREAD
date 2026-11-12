import { readState, writeState, createTask, dedupeTabs, updateTask, activateTask } from './store.js';
import { resumeUrls } from './resume.js';

const $ = id => document.getElementById(id);
let state = await readState();
let busy = false;
let history = [];
let settings = { tracking: false, excludedDomains: [] };
const validUrl = url => /^https?:\/\//i.test(url || '');

function flash(message) {
  $('status').textContent = message;
  setTimeout(() => { if ($('status').textContent === message) $('status').textContent = ''; }, 3500);
}
async function mutate(fn) {
  if (busy) return;
  busy = true;
  try { state = fn(state); await writeState(state); render(); }
  catch (error) { flash(`Error: ${error.message}`); }
  finally { busy = false; }
}
async function currentTabs() {
  const windows = await chrome.windows.getAll({ populate: false, windowTypes: ['normal'] });
  const focused = windows.find(w => w.focused) || windows[0];
  if (!focused) return [];
  const tabs = await chrome.tabs.query({ windowId: focused.id });
  return dedupeTabs(tabs);
}
function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function renderHistory() {
  $('history').replaceChildren();
  if (!history.length) $('history').append(el('div', 'history-empty', 'No recent sessions recorded yet.'));
  for (const entry of history.slice(0, 8)) {
    const card = el('div', 'history-entry');
    card.append(el('div', 'history-title', `${entry.tabs.length} tabs · ${new Date(entry.timestamp).toLocaleString()}`));
    card.append(el('div', 'meta', entry.tabs.slice(0, 3).map(t => t.title).join(' · ')));
    const actions = el('div', 'history-actions');
    const recover = el('button', '', 'Recover tabs');
    recover.addEventListener('click', async () => {
      try {
        const result = await resumeUrls(entry.tabs);
        flash(`Reused ${result.existing}, opened ${result.opened} tabs`);
      } catch (e) { flash(`Error: ${e.message}`); }
    });
    const save = el('button', '', 'Save as task');
    save.addEventListener('click', async () => {
      const name = prompt('Name this workspace:', entry.tabs[0]?.title || 'Recovered workspace');
      if (!name?.trim()) return;
      await mutate(s => createTask(s, name, entry.tabs));
      flash('Recovered workspace saved');
    });
    actions.append(recover, save);
    card.append(actions);
    $('history').append(card);
  }
}
function render() {
  $('tasks').replaceChildren();
  $('count').textContent = `${state.tasks.length} saved`;
  $('empty').hidden = state.tasks.length > 0;
  for (const task of state.tasks) {
    const card = el('article', `task ${state.activeId === task.id ? 'active' : ''}`);
    const top = el('div', 'task-top');
    top.append(el('div', 'task-name', task.name), el('span', `badge ${task.status === 'paused' ? 'paused' : ''}`, task.status === 'paused' ? 'Paused' : 'Active'));
    card.append(top, el('div', 'meta', `${task.tabs.length} tabs · Updated ${new Date(task.updatedAt).toLocaleString()}`));
    card.append(el('div', 'field-title', 'NEXT STEP / CHECKPOINT'));
    const note = el('textarea');
    note.placeholder = 'What were you doing? What comes next?';
    note.value = task.note;
    note.setAttribute('aria-label', `Checkpoint for ${task.name}`);
    card.append(note);
    const list = el('ul', 'tab-list');
    for (const t of task.tabs) {
      const item = el('li', '', t.title);
      item.title = t.url;
      list.append(item);
    }
    card.append(list);
    const actions = el('div', 'actions');
    const save = el('button', 'secondary', 'Save note');
    save.addEventListener('click', async () => { await mutate(s => updateTask(s, task.id, { note: note.value.trim() })); flash('Checkpoint saved'); });
    const capture = el('button', 'secondary', 'Update tabs');
    capture.addEventListener('click', async () => {
      try {
        const tabs = await currentTabs();
        if (!tabs.length) return flash('No normal web tabs found');
        await mutate(s => updateTask(s, task.id, { tabs })); flash('Tabs updated');
      } catch (e) { flash(`Error: ${e.message}`); }
    });
    const resume = el('button', '', '↗ Resume');
    resume.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      try {
        const urls = task.tabs.map(t => t.url).filter(validUrl);
        const result = await resumeUrls(task.tabs);
        state = activateTask(state, task.id);
        await writeState(state);
        render(); flash(`Reused ${result.existing}, opened ${result.opened} tabs`);
      } catch (e) { flash(`Error: ${e.message}`); }
      finally { busy = false; }
    });
    const pause = el('button', 'secondary', 'Pause');
    pause.disabled = task.status === 'paused';
    pause.addEventListener('click', async () => {
      await mutate(s => ({ ...updateTask(s, task.id, { status: 'paused', note: note.value.trim() }), activeId: s.activeId === task.id ? null : s.activeId }));
      flash('Task paused');
    });
    const remove = el('button', 'danger', '×');
    remove.title = 'Delete saved task';
    remove.setAttribute('aria-label', `Delete ${task.name}`);
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete saved workspace “${task.name}”? This will not close browser tabs.`)) return;
      await mutate(s => ({ tasks: s.tasks.filter(t => t.id !== task.id), activeId: s.activeId === task.id ? null : s.activeId }));
    });
    actions.append(save, capture, resume, pause, remove);
    card.append(actions);
    $('tasks').append(card);
  }
}

$('create').addEventListener('click', async () => {
  const name = $('taskName').value.trim();
  if (!name) return flash('Enter a task name first');
  try {
    const tabs = await currentTabs();
    if (!tabs.length) return flash('Open at least one normal web tab');
    await mutate(s => createTask(s, name, tabs));
    $('taskName').value = '';
    flash(`Saved ${tabs.length} tabs`);
  } catch (e) { flash(`Error: ${e.message}`); }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.threadHistoryV2) {
    history = changes.threadHistoryV2.newValue || [];
    renderHistory();
  }
  if (area === 'local' && changes.threadStateV1 && !busy) {
    state = changes.threadStateV1.newValue || { tasks: [], activeId: null };
    render();
  }
});
$('trackingEnabled').addEventListener('change', async () => {
  settings.tracking = $('trackingEnabled').checked;
  await chrome.storage.local.set({ threadSettingsV2: settings });
  if (settings.tracking) {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    const focused = windows.find(w => w.focused) || windows[0];
    if (focused) await chrome.runtime.sendMessage({ type: 'CAPTURE_WINDOW', windowId: focused.id });
  }
  flash(settings.tracking ? 'Recent work tracking enabled' : 'Tracking disabled');
});
$('savePrivacy').addEventListener('click', async () => {
  const raw = $('excluded').value.split(/[,\n]/).map(d => d.trim().toLowerCase()).filter(Boolean);
  const domains = raw.map(d => d.replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
  if (domains.some(d => !/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(d))) return flash('Use domain names, one per line');
  settings.excludedDomains = [...new Set(domains)];
  await chrome.storage.local.set({ threadSettingsV2: settings });
  history = [];
  await chrome.storage.local.set({ threadHistoryV2: [] });
  renderHistory(); flash('Exclusions saved and prior history cleared');
});
$('clearHistory').addEventListener('click', async () => {
  if (!confirm('Delete all recent-session history? Saved workspaces will remain.')) return;
  history = [];
  await chrome.storage.local.set({ threadHistoryV2: [] });
  renderHistory(); flash('Recent history cleared');
});
const extras = await chrome.storage.local.get(['threadHistoryV2', 'threadSettingsV2']);
history = extras.threadHistoryV2 || [];
settings = extras.threadSettingsV2 || settings;
$('trackingEnabled').checked = settings.tracking;
$('excluded').value = settings.excludedDomains.join('\n');
renderHistory();
render();
