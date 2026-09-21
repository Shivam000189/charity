export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'visitor' | 'subscriber' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
