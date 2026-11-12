# Mochi v0.4.8 — bounded WebKit diagnostics

This builds on the user-supplied v0.4.7 repair and **does not claim to jailbreak PS4 firmware 14.02**.

## What changed

- Fixed error visibility: `ADDR0F-FAIL` is now shown as a WebKit failure, instead of leaving the summary at “Not reported”.
- On failed carrier coverage, the engine emits `MOCHI-COVERAGE-REJECT` and immediately rejects the attempt. It **does not grow the carrier** and **does not automatically retry** that candidate.
- Landing-page controls use `mem=2`, `attempts=3` on WebKit/host (`attempts=1` for native), `retry=0`, and `diag=full`. The core's memory estimates are **not measurements of system RAM**.
- UI states indicate that kernel and native stages were not reached if the primitive failed.
- The kernel exploit is deliberately not linked from the main launcher following the previously reported system shutdown.
- The raw existing exploit sources and binaries remain packaged for research; no offset has been treated as verified by this update.

## Upload to GitHub Pages

Upload the **contents** of this ZIP to the repository root, replacing v0.4.7, including `assets/`. Do not upload `.git` or nest the files in a folder.

Navigate to your project's `/index.html?v=048` address, select `Test WebKit`, and read the result. A fresh browser session is preferable after an earlier crash. **Do not repeat attempts following a PS4 memory warning or unexpected restart.**

## Log interpretation

- `MOCHI-COVERAGE-REJECT ... action=STOP_NO_GROWTH_NO_RETRY`: the copied candidate exceeds available carrier bytes; not proof that the pointer is usable.
- `ADDROF-FAIL`: userland pointer validation failed.
- `READ-PRIMITIVE-PASS`: engine-reported userland read primitive, still not kernel execution.
- `HOST-VALIDATION PASS`: local gadget/module checks only, not native or kernel proof.

## Safety and limitations

This is a diagnostic guard, not a memory-safe sandbox: the browser exploit can still crash before reaching the guard. No JavaScript application can guarantee detection of a PS4 system memory alert or prevent a kernel panic. Running `Validate host` still invokes the underlying experimental primitive. The safest option after a shutdown is offline source analysis and inspection of PS4 Error History / PC collector logs.

## Validation

Performed static syntax, URL, artifact integrity and guard tests locally. No PS4 test performed.

## Retry reconciliation from the earlier PS4 screenshot

The previous runtime screenshot recorded `ADDROF-FAIL [1]` followed by `READ-PRIMITIVE-PASS [2]`, so retry paths should not be discarded wholesale. This build retries only explicitly marked benign, pre-mutation misses; it caps WebKit/host attempts at 3, delays 1000 ms between them, and never auto reloads the page. `COVERAGE-REJECT` remains terminal because the same oversized copied length is not expected to improve through a same-page retry. `failed()` now stops instead of secretly bypassing the safety gate. This does **not** guarantee crash avoidance.
