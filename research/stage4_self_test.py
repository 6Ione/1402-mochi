#!/usr/bin/env python3
"""Verify Stage 4 rejects changes, without modifying the original ELF."""
import argparse, sys
from pathlib import Path
from audit_stage4 import Image, run, KNOWN_SHA256

CASES = {
  'object-allocation': 0x144b94,
  'first-registration-list-lock': 0x20d702,
  'callback-lock-reference': 0x1453ae,
  'saved-object-read': 0x1453cd,
  'knlist-cleanup-call': 0x144cea,
  'close-free-call': 0x144d1c,
}

def main():
 p=argparse.ArgumentParser();p.add_argument('kernel_elf',type=Path);args=p.parse_args()
 original=args.kernel_elf.read_bytes();base=run(original)
 assert base['instruction_checks']['all_passed'] and base['input']['sha256']==KNOWN_SHA256, 'baseline must pass'
 image=Image(original)
 outcomes={}
 for label,rva in CASES.items():
  affected_byte=image.read_rva(rva,1)
  # Convert RVA to backing file offset through declared PT_LOAD, not assumed offset=RVA.
  address=0xffffffff96810000+rva
  seg=next(s for s in image.load_segments if s['virtual_address']<=address<s['virtual_address']+s['file_size'])
  o=seg['file_offset']+(address-seg['virtual_address'])
  changed=bytearray(original)
  changed[o] ^= 0x01
  mutated=run(bytes(changed))
  rejected=not mutated['instruction_checks']['all_passed']
  outcomes[label]=rejected
  print(f'{label}: {"REJECTED" if rejected else "FALSE PASS"} at RVA 0x{rva:x}')
 # Also force corruption of the file-backed event table to prove the unknown table is checked.
 rva=0x1a3f510;address=0xffffffff96810000+rva
 segment=next(s for s in image.load_segments if s['virtual_address']<=address< s['virtual_address']+s['file_size'])
 o=segment['file_offset']+address-segment['virtual_address']
 changed=bytearray(original);changed[o]=1
 table_rejected=not run(bytes(changed))['instruction_checks']['all_passed']
 outcomes['ops-table-fingerprint']=table_rejected
 print('ops-table-fingerprint:', 'REJECTED' if table_rejected else 'FALSE PASS')
 print('PASS' if all(outcomes.values()) else 'FAIL',f'({sum(outcomes.values())}/{len(outcomes)} negative controls)')
 return 0 if all(outcomes.values()) else 1
if __name__=='__main__':sys.exit(main())
