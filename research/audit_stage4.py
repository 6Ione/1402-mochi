#!/usr/bin/env python3
"""Mochi Stage 4: read-only APM ownership evidence gate.

This checks instruction bytes and direct calls in a supplied, locally analysed
ELF. No PS4 contact, no native code execution, no UAF trigger, no patches.
Uses Python stdlib only; is deliberately fail-closed on input mismatch.
"""
from __future__ import annotations
import argparse, hashlib, json, struct, sys
from pathlib import Path

KNOWN_SHA256 = 'a1522676dabb9cb51a1f94ebced0e725b1d605202a87f6c07aad2625c169a704'
BASE = 0xffffffff96810000

# Each site is a byte-level anchor for a single claim. These do NOT establish
# arbitrary read/write or even independent firmware provenance.
SITES = [
('open_alloc_104',0x144b94,'bf68000000','open requests 104 bytes'),
('open_event_list_addr',0x144ba6,'488d7820','event-list structure starts at object+0x20'),
('open_event_zero_size',0x144baa,'be48000000','open zeroes 0x48 bytes in event-list area'),
('open_event_zero_call',0x144bc1,'e8ca8e1700','open calls the observed zeroing helper'),
('open_apm_mutex_ref',0x144bc6,'4c8d35cbaa0802','open references APM mutex address'),
('open_local_list_addr',0x144bcd,'488d7b30','open sets local-list address at object+0x30'),
('open_local_list_init',0x144bd4,'e8f704faff','open initializes local list'),
('filter_lock_ref',0x14524e,'488d3d43a40802','filter references the same APM mutex'),
('filter_file_private',0x145270,'498bb424a8000000','filter reads file-associated object'),
('filter_knlist_arg',0x14528d,'4883c620','filter passes object+0x20 to event registration'),
('filter_knlist_add',0x145294,'e8c7830c00','filter calls event-list add'),
('filter_unlock',0x1452ae,'e89d402300','filter releases APM lock'),
('attach_lock_ref',0x1452cb,'4c8d3dc6a30802','attach references APM mutex'),
('attach_stores_object',0x145304,'48897b70','attach saves object in registration+0x70'),
('attach_stores_ops',0x14530c,'48894368','attach saves ops-table pointer in registration+0x68'),
('attach_local_list_add',0x145310,'e8eb16faff','attach inserts registration in local list'),
('detach_lock_ref',0x14534a,'4c8d3547a30802','detach references APM mutex'),
('detach_loads_object',0x14536d,'488b7b70','detach accesses registration+0x70'),
('detach_unlink',0x14537a,'e80117faff','detach calls local-list unlink'),
('callback_lock_ref',0x1453aa,'4c8d35e7a20802','callback references APM mutex'),
('callback_loads_object',0x1453cd,'488b4370','callback accesses registration+0x70'),
('callback_deref',0x1453de,'488b4018','callback dereferences object-associated state'),
('callback_unlock',0x1453ee,'e85d3f2300','callback releases APM mutex'),
('close_lock_ref',0x144c92,'488d3dffa90802','close references APM mutex'),
('close_event_list_arg',0x144ce6,'488d7b20','close passes object+0x20 to cleanup'),
('close_event_list_cleanup',0x144cea,'e8e1870c00','close invokes event-list cleanup'),
('close_local_reset',0x144cf3,'e8981ffaff','close invokes distinct local-list reset'),
('close_unlock',0x144d0d,'e83e462300','close releases APM mutex'),
('close_free',0x144d1c,'e8bf49ecff','close invokes object release after unlock'),
('knlist_cleanup_lock_load',0x20d4f4,'488b7f40','cleanup reads event-list lock at +0x40'),
('knlist_cleanup_lock_null',0x20d4fb,'4885ff','cleanup checks for uninitialized lock'),
('knlist_cleanup_null_branch',0x20d4fe,'0f84f5000000','cleanup has no-lock return branch'),
('knlist_cleanup_helper',0x20d5ad,'e89eab2000','cleanup invokes per-entry handling'),
('knlist_add_lock_test',0x20d6fb,'49837f4000','event registration tests list lock pointer'),
('knlist_add_lock_store',0x20d702,'4d897740','event registration stores list lock pointer'),
('local_unlink_membership_clear',0xe6ad0,'48c7431000000000','local unlink clears node membership field'),
('knote_callback_count',0x418162,'837b0800','per-entry callback count is conditional'),
]

LOCK_REFERENCES = {
    'open': (0x144bc6, 7, '4c8d35cbaa0802'),
    'filter': (0x14524e, 7, '488d3d43a40802'),
    'attach': (0x1452cb, 7, '4c8d3dc6a30802'),
    'detach': (0x14534a, 7, '4c8d3547a30802'),
    'callback': (0x1453aa, 7, '4c8d35e7a20802'),
    'close': (0x144c92, 7, '488d3dffa90802'),
}

