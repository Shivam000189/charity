/**
 * Centralized Route Dictionary for Digital Hero Application
 */
export const ROUTES = {
  // Public Routes
  HOME: '/',
  ABOUT: '/about',
  CHARITIES: '/charities',
  DRAWS: '/draws',
  LOGIN: '/login',
  SIGNUP: '/signup',

  // Authenticated User Routes
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',

  // Subscriber Routes
  SUBSCRIPTION: '/subscription',
  MY_ENTRIES: '/my-entries',
  MY_WINNINGS: '/my-winnings',

  // Admin Routes
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_CHARITIES: '/admin/charities',
  ADMIN_DRAWS: '/admin/draws',
  ADMIN_WINNERS: '/admin/winners',
  ADMIN_PAYOUTS: '/admin/payouts',

  // Error Routes
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '*',
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
