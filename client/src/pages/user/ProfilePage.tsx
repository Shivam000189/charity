import React from 'react';
import { UserProfileCard } from '../../components/auth/UserProfileCard';

export const ProfilePage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">User Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account identity and verify backend API access
        </p>
      </div>

      <div className="flex justify-center">
        <UserProfileCard />
      </div>
    </div>
  );
};
