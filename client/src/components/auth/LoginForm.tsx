import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export const LoginForm: React.FC<{ onToggleSignup: () => void }> = ({ onToggleSignup }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = await signIn(email, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials or user not found');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 animate-fade-in">
      <div className="text-center space-y-1 mb-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to your verified subscriber portal</p>
      </div>

      {errorMsg && (
        <div className="p-3 mb-5 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          loadingText="Signing In..."
          className="w-full mt-2"
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-5 text-center border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onToggleSignup}
          className="font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
        >
          Create one now
        </button>
      </div>
    </div>
  );
};
