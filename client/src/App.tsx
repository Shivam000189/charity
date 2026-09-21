import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { UserProfileCard } from './components/auth/UserProfileCard';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-600 dark:text-slate-300 font-medium">Checking authentication status...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          Digital Hero
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Supabase Authentication &amp; Full-Stack PostgreSQL Platform
        </p>
      </header>

      {user ? (
        <UserProfileCard />
      ) : showSignup ? (
        <SignupForm onToggleLogin={() => setShowSignup(false)} />
      ) : (
        <LoginForm onToggleSignup={() => setShowSignup(true)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}