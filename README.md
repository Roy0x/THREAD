# THREAD — Browser Task Memory (MVP 0.2)

Local-first Chrome extension for saving, pausing, and resuming browser workspaces.

## Install without paying or publishing

1. Extract `THREAD-MVP.zip`.
2. Open Chrome and visit `chrome://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the extracted `thread-extension` folder (the folder containing `manifest.json`).
5. Click the THREAD toolbar icon to open the side panel. Pin it for convenience.

## Usage

1. Open your work-related browser tabs in one Chrome window.
2. Name the task and select **Save current window as task**.
3. Write a checkpoint such as “Need to test refresh-token flow” and click **Save note**.
4. Click **Pause** when switching to a different task.
5. Later click **Resume** to open saved websites in a new Chrome window and review your note.
6. **Update tabs** replaces a task's saved URLs with the current window's web tabs.

## Exact scope

- Stores task name, checkpoint, unique HTTP(S) URLs, titles, timestamps, and paused/active state in `chrome.storage.local`.
- Captures tabs on demand. Does **not** constantly monitor sites or track keystrokes.
- Restores saved URLs into a **new** Chrome window. Does not restore form data, scroll positions, AI response state, browser back history, or website authentication.
- Does not detect completed AI generations, read webpage content, sync between devices, or send data anywhere.
- Does not automatically close original tabs; clicking Resume repeatedly opens new windows.
- Cannot capture internal Chrome pages (`chrome://`) or file URLs in the current release.
- Task names and notes may contain sensitive information; Chrome profile access should be protected.

## Architecture

```
Toolbar icon → Chrome Side Panel (panel.html / panel.js)
                      │
                      ├─ tabs/windows APIs → capture and restore URLs
                      └─ store.js → chrome.storage.local → task records
Background service worker → opens side panel on toolbar click
```

Manifest V3, plain JavaScript, zero dependencies, no backend, no API key.

## Next validation milestones

1. Test with 5 developers using three interrupted tasks each.
2. Measure whether they can resume the right task within 15 seconds.
3. Track how often they save a checkpoint without prompting.
4. Only then consider optional reminders, task suggestions, and cross-device sync.

## Known engineering limits

Storage writes are last-writer-wins across simultaneous side panels. A future version should serialize updates if multi-panel editing becomes common. Capturing the focused window may not represent all tabs from a multi-window project. Browser permission prompts may vary by Chrome version.

## v0.2

Enable Recent work recovery in THREAD's side panel to record up to 30 local URL/title snapshots. Use Recover tabs to reuse already-open URLs and reopen missing tabs, or Save as task to create a workspace. Domain exclusions clear old history. Tracking is off by default and never reads page contents or incognito tabs. No automatic task inference is claimed.

To update an unpacked extension, run `git pull origin main`, then select Reload at `chrome://extensions`.
