import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

type Mode = 'light' | 'dark' | 'system';

function applyTheme(mode: Mode) {
  const dark =
    mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('escrowpay-theme', mode);
  } catch {
    /* ignore */
  }
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return (localStorage.getItem('escrowpay-theme') as Mode) || 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    applyTheme(mode);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const cycle = () => {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'));
  };

  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor;
  const title =
    mode === 'system' ? 'Theme: system' : mode === 'dark' ? 'Theme: dark' : 'Theme: light';

  return (
    <button
      type="button"
      onClick={cycle}
      title={title}
      className="rounded-xl p-2.5 text-slate-500 hover:bg-white/88 hover:text-escrow-deep ring-1 ring-transparent hover:ring-escrow-sea/30 transition-colors dark:text-slate-400 dark:hover:bg-slate-950/76 dark:hover:text-escrow-sand dark:hover:ring-escrow-aqua/30"
    >
      <Icon size={18} aria-hidden />
      <span className="sr-only">{title}</span>
    </button>
  );
}
