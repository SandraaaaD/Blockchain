import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginApi } from '../../api/auth';
import toast from 'react-hot-toast';
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginApi(form);
      login(data);
      toast.success('Welcome back!');
      navigate(data.role === 'DEVELOPER' ? '/developer' : '/client');
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { message?: string } };
        message?: string;
        code?: string;
      };
      const network =
        !ax.response && (ax.message === 'Network Error' || ax.code === 'ERR_NETWORK');
      const msg = network
        ? 'Backend unreachable — run npm start in backend-node (same port as VITE_API_URL).'
        : (ax.response?.data?.message ?? 'Invalid credentials');
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
          <div className="inline-flex mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-escrow-deep via-escrow-sea to-escrow-aqua text-xl font-bold text-white shadow-glow ring-1 ring-white/40 transition-[transform,box-shadow] duration-300 motion-safe:hover:scale-[1.02] dark:shadow-glow-dark">
            EP
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-slate-400 mt-2">
            Sign in to continue to EscrowPay
          </p>
        </div>

        <div className="card-interactive shadow-elevated-dark p-8 ring-1 ring-escrow-aqua/25">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            No account yet?{' '}
            <Link
              to="/register"
              className="text-escrow-aqua hover:text-escrow-sand font-semibold underline-offset-2 hover:underline transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
