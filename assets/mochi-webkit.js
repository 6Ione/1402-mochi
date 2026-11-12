/* JavaScript | assets/mochi-webkit.js | PS4 WebKit / GitHub Pages | Mochi 14.02 repeatable safe compatibility probes */
(function () {
  'use strict';
  function byId(id){ return document.getElementById(id); }
  function show(name, detail, pass) {
    var line=document.createElement('div');line.className='check';
    var a=document.createElement('span');a.textContent=name;
    var b=document.createElement('span');b.className=pass?'pass':'fail';b.textContent=detail;
    line.appendChild(a);line.appendChild(b);byId('wk-results').appendChild(line);
  }
  function expect(ok, message){if(!ok)throw new Error(message);}
  var probes=[
    {name:'Typed-array byte view',run:function(){
      var b=new ArrayBuffer(16),u=new Uint8Array(b),v=new DataView(b);
      v.setUint32(4,0x12345678,true);
      expect(u[4]===0x78&&u[5]===0x56&&u[6]===0x34&&u[7]===0x12,'DataView and Uint8Array disagree');
      expect(new Uint8Array(b,4,4).byteOffset===4,'View byteOffset differs');
    }},
    {name:'ArrayBuffer copying',run:function(){
      var a=new Uint8Array(8);a[0]=42;a[7]=99;
      var b=a.buffer.slice(0);var c=new Uint8Array(b);
      expect(b!==a.buffer && c[0]===42 && c[7]===99,'Slice contents invalid');
      c[0]=11;expect(a[0]===42,'Slice unexpectedly aliases original');
    }},
    {name:'Property descriptors',run:function(){
      var o={};Object.defineProperty(o,'secret',{value:42,enumerable:false,writable:false,configurable:true});
      expect(o.secret===42,'Property value mismatch');
      expect(Object.keys(o).length===0,'Non-enumerable property exposed');
      expect(Object.getOwnPropertyDescriptor(o,'secret').writable===false,'Descriptor mismatch');
    }},
    {name:'Symbol identity',run:function(){
      if(typeof Symbol!=='function')throw new Error('Symbol not available');
      var a=Symbol('mochi'),b=Symbol('mochi'),o={};o[a]=5;
      expect(a!==b && o[a]===5 && o[b]===undefined,'Symbol identity mismatch');
    }},
    {name:'BigInt arithmetic',run:function(){
      if(typeof BigInt!=='function')throw new Error('BigInt unavailable');
      var a=BigInt('18446744073709551615');
      expect(String(a+BigInt(1))==='18446744073709551616','BigInt arithmetic mismatch');
    }},
    {name:'JSON round trip',run:function(){
      var a={version:'14.02',values:[0,1,255],flag:true};var b=JSON.parse(JSON.stringify(a));
      expect(b.version==='14.02'&&b.values[2]===255&&b.flag===true,'JSON round trip mismatch');
    }},
    {name:'Canvas pixels',run:function(){
      var c=document.createElement('canvas');c.width=2;c.height=2;
      var ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas 2D unavailable');
      ctx.fillStyle='rgb(255, 0, 0)';ctx.fillRect(0,0,1,1);
      var d=ctx.getImageData(0,0,1,1).data;
      expect(d[0]===255&&d[1]===0&&d[2]===0&&d[3]===255,'Canvas readback mismatch');
    }}
  ];
  function execute() {
    var rounds=parseInt(byId('wk-rounds').value,10);
    if([10,25,50,100].indexOf(rounds)<0)rounds=10;
    var start=(new Date()).getTime();
    var now=new Date();
    var runId='M'+now.getUTCFullYear().toString().slice(2)+pad(now.getUTCMonth()+1)+pad(now.getUTCDate())+'-'+pad(now.getUTCHours())+pad(now.getUTCMinutes())+pad(now.getUTCSeconds());
    var result={id:runId,timestamp:now.toISOString(),rounds:rounds,probes:[],userAgent:navigator.userAgent,
      scope:'Standard browser behaviors only; no memory corruption or kernel activity.'};
    var target=byId('wk-results');target.textContent='';
    var passed=0,failed=0;
    for(var i=0;i<probes.length;i++){
      var item={name:probes[i].name,passed:0,failed:0,errors:[],milliseconds:0};
      var t0=(new Date()).getTime();
      for(var j=0;j<rounds;j++){
        try {probes[i].run();item.passed++;passed++;}
        catch(e){item.failed++;failed++;if(item.errors.length<3)item.errors.push({round:j+1,message:String(e&&e.message||e).slice(0,140)});}
      }
      item.milliseconds=(new Date()).getTime()-t0;
      result.probes.push(item);
      show(item.name,item.passed+'/'+rounds+' passed'+(item.failed?' · '+item.errors[0].message:''),item.failed===0);
    }
    result.totals={passed:passed,failed:failed,executed:passed+failed,milliseconds:(new Date()).getTime()-start};
    if(window.mochiReport)window.mochiReport.webkitCompatibility=result;
    byId('wk-status').textContent=failed?'Finished · '+failed+' failures':'Finished · '+passed+' checks passed';
    byId('wk-note').textContent='Run '+runId+' · '+result.totals.executed+' checks · '+result.totals.milliseconds+' ms. Browser tests do not prove 14.02 exploit compatibility.';
    if(typeof window.mochiShowScreenReport==='function')window.mochiShowScreenReport(result);
  }
  function pad(n){return n<10?'0'+n:String(n);}
  byId('wk-run').addEventListener('click',execute);
  byId('wk-clear').addEventListener('click',function(){
    byId('wk-results').textContent='No WebKit observations collected.';
    byId('wk-status').textContent='Not run';
    byId('wk-note').textContent='Results cleared. No previous result is retained in the report.';
    if(window.mochiReport)delete window.mochiReport.webkitCompatibility;
    if(typeof window.mochiClearScreenReport==='function')window.mochiClearScreenReport();
  });
}());
