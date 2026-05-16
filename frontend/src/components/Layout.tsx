import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePhantom } from '../context/PhantomContext';
import { ExternalLink, LogOut, LayoutDashboard, FolderOpen, Wallet } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

function formatWalletChip(addr: string) {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const {
    address: walletAddr,
    error: phantomError,
    isPhantomInstalled,
    connecting,
    disconnecting,
    connect,
    disconnect,
    clearError,
  } = usePhantom();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = user?.role === 'DEVELOPER' ? '/developer' : '/client';
  const projectsActive =
    location.pathname === '/projects' || location.pathname.startsWith('/projects/');

  const navTab = (href: string, active: boolean, icon: React.ReactNode, label: string) => (
    <Link
      to={href}
      className={`group relative flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-2 overflow-hidden transition-all duration-300 ease-out
        motion-reduce:transition-colors ${
          active
            ? 'bg-escrow-aqua/22 text-escrow-deep shadow-sm shadow-escrow-sea/20 ring-1 ring-escrow-sea/45 dark:bg-escrow-aqua/18 dark:text-escrow-sand dark:shadow-glow-dark dark:ring-escrow-aqua/38'
            : 'text-slate-600 hover:text-escrow-deep hover:bg-white/88 hover:ring-escrow-sea/35 hover:shadow-sm hover:ring-1 dark:text-slate-400 dark:hover:text-escrow-sand dark:hover:bg-slate-950/55 dark:hover:ring-escrow-aqua/28'
        }`}
    >
      <span className="absolute inset-x-5 -bottom-px h-px bg-gradient-to-r from-transparent via-escrow-aqua to-transparent opacity-0 transition-opacity motion-reduce:opacity-0 group-hover:opacity-80 group-hover:motion-safe:animate-pulse dark:via-escrow-sand" />
      <span className="relative">{icon}</span>
      <span className="relative">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="pointer-events-none fixed inset-0 z-0 bg-brand-flow" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-noise opacity-[0.58] dark:bg-noise-dark dark:opacity-[0.28]"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden bg-brand-veil" aria-hidden>
        <div
          className="absolute -top-32 right-[2%] h-[32rem] w-[32rem] rounded-full bg-escrow-aqua/32 blur-[140px] motion-safe:animate-float motion-reduce:animate-none dark:bg-escrow-aqua/12"
          style={{ animationDelay: '-2s' }}
        />
        <div className="absolute top-[12%] left-[-12%] h-[20rem] w-[20rem] rounded-full bg-escrow-deep/52 blur-[130px] motion-safe:animate-float motion-reduce:animate-none [animation-duration:32s] dark:bg-escrow-deep/38" />
        <div className="absolute bottom-[-22%] left-[-18%] h-[26rem] w-[26rem] rounded-full bg-escrow-sand/22 blur-[115px] motion-safe:animate-float motion-reduce:animate-none [animation-duration:34s] [animation-delay:-14s] dark:bg-escrow-sand/04" />
        <div className="absolute top-[40%] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-escrow-sea/16 blur-[105px] motion-safe:animate-float motion-reduce:animate-none [animation-delay:-8s] dark:bg-escrow-sea/06" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-screen">
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/35 shadow-sm backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 supports-[backdrop-filter]:bg-black/28 shadow-[0_8px_32px_-12px_rgba(10,196,224,0.12)]">
          <div
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-escrow-aqua/45 to-transparent opacity-85 motion-safe:animate-pulse-glow motion-reduce:opacity-50 dark:via-escrow-aqua/35"
            aria-hidden
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <Link to="/projects" className="flex items-center gap-3 shrink-0 group">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-escrow-deep via-escrow-sea to-escrow-aqua text-white shadow-glow ring-1 ring-white/40 transition-[transform,box-shadow] duration-300 motion-safe:group-hover:scale-[1.06] motion-safe:group-hover:shadow-glow-dark dark:shadow-glow-dark dark:ring-escrow-aqua/35">
                  <span className="relative z-10 text-sm font-bold tracking-tight">EP</span>
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-escrow-sand/35 to-transparent opacity-40 dark:opacity-[0.22]" />
                  <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/35 opacity-60 group-hover:motion-safe:animate-pulse" />
                </div>
                <div className="leading-tight min-w-0">
                  <span className="block font-bold tracking-tight text-slate-900 text-base sm:text-lg truncate dark:text-white">
                    EscrowPay
                  </span>
                  <span className="hidden sm:block text-[11px] font-medium uppercase tracking-widest text-escrow-deep/90 dark:text-escrow-sand/88">
                    milestone escrow
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/52 ring-1 ring-escrow-sea/32 backdrop-blur-md dark:bg-slate-950/48 dark:ring-escrow-aqua/22">
                {navTab(
                  dashboardPath,
                  location.pathname === dashboardPath,
                  <LayoutDashboard size={16} className="opacity-70" />,
                  'Dashboard'
                )}
                {navTab(
                  '/projects',
                  projectsActive,
                  <FolderOpen size={16} className="opacity-70" />,
                  'Projects'
                )}
              </nav>

              <div className="flex items-center gap-1 sm:gap-2">
                {phantomError && (
                  <button
                    type="button"
                    title={phantomError}
                    className="max-w-[8rem] sm:max-w-xs truncate rounded-lg px-2 py-1 text-[11px] font-medium text-amber-900 bg-amber-50/95 ring-1 ring-amber-300/85 hover:bg-amber-100 transition-colors backdrop-blur-sm dark:text-amber-100 dark:bg-amber-950/50 dark:ring-amber-600/40 dark:hover:bg-amber-950/80"
                    onClick={clearError}
                  >
                    {phantomError}
                  </button>
                )}
                {!isPhantomInstalled ? (
                  <a
                    href="https://phantom.app/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-escrow-deep bg-escrow-aqua/15 ring-1 ring-escrow-sea/40 hover:bg-escrow-aqua/26 hover:shadow-sm backdrop-blur-md transition-[background,shadow,transform] duration-200 active:scale-[0.97] motion-reduce:active:scale-100 dark:text-escrow-sand dark:bg-escrow-deep/72 dark:ring-escrow-aqua/42 dark:hover:bg-escrow-deep/88"
                    title="Install Phantom to connect your Solana wallet"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">Phantom</span>
                  </a>
                ) : walletAddr ? (
                  <div className="flex items-center rounded-xl bg-white/68 ring-1 ring-escrow-sea/36 overflow-hidden shrink-0 backdrop-blur-xl dark:bg-slate-950/58 dark:ring-escrow-aqua/26">
                    <button
                      type="button"
                      onClick={() => void connect()}
                      disabled={connecting}
                      className="inline-flex items-center gap-1.5 pl-2 sm:pl-3 pr-1 sm:pr-2 py-2 text-left text-[11px] font-mono font-medium text-slate-800 truncate max-w-[6.5rem] sm:max-w-[9rem] xl:max-w-[11rem] hover:bg-white/82 disabled:opacity-60 transition-colors dark:text-slate-200 dark:hover:bg-slate-900/92"
                      title={`${walletAddr} — click to open Phantom`}
                    >
                      <Wallet size={13} className="text-escrow-sea shrink-0 dark:text-escrow-aqua" />
                      {connecting ? '…' : formatWalletChip(walletAddr)}
                    </button>
                    <button
                      type="button"
                      onClick={() => disconnect()}
                      disabled={disconnecting}
                      className="text-xs font-semibold text-slate-600 hover:text-escrow-deep px-3 py-2 border-l border-escrow-sea/28 hover:bg-white/85 disabled:opacity-50 transition-colors dark:border-slate-800 dark:text-slate-400 dark:hover:text-escrow-sand dark:hover:bg-slate-900/88"
                      title="Disconnect wallet"
                    >
                      {disconnecting ? '…' : 'Disconnect'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void connect()}
                    disabled={connecting}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-escrow-deep bg-escrow-aqua/14 ring-1 ring-escrow-sea/38 hover:bg-escrow-aqua/26 hover:shadow-sm backdrop-blur-md disabled:opacity-60 transition-all duration-200 dark:text-escrow-sand dark:bg-escrow-deep/72 dark:ring-escrow-aqua/42 dark:hover:bg-escrow-deep/85"
                    title="Open Phantom to connect (set network to Devnet for testing)"
                  >
                    <Wallet size={14} />
                    <span className="hidden sm:inline">{connecting ? '…' : 'Connect'}</span>
                    <span className="sm:hidden">{connecting ? '…' : 'Wallet'}</span>
                  </button>
                )}
                <ThemeToggle />
                <NotificationBell />
                <div className="text-right hidden sm:block pl-2">
                  <p className="text-sm font-semibold text-slate-900 leading-tight dark:text-slate-100">
                    {user?.fullName}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-escrow-deep dark:text-escrow-aqua/92">
                    {user?.role?.toLowerCase()}
                  </p>
                </div>
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-escrow-sand/75 to-white/92 text-escrow-deep font-bold text-sm shadow-sm ring-1 ring-escrow-sea/35 transition-transform motion-safe:hover:scale-105 motion-reduce:transition-none dark:from-escrow-deep/88 dark:to-escrow-sea/65 dark:text-escrow-sand dark:ring-escrow-aqua/38">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-escrow-deep transition-colors duration-200 p-2.5 rounded-xl hover:bg-white/88 ring-1 ring-transparent hover:ring-escrow-sea/30 dark:text-slate-400 dark:hover:text-escrow-sand dark:hover:bg-slate-950/76 dark:hover:ring-escrow-aqua/30"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            <div className="flex md:hidden gap-2 pb-3 pt-2 border-t border-escrow-sea/22 dark:border-slate-800/94">
              {navTab(
                dashboardPath,
                location.pathname === dashboardPath,
                <LayoutDashboard size={15} className="opacity-70" />,
                'Dashboard'
              )}
              {navTab(
                '/projects',
                projectsActive,
                <FolderOpen size={15} className="opacity-70" />,
                'Projects'
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 motion-safe:animate-fade-rise motion-reduce:animate-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
