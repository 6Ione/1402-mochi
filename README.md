# Mochi v0.4.4-R — Research Baseline

This build derives directly from the **original v0.4.4 Unified Trace** archive and retains its WebKit core/memory modules unchanged. It intentionally disables the kernel attempt responsible for an unexpected PS4 restart.

## Deploy
Extract the ZIP and upload **contents** to the GitHub Pages repository root. Open `index.html?v=044r` and choose exactly one of the three test links. The launcher uses plain HTML links for PS4 browser compatibility. The engine runs only when you deliberately choose a link.

## Modes
- `stop=primitive`: browser primitive and base checks (runtime-reported only)
- `stop=host`: module base alignment, 15 gadget byte signatures and syscall stubs; NO native calls
- `stop=native`: the above, then experimental userland `getpid` and `getuid` calls; NO kernel trigger

All routes allow at most 8 in-page primitive attempts, as with the original v0.4.4 launcher. Auto page-reload is not enabled by these modes. The original memory behavior can still be heavy and is **not** made safe simply by removing kernel steps. A PS4 memory warning means stop testing.

## Distinguish runtime messages from proof
- `READ-PRIMITIVE-PASS`: emitted by the implementation; not externally verified arbitrary access.
- `HOST-VALIDATION PASS`: signatures and stubs only.
- `NATIVE-ONLY-PASS`: indicates successful userland `getpid/getuid` through the native bridge.
- Kernel vulnerability, kernel R/W, root, sandbox escape and GoldHEN **are not tested**.

## Integrity
See `RESEARCH_SOURCES.md` for full original archive hashes. The separate `Mochi_v0.4.4R_Research_References.zip` contains dormant source and payload files for offline audit only. Do **not** deploy or execute them as a kernel chain. They are deliberately absent from this PS4 deployment ZIP.

The optional Windows `serve_and_capture.py` receiver is included but logs can also be read on-screen with GitHub Pages.
