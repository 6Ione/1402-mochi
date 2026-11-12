# Python | audit_1402.py | Windows/macOS/Linux (Python 3.9+) | Read-only firmware evidence validator
"""Audit a provided Mochi 14.02 archive without executing any bundled code.
Usage: python audit_1402.py "new inf(1).zip"
"""
import sys,zipfile,json,hashlib,struct,re,csv
from io import BytesIO
from pathlib import Path

def audit(archive):
 with zipfile.ZipFile(archive) as z:
  files={Path(n).name:z.read(n) for n in z.namelist() if not n.endswith('/')}
 elf=files['kernel_1402.bin']; source=json.loads(files['offsets-1402.json']); base=int(source['meta']['known_elf_base'],16)
 if elf[:4]!=b'\x7fELF' or elf[4]!=2 or elf[5]!=1:raise ValueError('not ELF64 little endian')
 ph=[]; phoff=struct.unpack_from('<Q',elf,32)[0]; size=struct.unpack_from('<H',elf,54)[0];count=struct.unpack_from('<H',elf,56)[0]
 for i in range(count):
  typ,flags,o,va,pa,fs,ms,al=struct.unpack_from('<IIQQQQQQ',elf,phoff+i*size)
  if typ==1:ph.append((o,va,fs,ms,flags))
 def read_rva(rva,n):
  va=base+rva
  for o,v,sz,ms,flags in ph:
   if v<=va and va+n<=v+sz:return elf[o+va-v:o+va-v+n]
  return None
 checks=[]
 for e in source['entries']:
  if not e.get('signature'):continue
  want=bytes.fromhex(e['signature']);rva=int(e['rva'],16)
  got=read_rva(rva,len(want)) if e.get('scope')=='kernel' else None
  checks.append({'name':e['name'],'rva':e['rva'],'scope':e['scope'],'matched':got==want,'occurrences':elf.count(want)})
 print('ELF bytes:',len(elf));print('SHA-256:',hashlib.sha256(elf).hexdigest())
 print('Matches expected JSON hash:',hashlib.sha256(elf).hexdigest()==source['meta']['known_elf_sha256'])
 print('Kernel RVAs with signatures:',len(checks),'matched:',sum(x['matched'] for x in checks))
 print('Unique signatures:',sum(x['occurrences']==1 for x in checks),'; ambiguous signatures:',sum(x['occurrences']>1 for x in checks))
 for x in checks:
  if not x['matched']:print('MISMATCH',x)
 for name,rva in [('PFS entry',0x6276f0),('PFS hook1',0x6a3e79),('PFS hook2',0x6a40aa),('Old memcpy patch location',0x2bd85d),('14.02 memcpy patch candidate',0x2bdb5d)]:
  b=read_rva(rva,8)
  print(name,hex(rva),(b or b'').hex())
 seed=0xa80f68;data=read_rva(seed-0x200,0x1000)
 if data is not None:
  for pat in ('4895c3','4e95c3'):
   needle=bytes.fromhex(pat)
   print('Swap scan pattern',pat,'hits:',[hex(seed-0x200+i) for i in range(len(data)-len(needle)+1) if data[i:i+len(needle)]==needle])
 print('IMPORTANT: internal consistency cannot establish firmware authenticity or successful exploitation.')
 return checks
if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('Usage: python audit_1402.py "new inf(1).zip"')
 audit(sys.argv[1])
