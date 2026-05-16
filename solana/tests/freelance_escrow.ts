import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import type { FreelanceEscrow } from "../target/types/freelance_escrow";

describe("freelance_escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.FreelanceEscrow as Program<FreelanceEscrow>;

  const business = provider.wallet as anchor.Wallet;
  const freelancer = Keypair.generate();
  const arbiter = Keypair.generate();

  const projectId = new BN(42);

  it("mutual approval releases escrow to freelancer", async () => {
    await airdrop(provider.connection, freelancer.publicKey, 2 * LAMPORTS_PER_SOL);
    await airdrop(provider.connection, arbiter.publicKey, LAMPORTS_PER_SOL);

    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        business.publicKey.toBuffer(),
        freelancer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    );

    const deadline = new BN(Math.floor(Date.now() / 1000) + 3600);
    const amount = new BN(LAMPORTS_PER_SOL / 2);

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

    await program.methods
      .deposit()
      .accounts({
        business: business.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const reqHash = Buffer.alloc(32, 7);

    await program.methods
      .setRequirementsHash(Array.from(reqHash))
      .accounts({
        business: business.publicKey,
        escrow: escrowPda,
      })
      .rpc();

    await program.methods
      .freelancerAckRequirements(Array.from(reqHash))
      .accounts({
        freelancer: freelancer.publicKey,
        escrow: escrowPda,
      })
      .signers([freelancer])
      .rpc();

    await program.methods
      .approveFreelancer()
      .accounts({
        freelancer: freelancer.publicKey,
        escrow: escrowPda,
      })
      .signers([freelancer])
      .rpc();

    await program.methods
      .approveBusiness()
      .accounts({
        business: business.publicKey,
        escrow: escrowPda,
      })
      .rpc();

    const before = await provider.connection.getBalance(freelancer.publicKey);

    await program.methods
      .releaseMutual()
      .accounts({
        freelancer: freelancer.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    const after = await provider.connection.getBalance(freelancer.publicKey);
    expect(after).to.be.greaterThan(before);

    const escrowAccount = await program.account.escrowState.fetch(escrowPda);
    expect(escrowAccount.released).to.equal(true);
  });
});

async function airdrop(connection: anchor.web3.Connection, pk: PublicKey, lamports: number) {
  const sig = await connection.requestAirdrop(pk, lamports);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
}
