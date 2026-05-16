import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../context/ThemeContext';

function label(pref: ThemePreference): string {
  switch (pref) {
    case 'dark':
      return 'Dark · click for system';
    case 'light':
      return 'Light · click for dark';
    default:
      return 'System · click for light';
  }
}

export default function ThemeToggle() {
  const { preference, cycleTheme } = useTheme();

  const Icon = preference === 'dark' ? Moon : preference === 'light' ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={label(preference)}
      aria-label={`Theme: ${preference}. ${label(preference)}`}
      className="group relative isolate flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-sm ring-1 ring-escrow-sea/35 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-escrow-deep hover:shadow-md hover:ring-escrow-aqua/45 hover:scale-105 active:scale-95 dark:bg-slate-950/62 dark:text-escrow-sand dark:ring-escrow-aqua/30 dark:hover:bg-escrow-deep/78 dark:hover:text-escrow-aqua dark:hover:ring-escrow-sand/42 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <Icon
        size={18}
        strokeWidth={1.75}
        className="transition-transform duration-300 group-hover:rotate-12 motion-reduce:group-hover:rotate-0"
      />
    </button>
  );
}
