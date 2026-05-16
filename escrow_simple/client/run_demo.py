"""
Full escrow demo.

Runs the complete flow on Solana devnet:
  1. Business creates escrow and deposits 0.01 SOL
  2. Freelancer submits work hash
  3. Mock AI analyzes requirements vs. work
  4. If approved → business releases funds to freelancer
  5. Prints balances before and after

Usage:
    python run_demo.py --program <PROGRAM_ID> \
                       --business <path/to/business.json> \
                       --freelancer <path/to/freelancer.json>

Example:
    python run_demo.py --program ABC...XYZ \
                       --business ../keys/business.json \
                       --freelancer ../keys/freelancer.json
"""

import argparse
import asyncio
import hashlib
import json
from pathlib import Path

from anchorpy import Program, Provider, Wallet, Idl
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import ID as SYS_PROGRAM_ID

from mock_ai import analyze, hash_text

IDL_PATH = Path(__file__).parent.parent / "idl" / "escrow.json"
LAMPORTS_PER_SOL = 1_000_000_000
DEPOSIT_SOL = 0.01


def load_keypair(path: str) -> Keypair:
    data = json.loads(Path(path).read_text())
    return Keypair.from_bytes(bytes(data))


def find_escrow_pda(program_id: Pubkey, business: Pubkey) -> tuple[Pubkey, int]:
    return Pubkey.find_program_address(
        [b"escrow", bytes(business)],
        program_id,
    )


async def get_sol_balance(client: AsyncClient, pubkey: Pubkey) -> float:
    resp = await client.get_balance(pubkey, commitment=Confirmed)
    return resp.value / LAMPORTS_PER_SOL


async def main(program_id_str: str, business_path: str, freelancer_path: str):
    program_id = Pubkey.from_string(program_id_str)
    business_kp = load_keypair(business_path)
    freelancer_kp = load_keypair(freelancer_path)

    idl = Idl.from_json(IDL_PATH.read_text())
    client = AsyncClient("https://api.devnet.solana.com", commitment=Confirmed)

    # ── Providers (one per signer) ──────────────────────────────────────────
    business_provider  = Provider(client, Wallet(business_kp))
    freelancer_provider = Provider(client, Wallet(freelancer_kp))

    program_b = Program(idl, program_id, business_provider)
    program_f = Program(idl, program_id, freelancer_provider)

    escrow_pda, _ = find_escrow_pda(program_id, business_kp.pubkey())

    # ── Requirements & work hashes ─────────────────────────────────────────
    requirements_text = "Build a REST API: user login, CRUD for todos, 80%+ test coverage"
    work_text         = "Delivered REST API with JWT login, full CRUD, 92% test coverage"

    req_hash  = list(hash_text(requirements_text))   # list[int] for anchorpy
    work_hash = list(hash_text(work_text))

    print("=" * 60)
    print("  FREELANCE ESCROW DEMO  (Solana Devnet)")
    print("=" * 60)
    print(f"  Business:   {business_kp.pubkey()}")
    print(f"  Freelancer: {freelancer_kp.pubkey()}")
    print(f"  Program:    {program_id}")
    print(f"  Escrow PDA: {escrow_pda}")
    print()

    bal_b = await get_sol_balance(client, business_kp.pubkey())
    bal_f = await get_sol_balance(client, freelancer_kp.pubkey())
    print(f"  Balances before: business={bal_b:.4f} SOL  freelancer={bal_f:.4f} SOL")
    print()

    # ── Step 1: Create escrow ───────────────────────────────────────────────
    print("[1/4] Business creates escrow...")
    await program_b.rpc["create"](
        freelancer_kp.pubkey(),
        req_hash,
        ctx=program_b.type["accounts"]["Create"](
            business=business_kp.pubkey(),
            escrow=escrow_pda,
            system_program=SYS_PROGRAM_ID,
        ),
    )
    print("      ✓ Escrow created on-chain")

    # ── Step 2: Deposit ─────────────────────────────────────────────────────
    deposit_lamports = int(DEPOSIT_SOL * LAMPORTS_PER_SOL)
    print(f"[2/4] Business deposits {DEPOSIT_SOL} SOL...")
    await program_b.rpc["deposit"](
        deposit_lamports,
        ctx=program_b.type["accounts"]["Deposit"](
            business=business_kp.pubkey(),
            escrow=escrow_pda,
            system_program=SYS_PROGRAM_ID,
        ),
    )
    print("      ✓ Funds locked in escrow PDA")

    # ── Step 3: Freelancer submits work ────────────────────────────────────
    print("[3/4] Freelancer submits work hash...")
    await program_f.rpc["submitWork"](
        work_hash,
        ctx=program_f.type["accounts"]["SubmitWork"](
            freelancer=freelancer_kp.pubkey(),
            escrow=escrow_pda,
        ),
    )
    print("      ✓ Work hash stored on-chain")

    # ── Mock AI analysis ───────────────────────────────────────────────────
    print()
    approved = analyze(bytes(req_hash), bytes(work_hash))
    print()

    if not approved:
        print("[!] AI rejected the work.  No funds released.  Demo ends here.")
        print("    (In a real system you'd let the parties dispute or re-submit.)")
        await client.close()
        return

    # ── Step 4: Business releases funds ────────────────────────────────────
    print("[4/4] Business releases funds (acting on AI verdict)...")
    await program_b.rpc["release"](
        ctx=program_b.type["accounts"]["Release"](
            business=business_kp.pubkey(),
            freelancer=freelancer_kp.pubkey(),
            escrow=escrow_pda,
        ),
    )
    print("      ✓ Funds transferred to freelancer!")

    # ── Final balances ─────────────────────────────────────────────────────
    print()
    bal_b2 = await get_sol_balance(client, business_kp.pubkey())
    bal_f2 = await get_sol_balance(client, freelancer_kp.pubkey())
    print(f"  Balances after:  business={bal_b2:.4f} SOL  freelancer={bal_f2:.4f} SOL")
    print(f"  Freelancer earned: {bal_f2 - bal_f:.4f} SOL")
    print()
    print("  Contract released. All done!")
    await client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--program",    required=True, help="Deployed program ID")
    parser.add_argument("--business",   required=True, help="Path to business keypair JSON")
    parser.add_argument("--freelancer", required=True, help="Path to freelancer keypair JSON")
    args = parser.parse_args()

    asyncio.run(main(args.program, args.business, args.freelancer))
