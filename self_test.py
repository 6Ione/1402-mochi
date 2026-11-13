#!/usr/bin/env python3
"""Static Stage 6 structural checks. Does not execute the exploit or contact PS4."""
from pathlib import Path
import hashlib, json, sys
r=Path(__file__).resolve().parent
eng=(r/'assets/baseline-044r3/mochi-engine.js').read_text()
index=(r/'index.html').read_text()
launch=(r/'launch.html').read_text()
manifest=json.loads((r/'STAGE6_MANIFEST.json').read_text())
expect=manifest['expected_original_userland_sha256']
checks={
  'core-hash-frozen':hashlib.sha256((r/'assets/baseline-044r3/core.js').read_bytes()).hexdigest()==expect['core.js'],
  'mem-hash-frozen':hashlib.sha256((r/'assets/baseline-044r3/mem.js').read_bytes()).hexdigest()==expect['mem.js'],
  'new-route-explicit': 'MOCHI_MODE === "priv-evidence"' in eng,
  'privilege-route-linked': 'stop=priv-evidence' in index,
  'privilege-read-only-syscalls': all(('SYS.'+n) in eng for n in ('geteuid','getgid','getegid')),
  'effective-uid-stub-gated': 'if (k === "geteuid") return PRIV_EVIDENCE;' in eng,
  'referrer-guard': 'if ((APM_REACH || PRIV_EVIDENCE) && !FROM_LANDING)' in eng,
  'new-route-no-apm': 'if (APM_REACH && nativeError === null)' in eng,
  'function-pointer-restoration': 'var restored = restoreMainPointer();' in eng,
  'inconclusive-on-restore-failure':'if (!restored) evidence.verdict = "INCONCLUSIVE";' in eng,
  'kernel-unverified-terminal': 'kernel=NOT-TESTED' in eng,
  'no-afterglow-import': 'import { probeAfterglow' not in eng and 'import { runAfterglow' not in eng,
  'launch-links-engine':'mochi-engine.js?v=044r3stage6priv1' in launch,
  'readme-declares-no-exploit': 'NOT a working kernel privilege-escalation exploit' in (r/'README_STAGE6.md').read_text(),
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'), k)
print('Passed:',sum(checks.values()),'/',len(checks))
sys.exit(0 if all(checks.values()) else 2)
