# THREAD — Chrome task-memory extension (v0.4)

Local-first Manifest V3 Chrome extension. No backend, subscription, account, or AI key.

## Update existing installation

```powershell
cd C:\Users\dmano\Downloads\THREAD-MVP\thread-extension
git pull origin main
```

Open `chrome://extensions`, click **Reload** for THREAD, then reopen its side panel. Existing named workspaces persist under `threadStateV1`.

## Features

- Save named workspaces and checkpoints; pause and resume them.
- Restore missing HTTP(S) URLs and focus existing tabs without duplicating exact URLs.
- Opt-in Recent work recovery records up to 30 local window snapshots (titles and URLs only).
- Exclude domains from **recent activity capture**. Saving a named workspace manually still includes websites the user chooses.
- **Pick up where you left off** suggests paused saved tasks and older, unsaved browser snapshots; dismiss individual suggestions.
- Clearing recent history removes its session suggestions. Tracking is off by default.
- No AI inference of task intent, no page-content access, no incognito activity capture, no native desktop tracking, and no notification spam.

## v0.3 suggestion heuristic

Paused named workspaces can be suggested even when activity tracking is off. Unsaved sessions appear only when tracking is on, are at least 15 minutes old, not older than 7 days, don't mostly overlap saved workspaces, and aren't near-duplicates of another suggestion. Up to four suggestions are displayed. Dismissals are stored locally.

## Verification

Check manual save → checkpoint → pause → resume and verify no duplicate tab creation. Enable tracking, switch tabs, then return after at least 15 minutes and inspect the suggestion list. Dismiss a suggestion and ensure it stays hidden. Reload and confirm workspaces and dismissal persistence.

**Limitations:** Heuristics are not real task detection. No form/input restoration, browser session history, cross-device sync, or AI response completion detection. Local storage is accessible to the browser profile; do not save confidential notes. Multi-panel writes are last-writer-wins.

## v0.4 task continuity

- Mark tasks done, or reopen completed tasks. Completed work is excluded from the paused-work suggestion list; saved tab URLs remain intact.
- Display whether the task's saved URLs are already open in Chrome (exact URL matching).
- Add an opt-in Activity timeline that clusters snapshots using significant exact URL overlap. Clustering does not prove which task the user intended.
- Disabling tracking hides timeline entries and unsaved-session suggestions. Clearing recent history removes timeline data.
- Updates retain the original `threadStateV1` workspaces, `threadHistoryV2` snapshots and tracking settings.

Test cases: task complete → hidden from paused suggestions → reopen → paused; browser tab presence changes; snapshot clustering; excluded domains; recent history deletion.
