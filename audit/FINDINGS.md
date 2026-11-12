# Firmware 14.02 reconciliation and blockers

## Evidence hierarchy

- **Offline confirmed against supplied bytes:** valid ELF64, SHA-256 matching supplied metadata, 38 matching 8-byte signatures, two `call` targets to the 14.02 `sceSblPfsSetKeys` entry.
- **Weak/circular:** matching a hash embedded in the same archive; generic x86 prologues are not unique; identifying the actual firmware build requires an independent trusted provenance chain.
- **Not established:** live PS4 kernel read/write, access to the APM UAF, native execution on a healthy PS4, persistence/GoldHEN, exact crash cause.

## Main technical risks

**Patch-site aliasing:** matching patch bytes to a wrong old RVA is not a pre-patched kernel proof. For 14.02, the old `memcpy` byte is `EB` but the moved `memcpy` function begins at `0x2BDB50`; its instruction candidate at +0xD contains `76`. Do not call the old address verified.

**Gadget mismatch:** `K.swap_rbp = 0x0A80F68` with a 4KB scan window. The expected `48 95 C3` was absent in that window in the provided ELF. A `4E 95 C3` hit nearby occurs in bytes that must not be assumed executable gadget instruction boundaries without disassembly and control-flow evidence. The fallback behavior says 'expect crash'.

**Stages are separate:** ps4-hen `1402.c` addresses describe post-escalation payload dependencies, not WebKit host gadgets, not libSceLibcInternal, and not whether the `/dev/apm` kernel flaw survives 14.02.

## Decision

Do not run automatic full-chain retries. Validate browser-host and native calls in isolated stages, reconcile all 14.02 kernel gadget and patch targets against independent firmware evidence, then demand explicit runtime proof before enabling any write path. Do not infer a 'patched vulnerability' from an uncontrolled shutdown.

**Additional HEN candidate:** the separate `hen.bin` in the outer archive is 501,152 bytes, while the nested Afterglow HEN is 500,448 bytes. These are different binaries. Without source-to-build provenance or hardware evidence we did not replace Mochi's inherited payload with the new candidate.
