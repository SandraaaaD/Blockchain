"""
Convert a BIP39 mnemonic to a Solana keypair JSON file (64-byte secret format).

Usage (PowerShell — words stay on YOUR machine only):
  cd solana
  pip install bip-utils solders
  $env:SOLANA_MNEMONIC="word1 word2 ... word12"
  $env:OUT_PATH="$env:USERPROFILE\solana-keys\my-wallet.json"
  python scripts/mnemonic_to_keypair.py

Optional:
  $env:ACCOUNT_INDEX="0"    # first Phantom-style account is usually 0

IMPORTANT:
- Do NOT paste mnemonics into chat or commit JSON keypairs to git.
- Phantom may still NOT match this derivation for some wallets — verify pubkey:
    solana-keygen pubkey %USERPROFILE%\\solana-keys\\my-wallet.json
  If it doesn't match Phantom, use Phantom -> Export private key -> base58 JSON conversion instead.
"""

from __future__ import annotations

import json
import os
import sys

from bip_utils import (
    Bip39Languages,
    Bip39MnemonicValidator,
    Bip39SeedGenerator,
    Bip44,
    Bip44Coins,
    Bip44Changes,
)
from solders.keypair import Keypair


def main() -> None:
    mnemonic = os.environ.get("SOLANA_MNEMONIC", "").strip()
    if not mnemonic:
        print(
            "Set SOLANA_MNEMONIC to twelve words (locally). Example:\n"
            '  $env:SOLANA_MNEMONIC="word1 word2 ... word12"',
            file=sys.stderr,
        )
        sys.exit(1)

    out_path = os.environ.get(
        "OUT_PATH",
        os.path.join(os.path.expanduser("~"), "solana-keys", "from-mnemonic.json"),
    )
    account_index = int(os.environ.get("ACCOUNT_INDEX", "0"))

    # bip_utils 2.10+: validator takes language; mnemonic goes to Validate(...)
    Bip39MnemonicValidator(Bip39Languages.ENGLISH).Validate(mnemonic)
    seed_bytes = Bip39SeedGenerator(mnemonic, Bip39Languages.ENGLISH).Generate()

    ctx = (
        Bip44.FromSeed(seed_bytes, Bip44Coins.SOLANA)
        .Purpose()
        .Coin()
        .Account(account_index)
        .Change(Bip44Changes.CHAIN_EXT)
        .AddressIndex(0)
    )

    seed32 = ctx.PrivateKey().Raw().ToBytes()
    if len(seed32) != 32:
        print(f"Unexpected seed length {len(seed32)}", file=sys.stderr)
        sys.exit(1)

    kp = Keypair.from_seed(seed32)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    out_path = os.path.abspath(out_path)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(list(bytes(kp)), f)

    print("Wrote:", out_path)
    print("Pubkey:", kp.pubkey())


if __name__ == "__main__":
    main()
