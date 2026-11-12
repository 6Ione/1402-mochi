# Mochi 14.02 — Kernel stage reconciliation (offline, read-only)

**Date:** 2026-11-12. **Hardware verification:** none.  **Firmware origin:** supplied archive, not independently authenticated.

## Observations

* ELF64 SHA-256 `a1522676dabb9cb51a1f94ebced0e725b1d605202a87f6c07aad2625c169a704` matches JSON metadata from the same archive. That is *internal consistency* only.
* `38` kernel signature entries tested, `38` matched the supplied ELF. `15` patterns occur once; `23` are ambiguous patterns.
* **Leak anchor `0xE6C30` is within the executable PT_LOAD range** and begins with an x86-64 prologue (`55 48 89 E5`). This is a plausible code address; it still has not been proven to be the exact address leaked by the Afterglow race on a real 14.02 console.
* **The exact `48 95 C3` kernel gadget does not occur within the executable file-backed segments.** The alternate `4E 95 C3` occurs at `0xA81478`, within an executable mapping, and disassembles as `xchg rax, rbp; ret` (an equivalent instruction sequence). It could work when used as a ROP gadget despite near-random surrounding bytes; it is **not proven live**.
* **15/15 inherited Afterglow patch byte sequences are already present at the inherited offsets in the supplied ELF.** This unusual agreement does not validate their target function identities or establish whether the sample is an unmodified production kernel, a modified dump, or a constructed reference.
* The `memcpy` function starts at `0x2BDB50` in the supplied 14.02 offsets reference; inherited `memcpy` patch targets `0x2BD85D`. At the analogous `+0xD` instruction offset, the new candidate is `0x2BDB5D` (**0x300 higher**), containing `76` rather than the inherited patch byte `EB`. This is a concrete target-identity mismatch to resolve without writing to the kernel.
* `prison0` is represented inconsistently: Afterglow's direct-structure address `0x1A5C110` and a pointer slot `0x111FA18` in the HEN database; these may legitimately refer to different objects but need dataflow proof.
* The archive contains `apm` strings. That indicates some APM-related code/data exists, **not** that the race/UAF survives Sony's 14.02 changes.

## Correct next research boundary

1. Preserve the existing browser primitive and obtain a single **native-only** trace (no Afterglow trigger), preferably via PC collector. Do not force repeated attempts after a memory warning.
2. Obtain **independently sourced, unpatched 14.00 and 14.02 kernel images** (or a trusted decompiled change-set) to diff `/dev/apm` release/close operations, particularly whether a use-after-free remains reachable.
3. Resolve the kernel anchor from an actual referenced instruction; independently validate candidate gadgets and function identities before any kernel write.
4. Only after stable read-only kernel proof should patch/payload installation be considered.

## Explicit limits

No kernel crash was induced, no firmware vulnerability was proven, and no kernel read/write was tested. **A kernel panic alone is not an exploit primitive.**
