# Mochi 14.02 — Stage 4 findings (2026-11-12)

## New finding: null lock does not by itself imply a missed detach

`0x144B94` requests `0x68` bytes for a device-associated object. `0x144BA6–0x144BC1` zeroes the 0x48-byte event-list region at object+`0x20`, with call `0x2BDA90` (the observed zeroing routine).

The event list's lock pointer at list+`0x40` begins zero. During event registration, `0x20D6FB` checks whether the list lock pointer is null; the registration path stores the active lock pointer at `0x20D702`. The cleanup at `0x20D4F4–0x20D4FE` checks that very list+`0x40` pointer and returns on null. This explains a legitimate zero-registration early-exit path. We have **no evidence** from these instructions that registered entries are bypassed.

## Other code relationships (file-observed, not live-verified)

1. Filter registration (`0x14524E`, `0x145294`) references the APM lock and calls event-list add.
2. APM attach stores a device-object pointer at knote+`0x70` (`0x145304`) and an ops pointer at knote+`0x68` (`0x14530C`); attach links a local registration list (`0x145310`).
3. Detach also references the APM lock, loads knote+`0x70`, and calls list unlink (`0x14536D`, `0x14537A`). The unlink routine clears the membership field (`0xE6AD0`).
4. The candidate event callback (`0x1453AA–0x1453EE`) references the same apparent lock, dereferences knote+`0x70` and its associated state while the lock is held, then unlocks.
5. Close (`0x144C92–0x144D1C`) calls event-list cleanup (`0x20D4D0`), resets a distinct local list (`0xE6C90`), unlocks, then calls an object-release routine (`0x96E0`).
6. `0x20D4E0` contains event-entry traversal and invokes the conditional per-entry helper at `0x418150`.
7. The kernel file's representation of the operations table at `0x1A3F510` is zeroed; runtime bindings remain unknown.

## No ungrounded UAF claim

These paths suggest synchronization around the immediate APM callback. Nothing here proves that an event callback survives cleanup, that it can be invoked after object release, or that a dangling reference can be dereferenced by an accessible userland sequence. That question cannot be settled by the static lock-address matches alone. A kernel panic would not prove it either.

## Hard gates to demonstrate the requested milestone

- **Authenticity:** acquire source-backed firmware evidence for the exact 14.02 kernel code and any runtime-initialized event operations table.
- **Lifetime:** document an actual path where the cleanup contract fails to prevent a post-release use, rather than assuming one from a residual pointer field.
- **Independent reproducibility:** require a controlled, reliably recorded hardware result on a test PS4; report negative runs as well.
- **Capability:** separate first confirmed UAF, controlled kernel memory read, controlled kernel memory write, and kernel execution. Each requires its own evidence and none follows automatically.
- **Safety:** no inherited high-memory trigger, speculative kernel patch or kernel payload until these gates are met. Keep R3 userland baseline immutable.

## Development decision

**Current APM hypothesis: UNRESOLVED**. **14.02 kernel access: NOT DEMONSTRATED.** Continue with authenticated cross-firmware comparison and event-framework teardown/quiescence review, not a speculative exploit port. This package provides an enforceable evidence gate and does not pretend to have delivered a jailbreak.
