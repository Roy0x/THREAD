# THREAD × PROOF: first coding-agent acceptance pilot

**Branch:** feature/proof-acceptance-pilot. This branch preserves THREAD main and does not modify the extension's released version.

## Target defect / improvement

When a stored task's original tab has been closed, THREAD can restore a tab on Resume, but `resumeUrls` does not return the newly resolved tab identities for the side panel to persist. On future resumes, the stored preferred tab ID may still point to the closed tab. The acceptance test requires `resumeUrls` to return `resolvedTabs` with the current `id` and `windowId` and a `preferredTabId` indicating the actual focused tab. The panel should use this returned information to persist refreshed identities.

## Acceptance contract

`proof.json` is developer-authored and must remain **unchanged** during the agent task. It runs four Node.js tests from `tests/resume.proof.test.mjs` and checks required files. One test is intentionally failing on the initial branch. No paid AI service or third-party JS package is required.

## Run locally, before asking an agent to change code

1. Clone or fetch this branch of THREAD into a *separate* working tree. Do not run these commands in PROOF-DEV or overwrite your active Chrome extension folder.
2. In a terminal at PROOF-DEV/proof-verification-engineer, run:

```powershell
$proof = "$HOME\Desktop\PROOF-DEV\proof-verification-engineer\.venv\Scripts\proof.exe"
$target = "$HOME\Desktop\THREAD-PROOF-PILOT"
& $proof --root $target snapshot --task-id thread-resume-identity-001
& $proof --root $target verify --task-id thread-resume-identity-001 --agent-claim UNKNOWN --require-snapshot --allow-commands
```

The initial result is expected to be FAILED: `resumeUrls` currently does not return tab resolution metadata.

3. Ask your actual coding agent to fix THREAD in the pilot checkout: update `resume.js` and `panel.js` so the returned live tab identities are persisted, without editing `proof.json` or the acceptance tests. Do not accept an agent's assertion as proof.
4. Repeat the PROOF verification with the same task ID and unchanged contract:

```powershell
& $proof --root $target verify --task-id thread-resume-identity-001 --agent-claim COMPLETED --require-snapshot --allow-commands
& $proof --root $target history
& $proof --root $target report --format html
```

5. Use the two `proof-*.json` basenames from history with `proof compare --before ... --after ...`. A FAILED -> VERIFIED comparison is meaningful only if the frozen acceptance contract is unchanged.

## Claims and limits

This file and the acceptance branch are **not** evidence that a real agent ran or that the fix was delivered. This is a prepared acceptance test. PROOF's local Git snapshots are unsigned and do not prove agent identity. A browser smoke test is still needed before merging THREAD's code fix.
