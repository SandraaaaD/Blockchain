/**
 * Run full escrow flow on devnet/mainnet (after `anchor build` + deploy).
 * Run from the `solana/` folder.
 *
 * Env:
 *   RPC_URL              — default https://api.devnet.solana.com
 *   BUSINESS_KEYPAIR     — JSON keypair file for business (default: ~/.config/solana/id.json)
 *   FREELANCER_KEYPAIR   — JSON keypair file for freelancer (required)
 *   ARBITER_KEYPAIR      — optional; used as mock_ai_arbiter (else random keypair, OK for happy path)
 *   REQUIREMENTS_FILE    — optional path to file; SHA-256 stored on-chain (else dummy hash)
 *   AMOUNT_LAMPORTS      — default 0.01 SOL
 *   PROJECT_ID           — default 1 (increment if you reuse same pair on same program)
 */

import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

const ROOT = process.cwd();

async function main() {
  const rpc = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const home = process.env.USERPROFILE ?? process.env.HOME ?? ".";
  const businessPath =
    process.env.BUSINESS_KEYPAIR ?? path.join(home, ".config", "solana", "id.json");
  const freelancerPath = process.env.FREELANCER_KEYPAIR;
  if (!freelancerPath) {
    throw new Error("Set FREELANCER_KEYPAIR to a JSON keypair file (create with solana-keygen new).");
  }

  const connection = new Connection(rpc, "confirmed");
  const business = loadKeypair(businessPath);
  const freelancer = loadKeypair(freelancerPath);

  console.log("RPC:", rpc);
  console.log("Business:", business.publicKey.toBase58());
  console.log("Freelancer:", freelancer.publicKey.toBase58());

  if (business.publicKey.equals(freelancer.publicKey)) {
    throw new Error("Business and freelancer must be different wallets.");
  }

  let arbiter: Keypair;
  if (process.env.ARBITER_KEYPAIR) {
    arbiter = loadKeypair(process.env.ARBITER_KEYPAIR);
  } else {
    arbiter = Keypair.generate();
    console.log(
      "Arbiter (mock AI signer, unused on happy path):",
      arbiter.publicKey.toBase58(),
    );
  }

  const wallet = new anchor.Wallet(business);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idlPath = path.join(ROOT, "target", "idl", "freelance_escrow.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`Missing ${idlPath} — run \"anchor build\" in solana/ first.`);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8")) as anchor.Idl;
  const program = new Program(idl, provider);

  const projectId = new BN(process.env.PROJECT_ID ?? "1");
  const amount = new BN(process.env.AMOUNT_LAMPORTS ?? Math.floor(0.01 * LAMPORTS_PER_SOL));
  const deadline = new BN(Math.floor(Date.now() / 1000) + 7 * 24 * 3600);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      business.publicKey.toBuffer(),
      freelancer.publicKey.toBuffer(),
      projectId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId,
  );

  console.log("Program:", program.programId.toBase58());
  console.log("Escrow PDA:", escrowPda.toBase58());

  let reqHash = Buffer.alloc(32, 1);
  const reqFile = process.env.REQUIREMENTS_FILE;
  if (reqFile && fs.existsSync(reqFile)) {
    reqHash = crypto.createHash("sha256").update(fs.readFileSync(reqFile)).digest();
    console.log("Requirements SHA-256:", reqHash.toString("hex"));
  } else {
    console.log("Using placeholder requirements hash (set REQUIREMENTS_FILE for real file).");
  }

  console.log("\n1) create_escrow");
  await program.methods
    .createEscrow({
      projectId,
      amountExpectedLamports: amount,
      deadlineUnix: deadline,
      mockAiArbiter: arbiter.publicKey,
    })
    .accounts({
      business: business.publicKey,
      freelancer: freelancer.publicKey,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("2) deposit (business sends lamports to escrow)");
  await program.methods
    .deposit()
    .accounts({
      business: business.publicKey,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("3) set_requirements_hash (business)");
  await program.methods
    .setRequirementsHash(Array.from(reqHash))
    .accounts({
      business: business.publicKey,
      escrow: escrowPda,
    })
    .rpc();

  console.log("4) freelancer_ack_requirements");
  await program.methods
    .freelancerAckRequirements(Array.from(reqHash))
    .accounts({
      freelancer: freelancer.publicKey,
      escrow: escrowPda,
    })
    .signers([freelancer])
    .rpc();

  console.log("5) approve_freelancer");
  await program.methods
    .approveFreelancer()
    .accounts({
      freelancer: freelancer.publicKey,
      escrow: escrowPda,
    })
    .signers([freelancer])
    .rpc();

  console.log("6) approve_business");
  await program.methods
    .approveBusiness()
    .accounts({
      business: business.publicKey,
      escrow: escrowPda,
    })
    .rpc();

  const before = await connection.getBalance(freelancer.publicKey);
  console.log("7) release_mutual → pay freelancer (minus escrow rent reserve)");
  await program.methods
    .releaseMutual()
    .accounts({
      freelancer: freelancer.publicKey,
      escrow: escrowPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc();

  const after = await connection.getBalance(freelancer.publicKey);
  console.log("\nDone. Freelancer balance delta (lamports):", after - before);
  console.log("(Expect roughly +", amount.toString(), " minus fees / rent headroom.)");

  const escrowAccount = await program.account.escrowState.fetch(escrowPda);
  console.log("Escrow released on-chain:", escrowAccount.released);
}

function loadKeypair(file: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
