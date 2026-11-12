# Python | verify_build.py | local development host | integrity and import/version verification for Mochi
import json,hashlib,pathlib,sys
base=pathlib.Path(__file__).resolve().parent
manifest=json.loads((base/'build_manifest.json').read_text())
fail=[]
for name,expected in manifest['sha256'].items():
    f=base/name
    if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=expected:fail.append(name)
print('Build:',manifest['build'],'Files checked:',len(manifest['sha256']),'Mismatches:',len(fail))
for name in fail: print('MISMATCH:',name)
sys.exit(1 if fail else 0)
