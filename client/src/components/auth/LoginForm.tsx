import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

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
      setErrorMsg(res.error || 'Failed to sign in');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Welcome Back</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">Log in to your Digital Hero account</p>

      {errorMsg && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-950 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onToggleSignup}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};
