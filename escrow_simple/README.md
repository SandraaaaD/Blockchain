# Simple Freelance Escrow

A minimal Solana smart contract + mock-AI demo.

```
Business  ──deposits──►  Escrow PDA  ──releases──►  Freelancer
                                ▲
                         Mock AI approves
```

---

## Project layout

```
escrow_simple/
├── contract/               Rust Anchor program (build with cargo build-sbf)
│   └── programs/escrow/
│       └── src/lib.rs      5 instructions: create, deposit, submitWork, release, refund
├── idl/escrow.json         Hand-written IDL (no anchor build IDL step needed)
├── keys/                   Put your keypair JSONs here (git-ignored)
└── client/
    ├── requirements.txt
    ├── mock_ai.py          Standalone mock AI analysis function
    └── run_demo.py         Full end-to-end demo script
```

---

## Step 1 — Build the contract (in WSL / Ubuntu)

```bash
# Inside WSL, navigate to the contract folder
cd /mnt/c/Users/vladi/PycharmProjects/blockchain/escrow_simple/contract

# First-time only: install Solana build tools
cargo install --git https://github.com/solana-labs/solana --tag v1.18.18 cargo-build-sbf 2>/dev/null || true

# Build (compiles for the SBF target, no IDL step)
cargo build-sbf

# Output: target/deploy/escrow.so  ← this is the program binary
```

---

## Step 2 — Generate a program keypair and get its address

```bash
# In WSL
solana-keygen new -o keypair.json
PROGRAM_ID=$(solana address -k keypair.json)
echo "Program ID: $PROGRAM_ID"
```

Open `contract/programs/escrow/src/lib.rs` and replace:
```rust
declare_id!("11111111111111111111111111111111");
```
with:
```rust
declare_id!("<your PROGRAM_ID>");
```

Then rebuild:
```bash
cargo build-sbf
```

---

## Step 3 — Create two keypairs (business & freelancer)

```bash
solana-keygen new -o /mnt/c/Users/vladi/PycharmProjects/blockchain/escrow_simple/keys/business.json
solana-keygen new -o /mnt/c/Users/vladi/PycharmProjects/blockchain/escrow_simple/keys/freelancer.json
```

Airdrop devnet SOL to the business account:
```bash
solana airdrop 1 $(solana address -k keys/business.json) --url devnet
solana airdrop 1 $(solana address -k keys/freelancer.json) --url devnet
```

---

## Step 4 — Deploy the program

```bash
solana program deploy target/deploy/escrow.so \
  --keypair keypair.json \
  --url devnet
```

Copy the "Program Id" printed in the output.

---

## Step 5 — Run the Python demo (in Windows PowerShell or CMD)

```powershell
cd C:\Users\vladi\PycharmProjects\blockchain\escrow_simple\client

pip install -r requirements.txt

python run_demo.py `
  --program <PROGRAM_ID> `
  --business ..\keys\business.json `
  --freelancer ..\keys\freelancer.json
```

### What you should see

```
============================================================
  FREELANCE ESCROW DEMO  (Solana Devnet)
============================================================
  Business:   <pubkey>
  Freelancer: <pubkey>
  ...

[1/4] Business creates escrow...
      ✓ Escrow created on-chain
[2/4] Business deposits 0.01 SOL...
      ✓ Funds locked in escrow PDA
[3/4] Freelancer submits work hash...
      ✓ Work hash stored on-chain

[AI] Analyzing requirements vs. submitted work.....
[AI] APPROVED — work looks good!

[4/4] Business releases funds (acting on AI verdict)...
      ✓ Funds transferred to freelancer!

  Freelancer earned: 0.0100 SOL
  Contract released. All done!
```

---

## How the mock AI works

`client/mock_ai.py` → `analyze(requirements_hash, work_hash) -> bool`

It simply checks:
- Is the work hash non-empty?
- Is it different from the requirements hash?

If yes → **APPROVE**.  Replace the body of `analyze()` with a real LLM call whenever you're ready.

---

## .gitignore

Add `escrow_simple/keys/` to your `.gitignore` so you never commit private keys.
