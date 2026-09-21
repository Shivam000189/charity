import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

// Layouts
import { AppLayout } from '../layouts/AppLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Route Guards
import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { RoleRoute } from '../components/routing/RoleRoute';

// Public Pages
import { HomePage } from '../pages/public/HomePage';
import { AboutPage } from '../pages/public/AboutPage';
import { CharitiesPage } from '../pages/public/CharitiesPage';
import { DrawsPage } from '../pages/public/DrawsPage';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';

// Authenticated User Pages
import { DashboardPage } from '../pages/user/DashboardPage';
import { ProfilePage } from '../pages/user/ProfilePage';

// Onboarding Pages
import { PlanSelectionPage } from '../pages/onboarding/PlanSelectionPage';
import { CheckoutPreviewPage } from '../pages/onboarding/CheckoutPreviewPage';

// Subscriber Pages
import { SubscriptionPage } from '../pages/subscriber/SubscriptionPage';
import { MyEntriesPage } from '../pages/subscriber/MyEntriesPage';
import { MyWinningsPage } from '../pages/subscriber/MyWinningsPage';

// Admin Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminCharitiesPage } from '../pages/admin/AdminCharitiesPage';
import { AdminDrawsPage } from '../pages/admin/AdminDrawsPage';
import { AdminWinnersPage } from '../pages/admin/AdminWinnersPage';
import { AdminPayoutsPage } from '../pages/admin/AdminPayoutsPage';

// Error Pages
import { UnauthorizedPage } from '../pages/errors/UnauthorizedPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.ABOUT} element={<AboutPage />} />
        <Route path={ROUTES.CHARITIES} element={<CharitiesPage />} />
        <Route path={ROUTES.DRAWS} element={<DrawsPage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
        <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

        {/* Authenticated Routes (Requires logged in user) */}
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
          <Route path={ROUTES.ONBOARDING_PLAN} element={<PlanSelectionPage />} />
          <Route path={ROUTES.ONBOARDING_CHECKOUT} element={<CheckoutPreviewPage />} />
        </Route>

        {/* Subscriber Routes (Requires subscriber or admin role) */}
        <Route element={<RoleRoute allowedRoles={['subscriber', 'admin']} />}>
          <Route path={ROUTES.SUBSCRIPTION} element={<SubscriptionPage />} />
          <Route path={ROUTES.MY_ENTRIES} element={<MyEntriesPage />} />
          <Route path={ROUTES.MY_WINNINGS} element={<MyWinningsPage />} />
        </Route>

        {/* Admin Routes (Requires admin role) */}
        <Route element={<RoleRoute allowedRoles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path={ROUTES.ADMIN} element={<AdminDashboardPage />} />
            <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={ROUTES.ADMIN_CHARITIES} element={<AdminCharitiesPage />} />
            <Route path={ROUTES.ADMIN_DRAWS} element={<AdminDrawsPage />} />
            <Route path={ROUTES.ADMIN_WINNERS} element={<AdminWinnersPage />} />
            <Route path={ROUTES.ADMIN_PAYOUTS} element={<AdminPayoutsPage />} />
          </Route>
        </Route>

        {/* 404 Catch-All Route */}
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
