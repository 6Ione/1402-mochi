// JavaScript | assets/mochi-capture.js | PS4 WebKit browser | Optional LAN diagnostics buffer (HTTP same-origin only)
(function () {
  "use strict";
  var state = document.getElementById("mochi-capture-status");
  var enabled = false;
  var collectPending = location.protocol === "http:";
  var pending = [];
  var count = 0;
  var runId = "MOCHI-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 65536).toString(16);
  var active = false;
  function status(s) { if (state) state.textContent = s; }
  function batch() {
    if (!enabled || active || !pending.length) return;
    active = true;
    var current = pending.splice(0, 50);
    var data = JSON.stringify({run_id:runId, records:current, ua:navigator.userAgent || ""});
    fetch("./__mochi_log", {method:"POST", headers:{"Content-Type":"text/plain"}, body:data, cache:"no-store"}).then(function (r) {
      if (!r.ok) throw Error("HTTP " + r.status);
      count += current.length;
      status("PC CAPTURE ON · " + count + " records");
    }).catch(function () {
      // Keep already recorded lines until the receiver recovers, bounded to protect the console.
      pending = current.concat(pending).slice(-1000);
      status("Collector unreachable · console still records");
    }).then(function(){active=false;});
  }
  window.MochiCapture = {
    push: function (tag, detail) {
      if (!collectPending) return;
      pending.push({t:Date.now(),tag:String(tag),detail:String(detail).slice(0,2048)});
      if (pending.length > 1000) pending.splice(0, pending.length - 1000);
    },
    id:runId
  };
  // GitHub Pages remains display-only. To capture without files or screenshots,
  // run serve_and_capture.py on a PC and open that PC's HTTP URL on the PS4.
  if (location.protocol !== "http:") { status("GitHub Pages · display-only"); return; }
  status("Checking same-origin PC collector...");
  fetch("./__mochi_health", {cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(j){
    if (!j || j.service !== "mochi-capture-v1") {status("Display-only · no collector");return;}
    enabled = true;
    status("PC CAPTURE ON · " + runId);
    window.setInterval(batch, 700);
  }).catch(function () {status("Display-only · no collector");});
}());
