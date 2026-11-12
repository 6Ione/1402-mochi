# Mochi v0.4.7 PS4 launcher repair

## Confirmed defects in supplied mochi.zip

Unresolved Git merge conflict markers appeared in index.html, launch.html, README.md, assets/mochi-launch.js, assets/mochi-monitor.js, assets/jb-g.js, and assets/afterglow-g.js. JavaScript files with these markers cannot parse. That is sufficient to explain inert buttons or import failure.

## Changes

- Resolved conflict blocks using newer HEAD branch (the conservative v0.4.6 behavior); notably preserved no-fallback on missing kernel pivot gadget.
- Replaced landing page with three large direct links. Links work even if launcher JavaScript fails.
- Simplified launch view while retaining all DOM IDs expected by jb-g.js, mochi-monitor.js, mochi-capture.js.
- Preserved original engine, audit and payload files apart from conflict-marker removal.
- Limited default menu to WebKit, host, and read-only native testing because previous full-chain run caused console shutdown.
- Kept single-attempt, no-page-retry settings in URLs. The underlying engine may still allocate significant memory; these tests aren't crash-proof.

## Deploy to GitHub Pages

Upload the *contents* of this folder to the Pages repository root (index.html, launch.html, assets/, payload binaries). Do NOT upload a surrounding folder. Force-refresh the browser or open the page with ?v=047 in the URL. Press Validate host; the live page should show 'Loading engine module...' then engine status/logs. Do not treat hosting or host checks as jailbreak proof.

## Local validation

Static parse checks and archive integrity checks are performed on the package. Actual PS4 behavior remains untested.
