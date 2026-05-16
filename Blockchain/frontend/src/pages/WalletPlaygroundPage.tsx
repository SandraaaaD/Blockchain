import { useState } from 'react';
import Layout from '../components/Layout';
import { getPhantomWallet, usePhantom } from '../context/PhantomContext';
import { devnetExplorerTx, sendSolDevnet } from '../utils/solanaDevnetTransfer';
import toast from 'react-hot-toast';
import { ExternalLink, Send } from 'lucide-react';

const RPC =
  (import.meta.env.VITE_SOLANA_RPC as string | undefined) ?? 'https://api.devnet.solana.com';

export default function WalletPlaygroundPage() {
  const { address, connect, connecting } = usePhantom();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [sending, setSending] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);

  const handleSend = async () => {
    const w = getPhantomWallet();
    if (!w?.signAndSendTransaction) {
      toast.error('Phantom signAndSendTransaction is not available. Update Phantom.');
      return;
    }
    if (!address) {
      toast.error('Connect Phantom first (header → Connect).');
      return;
    }
    setSending(true);
    setLastSig(null);
    try {
      const sig = await sendSolDevnet(
        { publicKey: w.publicKey, signAndSendTransaction: w.signAndSendTransaction.bind(w) },
        recipient,
        Number(amount)
      );
      setLastSig(sig);
      toast.success('Transaction confirmed on devnet.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Send failed';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg space-y-6 rounded-2xl border border-escrow-sea/25 bg-white/80 p-6 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/70">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Phantom · Devnet transfer</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Use this page to verify Phantom on <strong>Devnet</strong>: connect in the header, then send a small
            amount of test SOL to any devnet address. Set Phantom’s network to Devnet (⋮ → Developer Settings →
            Testnet Mode → Devnet).
          </p>
        </div>

        <div className="rounded-xl bg-slate-100/90 px-3 py-2 font-mono text-xs text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          RPC: {RPC}
        </div>

        {!address ? (
          <button
            type="button"
            onClick={() => void connect()}
            disabled={connecting}
            className="rounded-xl bg-escrow-aqua/90 px-4 py-2 text-sm font-semibold text-escrow-deep hover:bg-escrow-aqua disabled:opacity-60"
          >
            {connecting ? 'Connecting…' : 'Connect Phantom (or use header)'}
          </button>
        ) : (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Connected: <span className="font-mono">{address}</span>
          </p>
        )}

        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Recipient (base58)
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g. friend’s devnet pubkey"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>

        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Amount (SOL)
          <input
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending || !recipient.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-escrow-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-escrow-sea disabled:opacity-50 dark:bg-escrow-sea dark:hover:bg-escrow-aqua dark:text-escrow-deep"
        >
          <Send size={16} />
          {sending ? 'Approve in Phantom…' : 'Send on devnet'}
        </button>

        {lastSig && (
          <a
            href={devnetExplorerTx(lastSig)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-escrow-deep underline hover:text-escrow-sea dark:text-escrow-aqua"
          >
            View on Solscan (devnet)
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </Layout>
  );
}
