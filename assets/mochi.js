/* JavaScript | assets/mochi.js | PS4 browser / static GitHub Pages | Mochi 14.02 non-destructive diagnostics */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function text(node, content) { node.textContent = String(content); }
  function make(tag, className, content) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (content !== undefined) text(n, content);
    return n;
  }
  var report = {project:'Mochi', version:'0.2.0', firmwareTarget:'14.02',
    generatedAt:null, userAgent:navigator.userAgent, preflight:[], findings:[],
    limitation:'Preflight checks test ordinary browser API availability only. No exploit or kernel-stage action is executed.'};
  function check(label, callback) {
    var value;
    try { value = callback(); }
    catch (err) { value = {status:'fail', value:String(err)}; }
    report.preflight.push({name:label, status:value.status, detail:value.value});
  }
  function renderChecks() {
    var target=el('checks'); target.textContent='';
    for(var i=0;i<report.preflight.length;i++) {
      var c=report.preflight[i], row=make('div','check');
      row.appendChild(make('span','',c.name));
      row.appendChild(make('span',c.status==='pass'?'pass':c.status==='fail'?'fail':'warn',c.detail));
      target.appendChild(row);
    }
  }
  function runPreflight() {
    report.preflight=[];
    check('Firmware user-agent indication',function () {
      var m=navigator.userAgent.match(/(?:PlayStation 4|PS4)[^)]*?([0-9]{2}\.[0-9]{2})/i);
      var v=m?m[1]:'not exposed';
      return {status:v==='14.02'?'pass':'warn',value:v+' (not cryptographic attestation)'};
    });
    check('JavaScript BigInt',function () {return {status:typeof BigInt==='function'?'pass':'warn',value:typeof BigInt==='function'?'Available':'Unavailable'};});
    check('MessageChannel',function () {return {status:typeof MessageChannel==='function'?'pass':'warn',value:typeof MessageChannel==='function'?'Available':'Unavailable'};});
    check('History replaceState',function () {return {status:typeof history.replaceState==='function'?'pass':'warn',value:typeof history.replaceState==='function'?'Available':'Unavailable'};});
    check('Canvas 2D',function () {
      var c=document.createElement('canvas');var ok=!!(c.getContext&&c.getContext('2d'));
      return {status:ok?'pass':'warn',value:ok?'Available':'Unavailable'};
    });
    check('FontFace API',function () {return {status:typeof FontFace==='function'?'pass':'warn',value:typeof FontFace==='function'?'Available':'Unavailable'};});
    check('Browser storage',function () {return {status:'warn',value:'Not used or required by Mochi'};});
    report.generatedAt=new Date().toISOString();
    renderChecks();
    text(el('preflight-status'),'Completed');
    text(el('runtime'),'Browser checks complete');
  }
  function find(str,re){return re.test(str);}
  function analyze() {
    var raw=el('log').value;
    report.findings=[];
    var rx=[
      {id:'primitive',re:/\b(PRIMITIVE-OK|READ-PRIMITIVE-PASS)\b/i,title:'Primitive success reported',detail:'The supplied log reports a primitive success. This analyzer cannot independently validate reads or writes.',kind:'pass'},
      {id:'gadgets',re:/gadget-table-fits-module[^\r\n]*15\s*\/\s*15/i,title:'15/15 WebKit gadget signatures reported',detail:'This supports the specified byte signatures for one run, not the entire 14.02 offset profile.',kind:'pass'},
      {id:'early-abort',re:/this kernel is already open|Not firing again|Not trying again/i,title:'Questionable early-abort guard',detail:'In the audited source, the guard tests an RWX user-process mapping. That does not establish kernel privilege.',kind:'warn'},
      {id:'failure',re:/exploit failed|PROOF-FAIL|VERDICT\s+unusable|\bFAIL\b/i,title:'Failure was reported',detail:'Do not treat a nearby UI success banner as proof that the operation succeeded.',kind:'fail'},
      {id:'missing',re:/\bundefined\b|\bmissing\s*[:=]/i,title:'Unresolved parameters or dependencies',detail:'Check values at their actual call sites; an empty required-items list is not a positive integrity proof.',kind:'warn'},
      {id:'vacuous',re:/kernel-table-present|kpatch-table-present|payload-table-present/i,title:'Table presence labels detected',detail:'The audited Afterglow wrapper can label checks as passing when the required sets are empty.',kind:'warn'},
      {id:'rwx',re:/mprotect|mmap|RWX/i,title:'Process memory-permission log detected',detail:'User-process memory permission changes are not kernel read/write proof.',kind:'warn'},
      {id:'libc',re:/LibcInternal|findLibByShape|libc-gadget/i,title:'LibcInternal activity mentioned',detail:'A log mention is not equivalent to verifying the complete gadget table or obtaining kernel privileges.',kind:'warn'}
    ];
    for(var i=0;i<rx.length;i++)if(find(raw,rx[i].re))report.findings.push({id:rx[i].id,kind:rx[i].kind,title:rx[i].title,detail:rx[i].detail});
    if(!raw.trim())report.findings.push({id:'no-log',kind:'warn',title:'No log supplied',detail:'Paste or import a log to analyze.'});
    if(raw.trim()&&!report.findings.length)report.findings.push({id:'no-patterns',kind:'warn',title:'No known diagnostic patterns found',detail:'The source remains unverified; this is not an indication of success.'});
    report.analyzedLogLength=raw.length;
    renderFindings();
  }
  function renderFindings(){
    var target=el('findings');target.textContent='';
    for(var i=0;i<report.findings.length;i++){
      var f=report.findings[i],wrap=make('div','finding'),h=make('h3',f.kind,f.title);
      wrap.appendChild(h);wrap.appendChild(make('p','',f.detail));target.appendChild(wrap);
    }
  }
  window.mochiReport = report;
  function downloadReport(){
    report.generatedAt=new Date().toISOString();
    var json=JSON.stringify(report,null,2);
    try {
      var blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob);
      var a=document.createElement('a');a.href=url;a.download='mochi-1402-report.json';
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(url);},2000);
    } catch(err){
      window.prompt('Copy Mochi report (browser download not supported):',json);
    }
  }
  el('run').addEventListener('click',runPreflight);
  el('analyze').addEventListener('click',analyze);
  el('download').addEventListener('click',downloadReport);
  el('clear').addEventListener('click',function(){el('log').value='';report.findings=[];el('findings').textContent='';el('findings').appendChild(make('div','empty','No log analyzed yet.'));});
  el('file').addEventListener('change',function(event){
    var file=event.target.files&&event.target.files[0];if(!file)return;
    if(file.size>1024*1024){window.alert('Please use a log smaller than 1 MB.');return;}
    if(typeof FileReader!=='function'){window.alert('FileReader unavailable. Paste the log instead.');return;}
    var reader=new FileReader();reader.onload=function(){el('log').value=String(reader.result);analyze();};reader.readAsText(file);
  });
  var img=document.querySelector('.mascot-art');
  if(img){img.addEventListener('load',function(){var holder=document.querySelector('.character');if(holder)holder.className+=' has-art';});}
}());
