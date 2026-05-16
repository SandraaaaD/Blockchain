import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PhantomLike = {
  isPhantom?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: unknown }>;
  disconnect: () => Promise<void>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  off?: (event: string, cb: (...args: unknown[]) => void) => void;
  isConnected?: boolean;
  publicKey?: unknown;
  signAndSendTransaction?: (
    tx: import('@solana/web3.js').Transaction,
    opts?: { skipPreflight?: boolean }
  ) => Promise<{ signature: string }>;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomLike };
    solana?: PhantomLike;
  }
}

/** Use from pages that need Phantom after connect (e.g. devnet SOL transfers). */
export function getPhantomWallet(): PhantomLike | undefined {
  if (typeof window === 'undefined') return undefined;
  const p = window.phantom?.solana ?? window.solana;
  return p?.isPhantom ? p : undefined;
}

function getPhantom(): PhantomLike | undefined {
  return getPhantomWallet();
}

function pubkeyToAddr(pk: unknown): string | null {
  if (pk == null) return null;
  if (typeof pk === 'object' && pk !== null) {
    const o = pk as { toBase58?: () => string; toString?: () => string };
    if (typeof o.toBase58 === 'function') return o.toBase58();
    if (typeof o.toString === 'function') {
      const s = o.toString();
      return s?.length ? s : null;
    }
  }
  if (typeof pk === 'string' && pk.length > 0) return pk;
  return null;
}

function stripListener(wallet: PhantomLike, event: string, cb: (...args: unknown[]) => void) {
  if (typeof wallet.off === 'function') {
    wallet.off(event, cb);
  } else if (typeof wallet.removeListener === 'function') {
    wallet.removeListener(event, cb);
  }
}

type PhantomContextValue = {
  isPhantomInstalled: boolean;
  address: string | null;
  connecting: boolean;
  disconnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
};

const PhantomContext = createContext<PhantomContextValue | null>(null);

export function PhantomProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = getPhantom();
    if (!p) return;

    const sync = () => {
      setAddress(pubkeyToAddr(p.publicKey));
    };

    const onDisconnect = () => setAddress(null);
    const onConnect = () => sync();
    const onAccountChanged = (next?: unknown | null) => {
      const nextAddr = pubkeyToAddr(next ?? null);
      setAddress(nextAddr);
    };

    p.on('disconnect', onDisconnect);
    p.on('connect', onConnect);
    p.on('accountChanged', onAccountChanged);

    sync();

    void p.connect({ onlyIfTrusted: true }).finally(() => {
      sync();
    });

    return () => {
      stripListener(p, 'disconnect', onDisconnect);
      stripListener(p, 'connect', onConnect);
      stripListener(p, 'accountChanged', onAccountChanged);
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const connect = useCallback(async () => {
    const p = getPhantom();
    if (!p) {
      setError('Phantom extension was not detected.');
      return;
    }
    setError(null);
    setConnecting(true);
    try {
      const res = await p.connect({ onlyIfTrusted: false });
      const addr = pubkeyToAddr(res.publicKey ?? p.publicKey);
      setAddress(addr ?? pubkeyToAddr(p.publicKey));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect to Phantom.';
      setError(msg);
    } finally {
      setConnecting(false);
      const p2 = getPhantom();
      if (p2?.isConnected) {
        setAddress(pubkeyToAddr(p2.publicKey));
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    const p = getPhantom();
    if (!p) return;
    setError(null);
    setDisconnecting(true);
    try {
      await p.disconnect();
      setAddress(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not disconnect from Phantom.';
      setError(msg);
    } finally {
      setDisconnecting(false);
    }
  }, []);

  const isPhantomInstalled = Boolean(getPhantom());

  const value = useMemo<PhantomContextValue>(
    () => ({
      isPhantomInstalled,
      address,
      connecting,
      disconnecting,
      error,
      connect,
      disconnect,
      clearError,
    }),
    [
      isPhantomInstalled,
      address,
      connecting,
      disconnecting,
      error,
      connect,
      disconnect,
      clearError,
    ]
  );

  return <PhantomContext.Provider value={value}>{children}</PhantomContext.Provider>;
}

export function usePhantom() {
  const ctx = useContext(PhantomContext);
  if (!ctx) {
    throw new Error('usePhantom must be used within PhantomProvider');
  }
  return ctx;
}
