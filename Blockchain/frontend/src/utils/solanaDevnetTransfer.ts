import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const RPC = import.meta.env.VITE_SOLANA_RPC ?? 'https://api.devnet.solana.com';

function pubkeyFromPhantom(pk: unknown): PublicKey {
  if (pk != null && typeof pk === 'object' && 'toBase58' in pk && typeof (pk as { toBase58: () => string }).toBase58 === 'function') {
    return new PublicKey((pk as { toBase58: () => string }).toBase58());
  }
  if (typeof pk === 'string' && pk.length > 0) return new PublicKey(pk);
  throw new Error('Wallet public key is not available.');
}

export type PhantomSigner = {
  publicKey?: unknown;
  signAndSendTransaction: (
    tx: Transaction,
    opts?: { skipPreflight?: boolean }
  ) => Promise<{ signature: string }>;
};

export function devnetExplorerTx(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

/** Send SOL on devnet via Phantom's signAndSendTransaction. Phantom must be on Devnet. */
export async function sendSolDevnet(
  wallet: PhantomSigner,
  toAddress: string,
  amountSol: number
): Promise<string> {
  if (amountSol <= 0) throw new Error('Amount must be greater than zero.');

  const connection = new Connection(RPC, 'confirmed');
  const fromPubkey = pubkeyFromPhantom(wallet.publicKey);
  const toPubkey = new PublicKey(toAddress.trim());
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports,
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;

  const { signature } = await wallet.signAndSendTransaction(tx, { skipPreflight: false });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );
  return signature;
}
