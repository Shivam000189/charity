import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const isDbConnected = await checkDatabaseConnection();

  if (isDbConnected) {
    res.status(200).json({
      success: true,
      server: 'ok',
      database: 'connected',
    });
    return;
  }

  res.status(503).json({
    success: false,
    server: 'ok',
    database: 'disconnected',
  });
};
