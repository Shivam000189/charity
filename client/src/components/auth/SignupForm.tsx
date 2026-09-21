import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const SignupForm: React.FC<{ onToggleLogin: () => void }> = ({ onToggleLogin }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const res = await signUp(email, password, name);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to sign up');
    } else {
      setSuccessMsg('Account created successfully! If email confirmation is enabled, please verify your email.');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Create an Account</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">Join Digital Hero today</p>

      {errorMsg && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-950 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-950 dark:text-green-300">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jane Doe"
          />
        </div>

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
            placeholder="•••••••• (minimum 6 characters)"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onToggleLogin}
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Sign in
        </button>
      </p>
    </div>
  );
};
