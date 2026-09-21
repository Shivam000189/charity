import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SignupForm } from '../../components/auth/SignupForm';
import { ROUTES } from '../../constants/routes';

export const SignupPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-md">
        <SignupForm onToggleLogin={() => navigate(ROUTES.LOGIN)} />
      </div>
    </div>
  );
};
