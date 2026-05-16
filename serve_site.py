"""Serve the static smart-contracts site from ./web (stdlib only)."""

import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent / "web"
    root.mkdir(exist_ok=True)
    os.chdir(root)
    server = HTTPServer(("127.0.0.1", 8765), SimpleHTTPRequestHandler)
    print(f"Serving http://127.0.0.1:8765/  (folder: {root})")
    print("Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    main()
