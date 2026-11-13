// JavaScript | assets/mochi-monitor.js | PS4 WebKit browser | Stage-aware status classification without speculative success
(function () {
  "use strict";
  function id(x) { return document.getElementById(x); }
  var params = window.location.search || "";
  var mode = /(?:\?|&)stop=priv-evidence(?:&|$)/.test(params) ? "PRIVILEGE EVIDENCE"
    : /(?:\?|&)stop=apm-events(?:&|$)/.test(params) ? "APM EVENT"
    : /(?:\?|&)stop=apm(?:&|$)/.test(params) ? "APM REACHABILITY"
    : /(?:\?|&)stop=host(?:&|$)/.test(params) ? "HOST VALIDATION"
    : /(?:\?|&)stop=primitive(?:&|$)/.test(params) ? "WEBKIT ONLY"
    : /(?:\?|&)stop=native(?:&|$)/.test(params) ? "NATIVE VALIDATION" : "DISABLED ROUTE";
  if (id("active-mode")) id("active-mode").textContent = mode;
  var output = id("out"), previous = "";
  function set(name, value, klass) { var e=id(name);if(e){e.textContent=value;if(klass)e.className=klass;} }
  function last(t, re) { var m, x=null;re.lastIndex=0;while((m=re.exec(t)))x=m;return x; }
  function update() {
    if (!output) return;
    var t = output.textContent || "";
    if (t===previous)return;
    previous=t;
    var primitive=/(?:READ-PRIMITIVE-PASS|PRIMITIVE-OK|PRIMITIVE-ONLY\s+PASS)/.test(t);
    if(primitive)set("m-primitive","Reported PASS","good");
    var gadget=last(t,/gadget-table-fits-module[^\n]*?(\d+)\s*\/\s*(\d+)/gi);
    if(gadget)set("m-gadget",gadget[1]+" / "+gadget[2]+" signatures",+gadget[1]===+gadget[2]?"good":"bad");
    var step=last(t,/MOCHI-STEP\s+([^\n]+)/g), kstep=last(t,/AG-DIAG\s+([^\n]+)/g);
    if (step || kstep) {
      var a=step?step.index:-1, b=kstep?kstep.index:-1;
      set("mochi-boundary",(b>a ? kstep[1] : step[1]).slice(0,140));
    }
    var stop=last(t,/AG-STOP\s+([^\n]+)/g) || last(t,/MOCHI-STOP\s+([^\n]+)/g);
    if(stop) {
      set("mochi-stop", stop[1].slice(0,155), "bad");
      set("m-afterglow","Stopped · see reason","bad");
      set("m-state","STOP REASON RECORDED","bad");
    } else if(/AG-RUN-RETURNED-FAILURE/.test(t)) {
      set("mochi-stop","Afterglow returned failure; specific cause not established","bad");
      set("m-afterglow","Failure reported","bad");
    } else if(/AG-RUN-RETURNED-SUCCESS/.test(t)) {
      set("m-afterglow","Interface returned · not kernel proof","caution-text");
      set("mochi-stop","Kernel success requires independent verification");
    } else if(/AG-PREFLIGHT-PASS/.test(t)) {
      set("m-afterglow","Preflight PASS only","caution-text");
    }
    if (/MOCHI-PRIV\s+VERDICT=/.test(t)) {
      var priv=last(t,/MOCHI-PRIV\s+VERDICT=([^\s]+)/g);
      set("mochi-stop", "Process identity: " + (priv ? priv[1] : "INCONCLUSIVE") + "; kernel not tested");
      set("m-state", "PROCESS IDENTITY RECORDED");
    }
    if (/NATIVE-ONLY-PASS/.test(t)) {
      set("mochi-stop", "Read-only getpid/getuid passed; kernel not tested", "good");
      set("m-state", "NATIVE USERLAND PASS", "good");
    }
    if (/HOST-VALIDATION\s+FAIL/.test(t)) set("m-state","HOST VALIDATION FAILED","bad");
    if (/HOST-VALIDATION\s+PASS/.test(t)) set("m-state","Host checks passed; native/kernel not tested","good");
    if (!stop && !/AG-RUN-RETURNED-FAILURE/.test(t) && /MOCHI-STEP\s+03 native-readonly-call pass/.test(t)) set("mochi-stop","Read-only native calls passed; kernel unverified","good");
    if (/MOCHI-RESTORE\s+function-pointer=MISMATCH/.test(t)) set("mochi-stop","Native function pointer restoration mismatch","bad");
    if (/MOCHI-IMPORT-FAIL/.test(t)) set("mochi-stop","JavaScript module import failed","bad");
    set("m-afterglow","Not tested · disabled");
    set("m-final","KERNEL: NOT TESTED · ROUTE DISABLED");
  }
  var updateScheduled = false;
  if (window.MutationObserver && output) new MutationObserver(function () {
    if (updateScheduled) return;
    updateScheduled = true;
    window.setTimeout(function () { updateScheduled=false; update(); }, 350);
  }).observe(output,{childList:true,characterData:true,subtree:true});
  window.setInterval(update,1500);
}());
