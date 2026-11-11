// JavaScript | assets/mochi-launch.js | PS4 WebKit browser | Mochi same-folder launch navigation
(function () {
  "use strict";
  var detected = document.getElementById("detected");
  var firmware = document.getElementById("fw-chip");
  var ua = navigator.userAgent || "";
  var match = /PlayStation 4[^)]*?([0-9]{2}\.[0-9]{2})/i.exec(ua);
  var number = match ? match[1] : null;
  if (detected) detected.textContent = number ? "Console browser reports firmware " + number + " (user agent only)" : "PS4 firmware not detected in user agent";
  if (firmware) firmware.textContent = number ? "FW " + number + " · REPORTED" : "FW 14.02 · TARGET";
  // Use the tested legacy go.html query for the kernel entry, preserving mode and g parameters.
  var query = {
    primitive: "?v=1402s&log=1&stop=primitive&attempts=8",
    host: "?v=1402h&log=1&stop=host&attempts=8",
    probe: "?v=1402s&log=1&afterglow=probe&mode=kpstep&g=drain:16&g=drainsz:0x4000",
    kernel: "?v=1402s&log=1&afterglow=run&mode=kpstep&g=drain:16&g=drainsz:0x4000"
  };
  var buttons = document.querySelectorAll("button[data-mode]");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].onclick = function () {
      var mode = this.getAttribute("data-mode");
      if (!Object.prototype.hasOwnProperty.call(query, mode)) return;
      // Direct same-folder navigation from index.html satisfies jb-g.js referrer guard.
      window.location.assign("./launch.html" + query[mode]);
    };
  }
}());
