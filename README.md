<<<<<<< HEAD
# Mochi — PS4 14.02 WebKit Research Dashboard

Static GitHub Pages front end for collecting **non-destructive** browser environment observations and interpreting logs from the pre-existing Afterglow research baseline.

## Contents

- `index.html`: Mochi user interface
- `assets/mochi.css`: theme and mascot treatment
- `assets/mochi.js`: browser preflight, log analysis, and JSON report export
- `assets/mochi-webkit.js`: 10-round JavaScript/WebKit standard-behavior checks
- `assets/mochi-mascot.png`: included original Mochi mascot PNG

## GitHub Pages

1. Create repository `mochi-1402` or put these files in a subfolder of an existing Pages repository.
2. Upload `index.html`, `README.md`, and the `assets` directory, preserving case and paths.
3. Put your supplied mascot PNG at `assets/mochi-mascot.png` to replace the CSS fallback.
4. Go to repository Settings → Pages → Deploy from a branch, using `main` and `/ (root)`.
5. Open `https://6ione.github.io/mochi-1402/` if that is the chosen repo name and account. The URL will only work after publication.

## Scope and honesty

- No kernel exploitation, payload injection, memory corruption, exploit auto-launch, or external network analytics are included.
- A successful preflight means ordinary APIs are present, not that a WebKit vulnerability is present.
- Imported logs are analyzed locally and **not uploaded**.
- `PRIMITIVE-OK`, `15/15`, and similar labels are reported evidence rather than reproducible verification by this dashboard.
- Historical Afterglow source is **not bundled**. Existing code must be assessed separately; Mochi is a new interface, not a validated 14.02 exploit.
- The dashboard is ES5-friendly for older browser engines. Some optional APIs may be unavailable.

## Version 0.2 WebKit lab

Click **Run 10 test rounds** to perform 70 standard-behavior tests (7 probes × 10 rounds). A passing run checks only JavaScript and Canvas behavior, not firmware offsets, memory corruption, ROP, or kernel privileges. Export a report after the probes complete to capture results in `webkitCompatibility`.

**Do not use the success of this test as evidence of a jailbreak.** This lab intentionally does not execute Afterglow.
=======
# Mochi 14.02 v0.4.4 — Unified failure trace

## Scope

One click **Run full trace**:

1. Existing WebKit primitive (with retries preserved).
2. WebKit base, all 15 gadget signature bytes, libkernel stub discovery.
3. Read-only native calls through the existing ROP bridge: `getpid`, `getuid`.
4. Existing `runAfterglow` kernel route, including its **unchanged** userland RWX safety guard.
5. Explicit structured stop reasons for known early exits; fallback to UNKNOWN if no reason was captured.

The kernel path can hang/crash and this build **does not bypass safeguards**, guess offsets, claim patched vulnerability, or independently verify kernel writes. A 15/15 signature result does not establish gadget behavior. `getuid=0` alone would not prove kernel compromise.

**Important current blocker:** `afterglow-g.js` conservatively returns `false` when the browser can create a userland RWX mapping (`AG-STOP code=USERLAND-RWX-GUARD`). This guard's result does not indicate jailbreak state. If it trips again, the kernel trigger is explicitly *not reached*. Diagnosing this is progress but not a jailbreaking success.

## Publish using GitHub Pages

Upload all files and folders (including `assets`, `.bin` files, and the new `index.html`, `launch.html`) to one repository root. Start from that repository's `index.html` so the same-folder referrer check passes. Click **Run full trace**. Runtime progress, first failing stage and previous status remain visible. The page uses no JSON download or screenshot-based workflow. GitHub Pages is static; **it cannot receive logs**.

## Optional automatic log capture on your PC, no jailbreak required

If you want logs stored automatically instead of photos, on a PC connected to the same LAN as the PS4:

1. Extract this ZIP and run `python serve_and_capture.py` in its folder.
2. Find your PC's LAN IPv4 address (`ipconfig` on Windows).
3. On PS4 open `http://PC-LAN-IP:8787/` and click **Run full trace**.
4. The console shows **PC CAPTURE ON** and the PC saves timestamped `mochi_logs/MOCHI-*.ndjson` files.

This avoids HTTPS-to-HTTP mixed-content restrictions by serving the page and collector from the **same HTTP origin**. Permit TCP 8787 on Windows Firewall for your private LAN if required. Do not expose port 8787 to the internet. Running the test through this PC server is an alternative to GitHub Pages, not a step that requires a jailbreak. The collector is best effort: a fatal WebProcess crash can prevent the last buffered events from arriving. Network capture can affect exploit timing; the engine itself makes no synchronous POST calls.

## Diagnostic interpretation

`MOCHI-RUN`, `MOCHI-STEP`, `MOCHI-NATIVE`, `AG-DIAG`, `AG-STOP`, and `MOCHI-STOP` mark the stage boundaries. `HOST-VALIDATION PASS` only applies to the limited host-only mode. In unified mode, `AG-RUN-RETURNED-FAILURE` is the overall result, and `AG-STOP` identifies specific causes when available. A current 14.02 APM vulnerability/patch decision **cannot be inferred from a userland guard result**. Kernel-access claims require independent evidence.

## Local validation

Source was statically checked and packaged; no PS4 execution was performed. This release adds diagnostics and a read-only native-userland check, but **does not modify the original kernel trigger logic or bypass any guard**.
>>>>>>> f9b9cfdb9a2b5b3d16ee442ccf14f5bace9ea177
