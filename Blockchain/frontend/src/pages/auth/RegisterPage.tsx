import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerApi } from '../../api/auth';
import type { UserRole } from '../../types';
import toast from 'react-hot-toast';
import { User, Code2 } from 'lucide-react';
export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await registerApi({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role,
      });
      login(data);
      toast.success('Welcome to EscrowPay!');
      navigate(role === 'DEVELOPER' ? '/developer' : '/client');
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { message?: string } };
        message?: string;
        code?: string;
      };
      const network =
        !ax.response && (ax.message === 'Network Error' || ax.code === 'ERR_NETWORK');
      const msg = network
        ? 'Backend unreachable: open another terminal, run npm start in backend-node (same port as VITE_API_URL in frontend/.env.development).'
        : (ax.response?.data?.message ?? ax.message ?? 'Registration failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 z-0 bg-brand-flow" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-noise-dark opacity-[0.28]"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[2] bg-brand-veil" aria-hidden />
      <div className="w-full max-w-md relative z-20 motion-safe:animate-fade-rise motion-reduce:animate-none">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-escrow-deep via-escrow-sea to-escrow-aqua text-lg font-bold text-white shadow-glow ring-1 ring-white/30 motion-safe:hover:scale-[1.03] transition-transform duration-300 dark:shadow-glow-dark">
            EP
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="text-slate-400 mt-2">Join EscrowPay in a minute</p>
        </div>

        <div className="card-interactive shadow-elevated-dark p-8 ring-1 ring-escrow-aqua/25">
          {/* Role Selection */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-300 mb-3">I am a…</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('CLIENT')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 motion-safe:active:scale-[0.98] motion-reduce:active:scale-100 ${
                  role === 'CLIENT'
                    ? 'border-escrow-aqua bg-escrow-deep/55 text-white ring-2 ring-escrow-aqua/35 backdrop-blur-sm'
                    : 'border-white/10 hover:border-white/20 text-slate-400 backdrop-blur-sm bg-black/25 hover:bg-black/38'
                }`}
              >
                <User size={24} />
                <div>
                  <p className="font-semibold text-sm">Client</p>
                  <p className="text-xs opacity-70">I need a project</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('DEVELOPER')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 motion-safe:active:scale-[0.98] motion-reduce:active:scale-100 ${
                  role === 'DEVELOPER'
                    ? 'border-escrow-aqua bg-escrow-deep/55 text-white ring-2 ring-escrow-aqua/35 backdrop-blur-sm'
                    : 'border-white/10 hover:border-white/20 text-slate-400 backdrop-blur-sm bg-black/25 hover:bg-black/38'
                }`}
              >
                <Code2 size={24} />
                <div>
                  <p className="font-semibold text-sm">Developer</p>
                  <p className="text-xs opacity-70">I build projects</p>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-escrow-aqua hover:text-escrow-sand font-semibold underline-offset-2 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
