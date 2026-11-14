# Chrome smoke test: restored tab identities

**Status:** Manual checklist, **NOT YET EXECUTED**. This file is not evidence of a passing browser test.

**Goal:** Validate the Codex patch to `resume.js` and `panel.js` after the Node acceptance tests and PROOF verdict are VERIFIED. GitHub's pilot branch contains **acceptance tests only** until the actual local Codex changes are committed separately.

## Install without overwriting your existing THREAD

1. In a new Chrome profile or after backing up the current THREAD extension, go to `chrome://extensions`.
2. Enable **Developer mode** and select **Load unpacked**.
3. Choose the local **patched** `THREAD-PROOF-PILOT` folder, not the existing production extension directory.
4. Confirm the manifest loads and the THREAD side panel opens. If the same extension is already loaded from a different folder, use a separate Chrome profile to avoid confusing identities and stored data.
5. Confirm the extension's permissions remain `storage`, `tabs`, `sidePanel` and no unexpected host permission appears.

## Manual scenarios (record PASS/FAIL and observation, not just clicks)

| Case | Action | Expected |
|---|---|---|
| A — Reuse original tab | Open two distinct URLs in same Chrome window; save workspace; Resume twice | Both URLs remain in same window, no extra tabs |
| B — Restore closed preferred tab | Save workspace with URL B active, close only tab B, click Resume | Exactly one B tab created; B becomes active and the original window is focused |
| C — Re-resume after recreation | With case B restored, Resume once more | Same recreated B tab is focused; no second B tab created |
| D — Duplicate URL identity | Open two separate tabs with the same URL and save second as preferred, Resume | Second *tab ID* is selected, not the first tab with matching URL |
| E — Suggestion entry point | Pause workspace; use 'Resume task' from suggestion when it is displayed; repeat Resume | Live tab identities persist in storage, no duplicates |
| F — Reopen after browser restart | Restart Chrome, then Resume a saved task | Falls back to URL matching/restoration safely when previous Chrome tab IDs no longer exist |
| G — Non-web saved content | Verify normal existing extension restrictions | Non-HTTP(S) pages are not restored or tracked |
| H — Existing data migration | Load extension with existing `threadStateV1` tasks (backup first) | Existing saved workspaces remain intact and usable |

## Evidence to keep

Record browser/Chrome version, extension branch/commit, scenario ID, pass/fail, screenshot when helpful, and relevant tab/window behavior. Export only sanitized evidence with no personal browsing URLs, browser profile paths, email addresses, or confidential task notes.

**Acceptance to merge:** The Node suite passes, PROOF comparison is VERIFIED against the frozen contract, the actual implementation changes are reviewed and committed to this branch, and cases A–F pass in Chrome. Cases G–H should also be checked before a public release.

**Important:** A PROOF CLI verdict validates the contract checks. It does not substitute for the browser smoke test.
