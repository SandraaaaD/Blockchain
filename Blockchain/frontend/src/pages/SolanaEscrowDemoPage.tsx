import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { getPhantomWallet } from '../context/PhantomContext';
import { devnetExplorerTx, sendSolDevnet } from '../utils/solanaDevnetTransfer';
import toast from 'react-hot-toast';
import {
  Bot,
  Check,
  FileCode2,
  GitBranch,
  Loader2,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';

const WALLET_BUSINESS = 'G4WBt6GJF9zpqf6EJXvesnPCuLJwcK3gFx2gDWLW8KA5';
const WALLET_FREELANCER = 'D7YEA8ezk5mBiiw8dx2p7Sj8vaP5KFEDyi6ErcX594vL';
const ESCROW_SOL = 0.01;

const DEFAULT_DECLINE_MESSAGE =
  'I want dark mode and I want mobile support too. This was not what I expected visually.';

type Phase =
  | 'chat'
  | 'contract'
  | 'github'
  | 'approval'
  | 'decline-reason'
  | 'signing'
  | 'released'
  | 'ai-progress'
  | 'ai-verdict'
  | 'ai-execute';

type ChatLine = { who: 'business' | 'freelancer'; text: string };

const CHAT_SCRIPT: ChatLine[] = [
  {
    who: 'business',
    text: `I need a smart contract platform. Simple requirements:\n\n• Login system\n• Payment integration\n• Dashboard\n\nDeadline: 7 days.`,
  },
  { who: 'freelancer', text: 'Done. And payment?' },
  { who: 'business', text: `For ${ESCROW_SOL} SOL` },
];

const AI_STEPS = [
  'Uploading requirements…',
  'Analyzing client change requests…',
  'Analyzing code…',
  'Analyzing Git commits…',
  'Analyzing tests…',
  'Analyzing client follow-up messages…',
];

function shortAddr(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

/** Parses extra asks from the decline message — none are in the written contract. */
function analyzeExtraRequests(message: string): { label: string }[] {
  const found: { label: string }[] = [];
  if (/\bdark\s*mode\b|\bdarkmode\b|\bdark\b.*\btheme\b|\btheme\b.*\bdark\b/i.test(message)) {
    found.push({ label: 'Dark mode UI / theme' });
  }
  if (/\bmobile\b|\bresponsive\b|\bphone\b|\bhandheld\b/i.test(message)) {
    found.push({ label: 'Mobile layout / responsive design' });
  }
  if (found.length === 0 && message.trim()) {
    found.push({ label: message.trim().slice(0, 120) + (message.length > 120 ? '…' : '') });
  }
  return found;
}

async function transferEscrowToFreelancer(): Promise<string> {
  const w = getPhantomWallet();
  if (!w?.signAndSendTransaction) {
    throw new Error('Install Phantom and connect your wallet.');
  }
  const pkStr =
    w.publicKey != null && typeof (w.publicKey as { toBase58?: () => string }).toBase58 === 'function'
      ? (w.publicKey as { toBase58: () => string }).toBase58()
      : '';
  if (pkStr !== WALLET_BUSINESS) {
    throw new Error(
      `Phantom must use the business wallet (${shortAddr(WALLET_BUSINESS)}). Connected: ${pkStr ? shortAddr(pkStr) : 'none'}`
    );
  }
  return sendSolDevnet(
    {
      publicKey: w.publicKey,
      signAndSendTransaction: w.signAndSendTransaction.bind(w),
    },
    WALLET_FREELANCER,
    ESCROW_SOL
  );
}

export default function SolanaEscrowDemoPage() {
  const [phase, setPhase] = useState<Phase>('chat');
  const [chatVisible, setChatVisible] = useState(0);
  const [extraChat, setExtraChat] = useState<ChatLine[]>([]);
  const [declineDraft, setDeclineDraft] = useState(DEFAULT_DECLINE_MESSAGE);
  const [declineMessage, setDeclineMessage] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [bizOk, setBizOk] = useState(false);
  const [freeOk, setFreeOk] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [execFlash, setExecFlash] = useState(0);

  const releaseStarted = useRef(false);

  const extraRequests = useMemo(() => analyzeExtraRequests(declineMessage), [declineMessage]);

  const reset = useCallback(() => {
    releaseStarted.current = false;
    setPhase('chat');
    setChatVisible(0);
    setExtraChat([]);
    setDeclineDraft(DEFAULT_DECLINE_MESSAGE);
    setDeclineMessage('');
    setGithubUrl('');
    setBizOk(false);
    setFreeOk(false);
    setTxSig(null);
    setTxError(null);
    setAiStepIndex(0);
    setExecFlash(0);
  }, []);

  useEffect(() => {
    if (phase !== 'ai-progress') return;
    if (aiStepIndex >= AI_STEPS.length) {
      const t = setTimeout(() => setPhase('ai-verdict'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAiStepIndex((i) => i + 1), 850);
    return () => clearTimeout(t);
  }, [phase, aiStepIndex]);

  useEffect(() => {
    if (phase !== 'ai-execute') return;
    const id = setInterval(() => setExecFlash((n) => n + 1), 600);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'ai-execute') return;
    let cancelled = false;
    const tid = setTimeout(async () => {
      if (cancelled) return;
      try {
        const sig = await transferEscrowToFreelancer();
        if (!cancelled) {
          setTxSig(sig);
          setPhase('released');
          toast.success(`${ESCROW_SOL} SOL sent on devnet per ruling.`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Transfer failed';
        if (!cancelled) {
          toast.error(msg);
          setTxError(msg);
          setPhase('ai-verdict');
        }
      }
    }, 2400);
    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'approval' || !bizOk || !freeOk || !githubUrl.trim()) return;
    if (releaseStarted.current) return;
    releaseStarted.current = true;
    setTxError(null);
    setPhase('signing');
  }, [phase, bizOk, freeOk, githubUrl]);

  useEffect(() => {
    if (phase !== 'signing') return;
    let cancelled = false;
    (async () => {
      try {
        const sig = await transferEscrowToFreelancer();
        if (!cancelled) {
          setTxSig(sig);
          setPhase('released');
          toast.success(`${ESCROW_SOL} SOL sent on devnet.`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Transfer failed';
        if (!cancelled) {
          toast.error(msg);
          setTxError(msg);
          setPhase('approval');
          setBizOk(false);
          setFreeOk(false);
          releaseStarted.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const progressPct = useMemo(() => {
    if (phase !== 'ai-progress') return 0;
    return Math.min(100, Math.round((aiStepIndex / AI_STEPS.length) * 100));
  }, [phase, aiStepIndex]);

  const revealNextChat = () => {
    if (chatVisible < CHAT_SCRIPT.length - 1) setChatVisible((v) => v + 1);
    else setPhase('contract');
  };

  const submitDeclineAndAnalyze = () => {
    const msg = declineDraft.trim() || DEFAULT_DECLINE_MESSAGE;
    setDeclineMessage(msg);
    setExtraChat((prev) => [...prev, { who: 'business', text: msg }]);
    setPhase('ai-progress');
    setAiStepIndex(0);
    setChatVisible(CHAT_SCRIPT.length - 1);
  };

  const handleBizDeclineClick = () => {
    setBizOk(false);
    setDeclineDraft(DEFAULT_DECLINE_MESSAGE);
    setPhase('decline-reason');
  };

  const visibleChat: ChatLine[] = [...CHAT_SCRIPT.slice(0, chatVisible + 1), ...extraChat];

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 px-1 sm:space-y-8 sm:px-0 motion-safe:animate-fade-rise">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-escrow-aqua">Solana · escrow</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Chat → contract → approvals
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Connect Phantom as the <span className="font-mono font-medium">{shortAddr(WALLET_BUSINESS)}</span> wallet on{' '}
              <strong>Devnet</strong>. On mutual approve (or after AI ruling), the app sends{' '}
              <strong>{ESCROW_SOL} SOL</strong> to the freelancer address on-chain.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-slate-700 sm:w-auto"
          >
            <RefreshCw size={16} />
            Start over
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-escrow-sea/25 bg-white/85 p-4 shadow-soft backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/70 dark:shadow-soft-dark sm:p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              <Shield className="text-escrow-sea" size={22} />
              Negotiation chat
            </h2>
            <div className="mt-4 flex max-h-[min(70vh,28rem)] flex-col gap-3 overflow-y-auto overscroll-contain">
              {visibleChat.map((m, i) => (
                <div
                  key={`${i}-${m.text.slice(0, 12)}`}
                  className={`flex ${m.who === 'business' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[min(100%,24rem)] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[92%] ${
                      m.who === 'business'
                        ? 'rounded-tl-sm bg-slate-200/95 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                        : 'rounded-tr-sm bg-gradient-to-br from-escrow-sea to-escrow-deep text-white'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                      {m.who === 'business' ? 'Business' : 'Freelancer'}
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap font-sans">{m.text}</pre>
                  </div>
                </div>
              ))}
            </div>
            {phase === 'chat' && (
              <button
                type="button"
                onClick={revealNextChat}
                className="mt-4 w-full rounded-xl bg-escrow-aqua/90 py-3 text-sm font-semibold text-escrow-deep hover:bg-escrow-aqua sm:py-2.5"
              >
                {chatVisible < CHAT_SCRIPT.length - 1 ? 'Show next message' : 'Lock terms & show smart contract'}
              </button>
            )}
          </section>

          <div className="min-w-0 space-y-4 sm:space-y-6">
            {(phase === 'contract' ||
              phase === 'github' ||
              phase === 'approval' ||
              phase === 'decline-reason' ||
              phase === 'signing' ||
              phase === 'released' ||
              phase === 'ai-progress' ||
              phase === 'ai-verdict' ||
              phase === 'ai-execute') && (
              <section className="relative overflow-hidden rounded-2xl border-2 border-dashed border-escrow-aqua/50 bg-gradient-to-br from-slate-900 via-escrow-deep to-slate-900 p-5 text-white shadow-glow-dark ring-1 ring-escrow-aqua/30 motion-safe:animate-pulse-glow sm:p-6">
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,rgba(10,196,224,0.08)_50%,transparent_60%)] motion-safe:animate-[pulse-glow_4s_ease-in-out_infinite]" />
                <div className="relative">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-escrow-aqua">On-chain escrow terms</p>
                  <h3 className="mt-2 text-lg font-bold sm:text-xl">Milestone escrow — website build</h3>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                      <span className="text-escrow-sand/80">Business </span>
                      <span className="break-all font-mono text-[11px] sm:text-xs">{WALLET_BUSINESS}</span>
                    </div>
                    <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                      <span className="text-escrow-sand/80">Freelancer </span>
                      <span className="break-all font-mono text-[11px] sm:text-xs">{WALLET_FREELANCER}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-escrow-aqua/20 px-3 py-2 font-semibold">
                      <span>Locked amount</span>
                      <span>{ESCROW_SOL} SOL</span>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1 text-sm text-escrow-sand/90">
                    <li className="flex gap-2">
                      <Check size={16} className="shrink-0 text-green-400" /> Login system
                    </li>
                    <li className="flex gap-2">
                      <Check size={16} className="shrink-0 text-green-400" /> Payment integration
                    </li>
                    <li className="flex gap-2">
                      <Check size={16} className="shrink-0 text-green-400" /> Dashboard
                    </li>
                    <li className="flex gap-2 opacity-90">
                      <FileCode2 size={16} className="shrink-0 text-escrow-aqua" /> Deadline: 7 days
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {(phase === 'contract' || phase === 'github') && (
              <button
                type="button"
                onClick={() => setPhase('github')}
                className="w-full rounded-xl bg-escrow-deep py-3 text-sm font-semibold text-white hover:bg-escrow-sea sm:py-2.5"
              >
                Continue to GitHub link
              </button>
            )}

            {(phase === 'github' || phase === 'approval' || phase === 'decline-reason' || phase === 'signing') && (
              <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-950/70 sm:p-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <GitBranch size={18} />
                  Repository URL
                </label>
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/you/repo"
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                {phase === 'github' && (
                  <button
                    type="button"
                    disabled={!githubUrl.trim()}
                    onClick={() => setPhase('approval')}
                    className="mt-3 w-full rounded-xl bg-escrow-sea py-3 text-sm font-semibold text-white disabled:opacity-40 sm:py-2.5"
                  >
                    Submit & request approvals
                  </button>
                )}
              </section>
            )}

            {phase === 'signing' && (
              <section className="flex items-center gap-3 rounded-2xl border border-escrow-aqua/40 bg-slate-900/90 p-4 text-white">
                <Loader2 className="animate-spin text-escrow-aqua" size={24} />
                <div>
                  <p className="font-semibold">Confirm in Phantom</p>
                  <p className="text-sm text-slate-400">
                    Sending {ESCROW_SOL} SOL to freelancer on devnet…
                  </p>
                </div>
              </section>
            )}

            {phase === 'approval' && (
              <section className="rounded-2xl border border-amber-200/60 bg-amber-50/90 p-4 dark:border-amber-900/40 dark:bg-amber-950/30 sm:p-5">
                <h3 className="font-bold text-slate-900 dark:text-white">Dual approval</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Both approve → Phantom signs {ESCROW_SOL} SOL from the business wallet to the freelancer. Business can
                  decline and describe extra asks for the AI review.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                    <p className="text-xs font-bold uppercase text-slate-500">Business</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-700 dark:text-slate-300">{WALLET_BUSINESS}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBizOk(true)}
                        className="min-h-[40px] rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={handleBizDeclineClick}
                        className="min-h-[40px] rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                    <p className="text-xs font-bold uppercase text-slate-500">Freelancer</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {WALLET_FREELANCER}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFreeOk(true)}
                      className="mt-3 min-h-[40px] w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500 sm:w-auto"
                    >
                      Approve
                    </button>
                  </div>
                </div>
                {txError && phase === 'approval' && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{txError}</p>
                )}
              </section>
            )}

            {phase === 'released' && txSig && (
              <section className="rounded-2xl border border-green-400/50 bg-green-50 p-4 dark:border-green-700 dark:bg-green-950/40 sm:p-5">
                <h3 className="flex items-center gap-2 font-bold text-green-900 dark:text-green-100">
                  <Check size={22} />
                  Transfer confirmed
                </h3>
                <p className="mt-2 text-sm text-green-800 dark:text-green-200/90">
                  Transaction signature (devnet):
                </p>
                <code className="mt-3 block break-all rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-slate-900 dark:bg-slate-900 dark:text-escrow-aqua">
                  {txSig}
                </code>
                <a
                  className="mt-3 inline-block text-sm font-medium text-escrow-sea underline dark:text-escrow-aqua"
                  href={devnetExplorerTx(txSig)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Solscan
                </a>
              </section>
            )}
          </div>
        </div>

        {/* Decline: capture message */}
        {phase === 'decline-reason' && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 sm:items-center">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-600 bg-slate-950 p-5 text-white shadow-elevated-dark">
              <h3 className="text-lg font-bold">Decline — describe what’s missing</h3>
              <p className="mt-2 text-sm text-slate-400">
                This message is sent to the thread and analyzed against the written contract (login, payments, dashboard,
                deadline).
              </p>
              <textarea
                value={declineDraft}
                onChange={(e) => setDeclineDraft(e.target.value)}
                rows={5}
                className="mt-4 w-full resize-y rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPhase('approval')}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 sm:py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitDeclineAndAnalyze}
                  className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 sm:py-2"
                >
                  Send & run AI review
                </button>
              </div>
            </div>
          </div>
        )}

        {(phase === 'ai-progress' || phase === 'ai-verdict' || phase === 'ai-execute') && (
          <section className="rounded-2xl border border-violet-400/40 bg-gradient-to-b from-violet-950/90 to-slate-950 p-5 text-white shadow-elevated-dark sm:p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Bot className="text-violet-400" size={24} />
              AI Judge
            </h3>

            {phase === 'ai-progress' && (
              <div className="mt-6">
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-escrow-aqua transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {AI_STEPS.map((label, i) => (
                    <li key={label} className="flex items-center gap-2">
                      {i < aiStepIndex ? (
                        <Check size={16} className="text-green-400" />
                      ) : i === aiStepIndex ? (
                        <Loader2 size={16} className="animate-spin text-escrow-aqua" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border border-slate-600" />
                      )}
                      <span className={i <= aiStepIndex ? 'text-white' : 'text-slate-500'}>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase === 'ai-verdict' && (
              <div className="mt-6 space-y-4 rounded-xl bg-slate-900/80 p-5 ring-1 ring-violet-500/30">
                <p className="font-bold text-violet-300">AI Judge</p>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Contract requirements:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li className="flex gap-2">
                      <Check className="text-green-400" size={16} /> Login system complete
                    </li>
                    <li className="flex gap-2">
                      <Check className="text-green-400" size={16} /> Payment integration complete
                    </li>
                    <li className="flex gap-2">
                      <Check className="text-green-400" size={16} /> Dashboard complete
                    </li>
                    <li className="flex gap-2">
                      <Check className="text-green-400" size={16} /> Tests passed
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Additional client requests…</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {extraRequests.map((ex) => (
                      <li key={ex.label} className="flex flex-wrap items-start gap-2 text-red-300">
                        <X size={16} className="mt-0.5 shrink-0" />
                        <span>
                          <span className="text-slate-200">{ex.label}</span>
                          <span className="block text-xs text-red-200/90">Not specified in contract.</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="border-t border-slate-700 pt-3 text-base font-bold text-escrow-aqua">
                  Verdict: Freelancer fulfilled agreement.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTxError(null);
                    setPhase('ai-execute');
                  }}
                  className="mt-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 sm:py-2"
                >
                  Execute ruling — release {ESCROW_SOL} SOL (Phantom)
                </button>
                {txError && (
                  <p className="mt-2 text-sm text-red-300">{txError}</p>
                )}
              </div>
            )}

            {phase === 'ai-execute' && (
              <div className="mt-8 text-center px-2">
                <p className="text-xs uppercase tracking-widest text-violet-400">Executing smart contract</p>
                <p
                  className={`mt-4 text-xl font-black uppercase tracking-tight sm:text-2xl ${
                    execFlash % 2 === 0 ? 'text-escrow-aqua' : 'text-white'
                  }`}
                >
                  SMART CONTRACT EXECUTING.
                </p>
                <p className="mt-2 text-sm text-slate-400">Executing smart contract</p>
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
