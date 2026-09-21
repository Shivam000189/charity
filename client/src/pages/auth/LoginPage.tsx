import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../components/auth/LoginForm';
import { ROUTES } from '../../constants/routes';

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || ROUTES.DASHBOARD;

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full max-w-md">
        <LoginForm onToggleSignup={() => navigate(ROUTES.SIGNUP)} />
      </div>
    </div>
  );
};
