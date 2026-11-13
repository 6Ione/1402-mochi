/* Stage10: reads actual DOM output only; no native syscall or exploit code */
(function(){"use strict";
function el(id){return document.getElementById(id)}
function val(id,t){var n=el(id);if(n)n.textContent=t}
var ua=navigator.userAgent||"";var fw=/PlayStation\s*4\/(\d+\.\d+)/i.exec(ua);val("s10-fw",fw?fw[1]+" (reported by UA)":"Unknown");
var out=el("out"),prev="";
function last(text,re){var m,r=null;re.lastIndex=0;while((m=re.exec(text)))r=m;return r}
function update(){if(!out)return;var t=out.textContent||"";if(t===prev)return;prev=t;
 var ids=last(t,/MOCHI-PRIV\s+pid=([^\n]+)/g),verdict=last(t,/MOCHI-PRIV\s+VERDICT=([^\s]+)/g),restore=last(t,/MOCHI-RESTORE\s+function-pointer=([^\s]+)/g),term=last(t,/MOCHI-TERMINAL\s+mode=priv-evidence\s+result=([^\s]+)/g);
 if(ids){var uid=/\buid=(-?\d+)/.exec(ids[1]),euid=/\beuid=(-?\d+)/.exec(ids[1]);val("s10-identity","UID "+(uid?uid[1]:"?")+" · EUID "+(euid?euid[1]:"?"))}
 if(restore)val("s10-restore",restore[1]);
 if(verdict)val("s10-verdict",verdict[1]);
 if(term){val("s10-run-status","COMPLETED · "+term[1]);val("s10-boundary","Kernel UAF: NOT TESTED · kernel R/W: NOT TESTED · kernel execution: NOT TESTED")}
 if(/MOCHI-IMPORT-FAIL/.test(t))val("s10-run-status","MODULE LOAD FAILED");
}
if(window.MutationObserver&&out){new MutationObserver(update).observe(out,{childList:true,subtree:true,characterData:true})}
window.setInterval(update,1000);
}());
