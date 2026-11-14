import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeUrls, focusSavedUrl } from '../resume.js';

function fakeChrome(initialTabs) {
  const tabs = initialTabs.map(t => ({ ...t }));
  const created = [];
  const focused = [];
  let nextId = 800;
  return {
    created, focused, tabs,
    tabs: {
      query: async () => tabs.map(t => ({ ...t })),
      create: async options => {
        const tab = { id: ++nextId, windowId: options.windowId ?? 10, url: options.url, active: !!options.active };
        tabs.push(tab);
        created.push({ ...options, id: tab.id });
        return { ...tab };
      },
      update: async (id, update) => {
        focused.push({ type: 'tab', id, ...update });
        return tabs.find(t => t.id === id);
      },
    },
    windows: {
      update: async (id, update) => {
        focused.push({ type: 'window', id, ...update });
        return { id, ...update };
      },
    },
  };
}

test('reuses existing exact saved tab without opening a duplicate', async () => {
  const chrome = fakeChrome([{ id: 41, windowId: 7, url: 'https://example.org/a' }]);
  const result = await resumeUrls([{ id: 41, windowId: 7, url: 'https://example.org/a' }], chrome, 41);
  assert.equal(result.opened, 0);
  assert.equal(result.existing, 1);
  assert.equal(chrome.created.length, 0);
  assert.deepEqual(chrome.focused.slice(-2), [
    { type: 'window', id: 7, focused: true },
    { type: 'tab', id: 41, active: true },
  ]);
});

test('restores missing URLs into the original open task window', async () => {
  const chrome = fakeChrome([{ id: 41, windowId: 7, url: 'https://example.org/a' }]);
  const saved = [
    { id: 41, windowId: 7, url: 'https://example.org/a' },
    { id: 42, windowId: 7, url: 'https://example.org/b' },
  ];
  const result = await resumeUrls(saved, chrome, 41);
  assert.equal(result.opened, 1);
  assert.equal(result.existing, 1);
  assert.equal(chrome.created[0].windowId, 7);
  assert.equal(chrome.created[0].active, false);
});

test('returned resolution lets the panel persist recreated tab identities', async () => {
  const chrome = fakeChrome([{ id: 41, windowId: 7, url: 'https://example.org/a' }]);
  const saved = [
    { id: 41, windowId: 7, url: 'https://example.org/a' },
    { id: 42, windowId: 7, url: 'https://example.org/b' },
  ];
  const result = await resumeUrls(saved, chrome, 42);
  const newTab = chrome.created[0];
  assert.equal(result.opened, 1);
  assert.ok(Array.isArray(result.resolvedTabs), 'resumeUrls must return resolvedTabs for the panel to persist');
  const second = result.resolvedTabs.find(t => t.url === 'https://example.org/b');
  assert.equal(second.id, newTab.id);
  assert.equal(second.windowId, 7);
  assert.equal(result.preferredTabId, newTab.id);
});

test('focusSavedUrl reuses exact saved tab rather than another duplicate URL', async () => {
  const chrome = fakeChrome([
    { id: 10, windowId: 7, url: 'https://example.org/same' },
    { id: 11, windowId: 7, url: 'https://example.org/same' },
  ]);
  const result = await focusSavedUrl({ id: 11, windowId: 7, url: 'https://example.org/same' }, chrome);
  assert.equal(result.tab.id, 11);
  assert.equal(chrome.created.length, 0);
});
