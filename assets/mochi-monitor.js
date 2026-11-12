// JavaScript | assets/mochi-monitor.js | PS4 WebKit browser | Stage-aware status classification without speculative success
(function () {
  "use strict";
  function id(x) { return document.getElementById(x); }
  var params = window.location.search || "";
  var mode = /(?:\?|&)stop=native(?:&|$)/.test(params) ? "NATIVE-ONLY CHECK"
    : /(?:\?|&)stop=host(?:&|$)/.test(params) ? "HOST VALIDATION"
    : /(?:\?|&)stop=primitive(?:&|$)/.test(params) ? "WEBKIT ONLY"
    : /(?:\?|&)diag=full(?:&|$)/.test(params) ? "UNIFIED DEEP TRACE"
    : /(?:\?|&)afterglow=probe(?:&|$)/.test(params) ? "AFTERGLOW PREFLIGHT"
    : /(?:\?|&)afterglow=run(?:&|$)/.test(params) ? "KERNEL EXPERIMENT" : "ENGINE TRACE";
  if (id("active-mode")) id("active-mode").textContent = mode;
  var output = id("out"), previous = "";
  function set(name, value, klass) { var e=id(name);if(e){e.textContent=value;if(klass)e.className=klass;} }
  function last(t, re) { var m, x=null;re.lastIndex=0;while((m=re.exec(t)))x=m;return x; }
  function primitivePassAlready(t) { return /READ-PRIMITIVE-PASS|PRIMITIVE-OK|PRIMITIVE-ONLY\s+PASS/.test(t); }
  function update() {
    if (!output) return;
    var t = output.textContent || "";
    if (t===previous)return;
    previous=t;
    var started=last(t,/ATTEMPT-START\s+\[(\d+)\]\s+([^\n]*)/g);
    var profile=last(t,/CORE-PROFILE\s+\[(\d+)\]\s+([^\n]*)/g);
    var finish=last(t,/CORE-GIVE-UP\s+\[(\d+)\]\s+([^\n]*)/g);
    var passed=last(t,/READ-PRIMITIVE-PASS\s+\[(\d+)\]/g);
    var maxVal=started && /max=(\d+)/.exec(started[2]);
    var attemptSummary=started ? ("Attempt " + started[1] + (maxVal ? "/" + maxVal[1] : "")) : "Attempts: waiting";
    if (passed) attemptSummary = "Primitive reported PASS on attempt " + passed[1];
    if (finish) attemptSummary = "Stopped after " + finish[1] + " attempt(s)";
    if (profile) {
      var pm=/profile=([^\s]+)/.exec(profile[2]), slots=/slots=(\d+)/.exec(profile[2]);
      var estimated=/estimated_bytes=(\d+)/.exec(profile[2]);
      attemptSummary += " · " + (pm ? pm[1] : "profile unknown") +
        (slots ? (" · carrier " + ((Number(slots[1])*8)/1048576).toFixed(1) + " MiB") : "") +
        (estimated ? (" · est " + (Number(estimated[1])/1048576).toFixed(1) + " MiB") : "");
    }
    set("mochi-attempt", attemptSummary + " · estimates are not RAM readings");
    // Failure precedence: the WebKit result must not stay at "Not reported".
    var coverage=last(t,/MOCHI-COVERAGE-REJECT\s+([^\n]+)/g);
    var addrofFail=last(t,/ADDROF-FAIL\s+([^\n]+)/g);
    var attemptLimit=/CORE-GIVE-UP|JB-THREW/.test(t);
    if (coverage) {
      set("m-primitive", "Coverage rejected", "bad");
      set("mochi-stop", "COVERAGE-REJECT — capacity limit; no growth or retry", "bad");
      set("mochi-boundary", "WebKit address coverage check", "bad");
      set("m-state", "TEST STOPPED SAFELY (JavaScript level)", "bad");
      set("m-afterglow", "NOT ENTERED", "caution-text");
      var n=/needed_bytes=(\d+)/.exec(coverage[1]);
      var a=/available_bytes=(\d+)/.exec(coverage[1]);
      if (n && a) set("mochi-detail", "Candidate requires " + (Number(n[1])/1048576).toFixed(1) +
          " MiB; carrier has " + (Number(a[1])/1048576).toFixed(1) +
          " MiB. No growth attempted.", "caution-text");
    } else if (addrofFail && attemptLimit) {
      set("m-primitive", "Validation failed", "bad");
      set("mochi-stop", "WebKit candidate rejected", "bad");
      set("m-afterglow", "NOT ENTERED", "caution-text");
    }
    var retry=last(t,/MOCHI-BOUNDED-RETRY\s+([^\n]+)/g);
    if (retry && !coverage && !attemptLimit && !primitivePassAlready(t)) {
      set("mochi-detail", "Bounded retry: " + retry[1].replace(/-/g, " ").slice(0,115), "caution-text");
      set("m-primitive", "Retrying safe setup miss", "caution-text");
    }
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
    if (/MOCHI-STOP\s+code=NATIVE-ONLY-PASS/.test(t) && !/NATIVE-RESTORE-ERROR/.test(t)) {
      set("mochi-stop", "Native read-only calls complete; stopped before kernel", "good");
      set("m-afterglow", "NOT ENTERED", "caution-text");
      set("m-state", "NATIVE ONLY — FINISHED", "good");
    } else if(stop) {
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
    if (/HOST-VALIDATION\s+FAIL/.test(t)) set("m-state","HOST VALIDATION FAILED","bad");
    if (/HOST-VALIDATION\s+PASS/.test(t)) set("m-state","Host checks passed; native/kernel not tested","good");
    if (!stop && !/AG-RUN-RETURNED-FAILURE/.test(t) && /MOCHI-STEP\s+03 native-readonly-call pass/.test(t)) set("mochi-stop","Read-only native calls passed; kernel unverified","good");
    if (/MOCHI-IMPORT-FAIL/.test(t)) set("mochi-stop","JavaScript module import failed","bad");
    set("m-final","KERNEL STATUS: NOT INDEPENDENTLY VERIFIED");
  }
  var updateScheduled = false;
  if (window.MutationObserver && output) new MutationObserver(function () {
    if (updateScheduled) return;
    updateScheduled = true;
    window.setTimeout(function () { updateScheduled=false; update(); }, 350);
  }).observe(output,{childList:true,characterData:true,subtree:true});
  window.setInterval(update,1500);
}());
