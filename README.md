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
