# Mochi 14.02 — Stage 4 kernel event-lifetime proof gates

**Status:** static ownership research only. **No 14.02 UAF or kernel read/write/execution has been demonstrated.**

This package is a reproducible, read-only verifier for the previously supplied `kernel_1402.bin` image. It does not include a kernel image, exploit, PS4 browser launcher, payload, or GoldHEN. It neither connects to a console nor executes kernel code.

## Why this checkpoint matters

Phase 3 left one plausible ambiguity: the event-list cleanup routine may exit immediately if its lock pointer is null. Stage 4 confirms the corresponding object is zeroed at initialization, while first registration **writes** the lock pointer used by the cleanup routine. Consequently, that early exit is **not itself** evidence of skipping an active event list. It also confirms that the APM callback obtains the same apparent APM mutex as device closure before dereferencing a saved object pointer. This weakens one simplistic UAF hypothesis, but doesn't establish callback quiescence after detach.

## Reproduce with Python 3

In Windows PowerShell, inside the extracted ZIP directory:

```powershell
py -3 .\audit_stage4.py 'C:\path\to\kernel_1402.bin' --output stage4_evidence.json
py -3 .\self_test.py 'C:\path\to\kernel_1402.bin'
```

Exit 0 means all local checks passed **on that specific image**, not that the image is independently authenticated as PS4 firmware 14.02. Exit 2 means at least one check disagreed; exit 3 means the image SHA-256 is not the analyzed baseline; exit 4 means missing/invalid file. `--allow-different-hash` still reports mismatch and is for forensic differences, not acceptance of an unknown image.

Target image SHA-256: `a1522676dabb9cb51a1f94ebced0e725b1d605202a87f6c07aad2625c169a704`.

Stage 4 local results: **48/48 static checks passed**; **7/7 negative mutations detected**. These are *not* 48 exploit attempts.

## Protected userland baseline

Mochi `v0.4.4-R3` remains unmodified. The original project files are NOT included or rebuilt here. The hashes checked in the local workspace were:

- `assets/baseline-044r3/core.js`: `cfd9f607254913958d506627e35b1a72f7337fc39f08d3f560767e7e47797f87`
- `assets/baseline-044r3/mem.js`: `e58704779bc896cf25c371181f7986d368918d4198a7f30d8d8a947b5fafc08b`

## References and limits

- Public Afterglow repository: https://github.com/well0nez/afterglow-web (public support list ends at 14.00 as checked on 2026-11-12).
- FreeBSD reference event framework: https://cgit.freebsd.org/src/tree/sys/kern/kern_event.c — a conceptual reference, **not** the source of PS4's specific code.
- User-supplied `kernel_1402.bin` has unusual segment mapping; file-backed event operations-table bytes are zero, so the runtime table remains unverified.
- Independent 14.00 image needed for authenticated comparison was not present in the current workspace.

## Files

- `audit_stage4.py` — executable read-only instruction and control-flow gates.
- `stage4_evidence.json` — computed evidence with explicit unknowns.
- `self_test.py`, `SELF_TEST_RESULTS.txt` — deliberately altered in-memory copies must fail the relevant checks.
- `FINDINGS.md` — interpretation and next vulnerability evidence gates.
