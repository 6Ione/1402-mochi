// JavaScript | mochi-fresh-retry.js | PS4 WebKit | explicit one-reload userland-only diagnostic
(function () {
  "use strict";
  var query = window.location.search || "";
  if (!/(?:\?|&)fresh=1(?:&|$)/.test(query) ||
      !/(?:\?|&)stop=(?:host|primitive)(?:&|$)/.test(query)) return;
  var countKey = "mochi0411-fresh-reloads";
  var traceKey = "mochi0411-last-trace";
  var count = 0, storageOK = true;
  try {
    count = Number(sessionStorage.getItem(countKey) || 0);
    if (!isFinite(count) || count < 0) count = 0;
  } catch (e) { storageOK = false; }
  var report = document.getElementById("mochi-detail");
  var box = document.getElementById("mochi-refresh");
  var message = document.getElementById("mochi-refresh-message");
  var cancel = document.getElementById("mochi-refresh-cancel");
  var output = document.getElementById("out");
  if (!storageOK) {
    if (report) report.textContent = "Fresh restart disabled: sessionStorage unavailable. Default in-page attempts only.";
    return;
  }
  if (report) report.textContent = count === 0
      ? "Opt-in: up to 3 in-page attempts; one fresh-page restart available if test stops."
      : "Fresh restart already used. No further automatic reloads.";
  if (count > 0) {
    try {
      var old = sessionStorage.getItem(traceKey);
      if (old && output) {
        var note = document.createElement("div");
        note.style.cssText = "border:1px solid #b9a6dd;padding:10px;margin:6px 0;color:#e9e0ff;white-space:pre-wrap";
        note.textContent = "PREVIOUS PAGE — LAST MARKERS (not live results)\n" + old;
        output.parentNode.insertBefore(note,output);
      }
    } catch(e) {}
    return;
  }
  var started = false, cancelled = false, finished = false, t0 = 0, timer = null;
  if (cancel) cancel.onclick = function () {
    cancelled = true;
    if (timer !== null) clearInterval(timer);
    if (box) box.style.display = "none";
    if (report) report.textContent = "Fresh-page restart cancelled by user; no auto reload.";
  };
  function readLastRelevant(t) {
    var lines = t.split("\n").filter(function (line) {
      return /MOCHI-BOUNDED-RETRY|MOCHI-COVERAGE-REJECT|CORE-GIVE-UP|MOCHI-STOP|ZERO-HEADER-MISS|ADDROF-FAIL|JB-THREW/.test(line);
    });
    return lines.slice(-10).join("\n").slice(-2000);
  }
  function terminalFailure(t) {
    // Only reload a completed, failed WebKit primitive, never native or kernel execution.
    if (/READ-PRIMITIVE-PASS|PRIMITIVE-OK|HOST-VALIDATION\s+PASS/.test(t)) return false;
    if (/MOCHI-IMPORT-FAIL|MOCHI-STOP\s+code=IMPORT-FAIL/.test(t)) return false;
    // Do not reload on JavaScript unknown exceptions, native bridge problems or memory errors.
    if (/RangeError|out of memory|memory error|allocation failed/i.test(t)) return false;
    if (/CORE-GIVE-UP\s+\[\d+\]\s+reason=COVERAGE-REJECT/.test(t) ||
        /MOCHI-COVERAGE-REJECT/.test(t)) return false;
    return /CORE-GIVE-UP\s+\[\d+\]\s+reason=(?:attempt-ceiling|RETRY-SAFETY-GATE)/.test(t);
  }
  function poll() {
    if (cancelled || started || !output) return;
    var t = output.textContent || "";
    if (!terminalFailure(t)) return;
    // The JS engine can fail after the stop line; delay to let the final status render.
    started = true;
    t0 = Date.now();
    if (box) box.style.display = "block";
    timer = setInterval(function () {
      if (cancelled || finished) { clearInterval(timer); return; }
      var remaining = Math.ceil((8000 - (Date.now() - t0)) / 1000);
      if (message) message.textContent = "One fresh-page restart in " + Math.max(0,remaining) +
        " s; cancel if the PS4 displays a memory warning.";
      if (remaining > 0) return;
      clearInterval(timer);
      finished = true;
      try {
        sessionStorage.setItem(countKey, "1");
        sessionStorage.setItem(traceKey, readLastRelevant(output.textContent || ""));
      } catch (e) {
        if (report) report.textContent = "Fresh restart disabled: could not persist page count.";
        if (box) box.style.display = "none";
        return;
      }
      window.location.reload();
    }, 500);
  }
  setInterval(poll, 1000);
}());
