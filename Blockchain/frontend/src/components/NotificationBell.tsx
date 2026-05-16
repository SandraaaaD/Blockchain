import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AppNotification } from '../types';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export default function NotificationBell() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await fetchNotifications(50);
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* ignore — offline */
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const iv = window.setInterval(() => void refresh(false), 26000);
    return () => window.clearInterval(iv);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh(true);
  }, [open, refresh]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await refresh(false);
    } catch {
      /* ignore */
    }
  };

  const handleBeforeNavigate = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
      } catch {
        /* still navigate */
      }
      await refresh(false);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        className={`relative p-2.5 rounded-xl transition-all duration-200 ${
          open
            ? 'text-blue-900 bg-blue-500/14 ring-1 ring-blue-400/38 shadow-soft dark:text-sky-100 dark:bg-blue-600/26 dark:ring-blue-400/42 dark:shadow-glow-dark'
            : 'text-slate-500 hover:text-blue-950 hover:bg-white/88 ring-1 ring-transparent hover:ring-blue-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/76 dark:hover:ring-blue-500/35'
        }`}
        title="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} aria-hidden />
        {!open && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-2xl shadow-elevated dark:shadow-elevated-dark border border-blue-100/70 bg-white/88 backdrop-blur-2xl z-[100] flex flex-col max-h-[min(28rem,calc(100vh-8rem))] ring-1 ring-blue-200/50 dark:border-blue-950/70 dark:bg-slate-950/78 dark:ring-blue-400/13 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-blue-50/92 bg-gradient-to-r from-blue-50/72 to-transparent dark:border-blue-950/92 dark:from-blue-950/46 dark:to-transparent">
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="text-xs font-semibold text-blue-800 hover:text-blue-950 flex items-center gap-1 dark:text-sky-400 dark:hover:text-sky-200"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[8rem]">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-12 text-zinc-300 dark:text-zinc-600">
                <Loader2 size={28} className="animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center px-6 py-10 dark:text-zinc-400">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100/85 dark:divide-zinc-800/85">
                {items.map((n) => (
                  <li key={n.id}>
                    <div className={`px-3 py-3 ${n.read ? 'bg-white/70 dark:bg-slate-950/35' : 'bg-sky-50/65 dark:bg-blue-950/48'}`}>
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200 dark:bg-slate-600' : 'bg-blue-500 shadow-sm shadow-blue-500/42 dark:bg-sky-400 dark:shadow-sky-500/35'}`}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-zinc-400 dark:text-zinc-500 block">
                            {n.category}
                          </span>
                          <p className="text-xs text-zinc-400 mt-0.5 dark:text-zinc-500">{formatWhen(n.createdAt)}</p>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">{n.title}</p>
                          <p className="text-xs text-zinc-600 mt-0.5 whitespace-pre-wrap break-words dark:text-zinc-400">{n.body}</p>
                          {n.projectId != null && (
                            <Link
                              to={`/projects/${n.projectId}`}
                              className="inline-flex mt-1.5 text-xs font-semibold text-blue-700 hover:underline dark:text-sky-400"
                              onClick={() => void handleBeforeNavigate(n)}
                            >
                              Open project
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
