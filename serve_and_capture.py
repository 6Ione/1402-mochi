# Python | serve_and_capture.py | CPython 3.10+ | LAN HTTP server and on-disk Mochi stage log collector
import argparse
import json
import re
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
LOCK = Lock()
LOGDIR = ROOT / "mochi_logs"
LOGDIR.mkdir(exist_ok=True)

class MochiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def do_GET(self):
        request_path = urlsplit(self.path).path
        if request_path.startswith("/mochi_logs") or request_path.startswith("/__pycache__") or request_path.endswith(".py"):
            self.send_error(403, "Not publicly served")
            return
        if request_path == "/__mochi_health":
            data = b'{"service":"mochi-capture-v1"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def do_POST(self):
        if urlsplit(self.path).path != "/__mochi_log":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 300000:
                self.send_error(413, "Bad log size")
                return
            msg = json.loads(self.rfile.read(length).decode("utf-8"))
            run_id = str(msg.get("run_id", ""))
            if not re.fullmatch(r"MOCHI-[a-z0-9-]{1,80}", run_id):
                self.send_error(400, "Bad run ID")
                return
            rows = msg.get("records")
            if not isinstance(rows, list) or len(rows) > 50:
                self.send_error(400, "Invalid records")
                return
            path = LOGDIR / (run_id + ".ndjson")
            now = datetime.now(timezone.utc).isoformat()
            safe = []
            for row in rows:
                if not isinstance(row, dict):
                    continue
                safe.append(json.dumps({"received_utc":now,
                    "tag":str(row.get("tag", ""))[:100],
                    "detail":str(row.get("detail", ""))[:2048],
                    "browser_timestamp":row.get("t", None)}, ensure_ascii=False))
            with LOCK:
                with path.open("a", encoding="utf-8") as f:
                    for item in safe:
                        f.write(item + "\n")
            print(f"[{run_id}] recorded {len(safe)} events -> {path.name}", flush=True)
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
        except (ValueError, UnicodeError, OSError, TypeError) as e:
            self.send_error(400, type(e).__name__)

if __name__ == "__main__":
    cli = argparse.ArgumentParser(description="Serve Mochi and capture runtime logs from your PS4 on the same LAN")
    cli.add_argument("--host", default="0.0.0.0")
    cli.add_argument("--port", default=8787, type=int)
    args = cli.parse_args()
    print("Mochi LAN server started. On PS4 open: http://<PC-LAN-IP>:%d/" % args.port, flush=True)
    print("Logs written to:", LOGDIR, flush=True)
    with ThreadingHTTPServer((args.host, args.port), MochiHandler) as server:
        server.serve_forever()
