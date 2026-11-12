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
