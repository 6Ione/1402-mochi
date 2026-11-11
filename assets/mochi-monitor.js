// JavaScript | assets/mochi-monitor.js | PS4 WebKit browser | Read-only classification of existing Afterglow console output
(function () {
  "use strict";
  function id(x) { return document.getElementById(x); }
  var params = window.location.search || "";
  var mode = /(?:\?|&)stop=host(?:&|$)/.test(params) ? "HOST VALIDATION" : /(?:\?|&)stop=primitive(?:&|$)/.test(params) ? "WEBKIT ONLY" : /(?:\?|&)afterglow=probe(?:&|$)/.test(params) ? "AFTERGLOW PREFLIGHT" : /(?:\?|&)afterglow=run(?:&|$)/.test(params) ? "KERNEL EXPERIMENT" : "ENGINE TRACE";
  if (id("active-mode")) id("active-mode").textContent = mode;
  var consoleEl = id("out"), lastText = "";
  function update() {
    if (!consoleEl) return;
    var t = consoleEl.textContent || "";
    if (t === lastText) return;
    lastText = t;
    var primitive = id("m-primitive"), gadget = id("m-gadget"), kernel = id("m-afterglow"), state = id("m-state"), final = id("m-final");
    var failed = /(?:AG-RUN-RETURNED-FAILURE|AG-FAIL|exploit failed|PROOF-FAIL)/i.test(t);
    if (primitive && /(?:READ-PRIMITIVE-PASS|PRIMITIVE-OK|PRIMITIVE-ONLY\s+PASS)/i.test(t)) { primitive.textContent = "Reported PASS"; primitive.className = "good"; }
    if (gadget) {
      var m = /gadget-table-fits-module[^\n]*(\d+)\s*\/\s*(\d+)/i.exec(t);
      if (m) { gadget.textContent = m[1] + " / " + m[2] + " signatures"; gadget.className = Number(m[1]) === Number(m[2]) ? "good" : "caution-text"; }
    }
    if (gadget && /HOST-VALIDATION\s+FAIL/i.test(t)) { gadget.textContent = "Host validation failed"; gadget.className = "bad"; }
    if (kernel) {
      if (/AG-RUN-RETURNED-SUCCESS/i.test(t)) { kernel.textContent = "Completion returned · unverified"; kernel.className = "caution-text"; }
      else if (/AG-PREFLIGHT-PASS/i.test(t)) { kernel.textContent = "Preflight reported PASS"; kernel.className = "caution-text"; }
      else if (failed) { kernel.textContent = "Failure reported"; kernel.className = "bad"; }
    }
    if (state && /HOST-VALIDATION\s+FAIL/i.test(t)) { state.textContent = "Host validation failed — inspect console"; state.className = "bad"; }
    else if (state && /HOST-VALIDATION\s+PASS/i.test(t)) { state.textContent = "Host checks passed — no kernel execution"; state.className = "good"; }
    else if (state && failed) { state.textContent = "Failure reported — inspect console"; state.className = "bad"; }
    else if (state && /AG-RUN-RETURNED-SUCCESS/i.test(t)) state.textContent = "Stage returned completion; verify independently";
    else if (state && /PRIMITIVE-ONLY\s+PASS/i.test(t)) state.textContent = "WebKit-only mode complete";
    if (final) final.textContent = "NO INDEPENDENT KERNEL PROOF";
  }
  if (window.MutationObserver && consoleEl) {
    new MutationObserver(update).observe(consoleEl, {childList:true,characterData:true,subtree:true});
  }
  window.setInterval(update, 1500);
}());
