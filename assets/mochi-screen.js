/* JavaScript | assets/mochi-screen.js | PS4 WebKit browser | Mochi 14.02 screenshot-first evidence report */
(function(){
'use strict';
var pages=[],current=0;
function el(x){return document.getElementById(x);}
function txt(x,v){el(x).textContent=String(v);}
function add(parent,label,value){
  var r=document.createElement('div');r.className='report-line';
  var a=document.createElement('span');a.textContent=label;
  var b=document.createElement('strong');b.textContent=String(value);
  r.appendChild(a);r.appendChild(b);parent.appendChild(r);
}
function view(){
  if(!pages.length)return;
  var pg=pages[current],root=el('sr-content');root.textContent='';
  txt('sr-run',pg.id);txt('sr-page-label','PAGE '+(current+1)+' / '+pages.length);
  add(root,'SECTION',pg.title);
  for(var i=0;i<pg.rows.length;i++)add(root,pg.rows[i][0],pg.rows[i][1]);
  el('sr-prev').disabled=current===0;el('sr-next').disabled=current===pages.length-1;
  txt('sr-state',pg.kind);
}
window.mochiShowScreenReport=function(r){
  var passed=r.totals.passed,failed=r.totals.failed,rows=[];
  pages=[{id:r.id,title:'SUMMARY',kind:failed?'Failures recorded':'Completed',rows:[
    ['Firmware target','14.02 (user-agent only)'],['Rounds',r.rounds],['Checks',r.totals.executed],
    ['Passed / failed',passed+' / '+failed],['Total time',r.totals.milliseconds+' ms'],['Result scope','Standard browser only']]}];
  for(var i=0;i<r.probes.length;i++){
    var p=r.probes[i];
    rows.push([String(i+1)+'. '+p.name,p.passed+'/'+r.rounds+(p.failed?' FAIL '+p.failed:' PASS')+' · '+p.milliseconds+'ms']);
    if(rows.length===4){pages.push({id:r.id,title:'PROBES '+(i-2)+'–'+(i+1),kind:'Probe results',rows:rows});rows=[];}
  }
  if(rows.length)pages.push({id:r.id,title:'REMAINING PROBES',kind:'Probe results',rows:rows});
  var errs=[];
  for(var j=0;j<r.probes.length;j++)if(r.probes[j].errors.length){
    var e=r.probes[j].errors[0];errs.push([r.probes[j].name,'Round '+e.round+': '+e.message]);
  }
  pages.push({id:r.id,title:'NOTES / EXCEPTIONS',kind:failed?'Review failures':'No failures',rows:errs.length?errs.slice(0,4):[
    ['Exceptions','None recorded'],['Afterglow primitive','Not tested here'],['Kernel access','Not tested here'],['Log export','Optional only']]});
  current=0;view();el('sr-print').disabled=false;
};
window.mochiClearScreenReport=function(){pages=[];current=0;txt('sr-run','NO RUN');txt('sr-page-label','PAGE 0 / 0');txt('sr-state','No test yet');txt('sr-content','Run the browser checks to generate a screenshot-ready report.');el('sr-next').disabled=true;el('sr-prev').disabled=true;el('sr-print').disabled=true;};
el('sr-prev').addEventListener('click',function(){if(current>0){current--;view();}});
el('sr-next').addEventListener('click',function(){if(current<pages.length-1){current++;view();}});
el('sr-print').addEventListener('click',function(){
  var e=el('screen-report');e.className=e.className.indexOf('compact')>=0?'panel evidence screen-report':'panel evidence screen-report compact';
  txt('sr-print',e.className.indexOf('compact')>=0?'Normal report':'Show compact report');
});
}());
