"""
Mock AI arbiter.

In a real system this would call an LLM API.  Here it just simulates analysis
with a short sleep, then approves if any byte in the work_hash differs from
the requirements_hash (i.e., some actual work was submitted).
"""

import hashlib
import time


def hash_text(text: str) -> bytes:
    """Return SHA-256 of a UTF-8 string as 32 bytes."""
    return hashlib.sha256(text.encode()).digest()


def analyze(requirements_hash: bytes, work_hash: bytes) -> bool:
    """
    Mock AI analysis.

    Returns True (approve) if the work hash is non-zero and different from
    the requirements hash — meaning the freelancer submitted something new.
    """
    print("\n[AI] Receiving requirements hash:", requirements_hash.hex()[:16] + "...")
    print("[AI] Receiving work hash:         ", work_hash.hex()[:16] + "...")

    print("[AI] Analyzing requirements vs. submitted work", end="", flush=True)
    for _ in range(5):
        time.sleep(0.4)
        print(".", end="", flush=True)
    print()

    empty = bytes(32)
    if work_hash == empty:
        print("[AI] REJECTED — no work was submitted (empty hash).")
        return False

    if work_hash == requirements_hash:
        print("[AI] REJECTED — work hash equals requirements hash (nothing changed).")
        return False

    print("[AI] APPROVED — work looks good!")
    return True


if __name__ == "__main__":
    req = hash_text("Build a REST API with authentication")
    work = hash_text("Delivered: REST API with JWT auth, tests included")
    result = analyze(req, work)
    print("AI verdict:", "APPROVE" if result else "REJECT")
