import { Request, Response } from 'express';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
    return;
  }

  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    },
  });
};
