import { Request, Response } from 'express';
import {
  listUsersAdmin,
  getUserDetailAdmin,
  updateUserRoleAdmin,
  adminEditScore,
} from '../services/admin-user.service';

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await listUsersAdmin();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to list users.' });
  }
}

export async function getUserDetail(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id as string;
    const user = await getUserDetailAdmin(userId);
    res.json({ success: true, user });
  } catch (err: any) {
    const status = err.message === 'User not found' ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id as string;
    const { role } = req.body;
    const updated = await updateUserRoleAdmin(userId, role);
    res.json({ success: true, message: 'User role updated.', user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function editScore(req: Request, res: Response): Promise<void> {
  try {
    const scoreId = req.params.id as string;
    const { score, date } = req.body;
    const updated = await adminEditScore(scoreId, score, date);
    res.json({ success: true, message: 'Score updated successfully.', score: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}