class Image:
    def __init__(self,data:bytes):
        self.data=data
        self.load_segments=[]
        if data[:4] != b'\x7fELF' or data[4:6] != b'\x02\x01':
            raise ValueError('expected little-endian 64-bit ELF')
        p_offset=struct.unpack_from('<Q',data,32)[0]
        phentsize, phnum=struct.unpack_from('<HH',data,54)
        for i in range(phnum):
            o=p_offset+i*phentsize
            typ,flags,offset,vaddr,_,filesz,memsz,_=struct.unpack_from('<IIQQQQQQ',data,o)
            if typ==1:
                self.load_segments.append(dict(file_offset=offset,virtual_address=vaddr,file_size=filesz,memory_size=memsz,flags=flags))
    def read_rva(self,rva:int,size:int)->bytes:
        target=BASE+rva
        for seg in self.load_segments:
            start=seg['virtual_address']
            if start<=target and target+size<=start+seg['file_size']:
                o=seg['file_offset']+(target-start)
                return self.data[o:o+size]
        raise ValueError('RVA not backed by ELF file: 0x%x'%rva)
    def ptr_data(self,rva:int,size:int)->bytes|None:
        try:return self.read_rva(rva,size)
        except ValueError:return None

def call_target(img:Image,rva:int)->int|None:
    b=img.read_rva(rva,5)
    return rva+5+struct.unpack('<i',b[1:])[0] if b[0]==0xe8 else None

def run(data:bytes):
    image=Image(data)
    checks=[]
    for name,rva,expected,explanation in SITES:
        actual=image.read_rva(rva,len(bytes.fromhex(expected))).hex()
        checks.append({'name':name,'rva':hex(rva),'pass':actual==expected,'expected':expected,'actual':actual,'meaning':explanation})
    checked={c['name']:c['pass'] for c in checks}
    locks={}
    for name,(rva,ilen,expected) in LOCK_REFERENCES.items():
        b=image.read_rva(rva,ilen)
        if b.hex()!=expected:
            locks[name]=None
        else:
            disp=struct.unpack_from('<i',b,3)[0]
            locks[name]=hex(rva+ilen+disp)
    lock_pass=all(x==hex(0x21cf698) for x in locks.values())
    checks.append({'name':'all_apm_paths_reference_same_lock','pass':lock_pass,'references':locks,'meaning':'static LEA targets only; runtime synchronization and quiescence unproven'})
    # Code ordering only: does not establish function identity, runtime paths, or absence of UAF.
    expected_calls={
      'event_list_zero':(0x144bc1,0x2bda90),
      'local_list_init':(0x144bd4,0xe50d0),
      'filter_register':(0x145294,0x20d660),
      'attach_local_list_add':(0x145310,0xe6a00),
      'detach_unlink':(0x14537a,0xe6a80),
      'close_knlist':(0x144cea,0x20d4d0),
      'close_local_reset':(0x144cf3,0xe6c90),
      'close_free_call':(0x144d1c,0x96e0),
      'knlist_per_entry':(0x20d5ad,0x418150),
    }
    for name,(source,destination) in expected_calls.items():
        actual=call_target(image,source)
        checks.append({'name':'call_'+name,'pass':actual==destination,'site':hex(source),'expected_target':hex(destination),'actual_target':hex(actual) if actual is not None else None})
    table=image.ptr_data(0x1a3f510,32)
    table_state='unmapped' if table is None else ('all-zero-in-file' if not any(table) else 'nonzero-in-file')
    checks.append({'name':'event_ops_table_file_state','pass':table_state=='all-zero-in-file','state':table_state,'rva':'0x1a3f510','meaning':'file representation is insufficient to bind runtime callbacks'})
    sha=hashlib.sha256(data).hexdigest()
    check_ok=sum(bool(c['pass']) for c in checks)
    result={
     'format':'mochi-stage4-apm-proof-gates-v1',
     'input':{'sha256':sha,'matches_examined_kernel':sha==KNOWN_SHA256,'bytes':len(data),'declared_load_segments':image.load_segments},
     'instruction_checks':{'passed':check_ok,'total':len(checks),'all_passed':check_ok==len(checks)},
     'checks':checks,
     'claims':{
       'verified_against_supplied_ELF':'APM registration uses saved object references; callback and close use same apparent APM lock; close calls event-list cleanup before free',
       'not_proven':['independent firmware provenance','callback quiescence after detach','dangling pointer after cleanup','kernel UAF','kernel read/write','kernel code execution','GoldHEN'],
       'UAF_verdict':'UNRESOLVED',
       'kernel_access':'NOT_DEMONSTRATED',
       'exploit_decision':'NO-GO',
     },
     'questions_for_next_stage':[
        'Identify the runtime event operations-table contents using authenticated evidence.',
        'Establish whether event-list cleanup waits for all in-flight event callbacks.',
        'Verify whether callback can be scheduled after cleanup and before release, or after release.',
        'Compare relevant code with authenticated 14.00 image; do not assume offset inheritance.',
     ]
    }
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('kernel_elf',type=Path)
    p.add_argument('--output',type=Path,default=Path('stage4_evidence.json'))
    p.add_argument('--allow-different-hash',action='store_true',help='for forensic analysis only; reports mismatch, never authenticates')
    args=p.parse_args()
    try:result=run(args.kernel_elf.read_bytes())
    except Exception as e:
        print('ERROR:',str(e),file=sys.stderr)
        return 4
    args.output.write_text(json.dumps(result,indent=2)+'\n')
    print('Local checks:',result['instruction_checks']['passed'],'/',result['instruction_checks']['total'])
    print('Input SHA-256:',result['input']['sha256'])
    print('Examined hash:',result['input']['matches_examined_kernel'])
    print('Vulnerability:',result['claims']['UAF_verdict'],'| kernel access:',result['claims']['kernel_access'])
    if not result['instruction_checks']['all_passed']:return 2
    if not result['input']['matches_examined_kernel'] and not args.allow_different_hash:return 3
    return 0
if __name__=='__main__':sys.exit(main())
