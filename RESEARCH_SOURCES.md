# Evidence inventory — Mochi 14.02

This is a research index. These archives are **not** included in the GitHub Pages deployment and are not evidence of a confirmed 14.02 kernel jailbreak.

| Local source archive | SHA-256 | Role |
|---|---|---|
| `Mochi_v0.4.4_Unified_Trace.zip` | `1ca937d5aee0cb04dbb5aecb89211b1293cf266f31a6174eda46f100d303f575` | Original measured working userland baseline; kernel attempt crashed |
| `new inf(1).zip` | `752c8c1084da4040c1b6d58bb2482c8b6a3ff3f189110a3f9760d715c2ecf568` | 14.02-labeled kernel ELF, offsets and HEN research archive |
| `lovell1402(1).zip` | `df06ffd9761901e88ecf1e3b24b1f9151d190e11fc6fc9e4efc8f4813f2f310d` | Afterglow-derived older source research |
| `Mochi-.zip` | `d853648011c82c948d59284177fe509dcc7493ae7b1dc9a59ae0259868d6e235` | Uploaded prior engine snapshot |
| `mochi-1402-v0.3(2).zip` | `d45461b798ff25d2f5a7faa3ee3ac1f713115f59038fc92840685763424245be` | Browser compatibility 350/350 diagnostic suite |

## Operational boundary
- Active launcher supports `stop=primitive`, `stop=host`, and `stop=native` only.
- Any `afterglow`, payload, patch, or unsupported mode URL is rejected by the active engine before primitive setup.
- Original `afterglow-g.js`, `jb-g.js` and payload blobs are preserved in `research_reference/` and never imported or fetched by the userland checks.
- Original baseline `core.js` and `mem.js` are retained byte for byte in `assets/baseline-044r/`.
- No firmware 14.02 kernel vulnerability has been verified.
