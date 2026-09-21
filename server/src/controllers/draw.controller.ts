import { Request, Response } from 'express';
import {
  createDraw,
  getAllDrawsAdmin,
  getDrawByIdAdmin,
  updateDraw,
  deleteDraw,
  openDraw,
  closeDraw,
  simulateDraw,
  publishDraw,
  getPublicDraws,
  getPublicDrawById,
  getSubscriberDrawEntry,
  DrawServiceError,
} from '../services/draw.service';
import { validateCreateDrawInput } from '../utils/draw.validation';

export class DrawController {
  // ─── Admin Endpoints ────────────────────────────────────────────────────────

  static async getAllDrawsAdmin(_req: Request, res: Response): Promise<void> {
    try {
      const draws = await getAllDrawsAdmin();
      res.json({ success: true, draws });
    } catch (err: unknown) {
      console.error('Failed to get admin draws:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve draws.' });
    }
  }

  static async getDrawByIdAdmin(req: Request, res: Response): Promise<void> {
    try {
      const draw = await getDrawByIdAdmin(req.params.id as string);
      res.json({ success: true, draw });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to retrieve draw.' });
    }
  }

  static async createDraw(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateCreateDrawInput(req.body);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          code: validation.error.code,
          message: validation.error.message,
        });
        return;
      }

      const draw = await createDraw(validation.data);
      res.status(201).json({
        success: true,
        message: 'Draw created successfully.',
        draw,
      });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      console.error('Failed to create draw:', err);
      res.status(500).json({ success: false, message: 'Failed to create draw.' });
    }
  }

  static async updateDraw(req: Request, res: Response): Promise<void> {
    try {
      const draw = await updateDraw(req.params.id as string, req.body);
      res.json({ success: true, message: 'Draw updated successfully.', draw });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to update draw.' });
    }
  }

  static async deleteDraw(req: Request, res: Response): Promise<void> {
    try {
      await deleteDraw(req.params.id as string);
      res.json({ success: true, message: 'Draw deleted successfully.' });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to delete draw.' });
    }
  }

  static async openDraw(req: Request, res: Response): Promise<void> {
    try {
      const result = await openDraw(req.params.id as string);
      res.json({
        success: true,
        message: `Draw opened. Enrolled ${result.enrolledCount} eligible subscribers.`,
        draw: result.draw,
        enrolledCount: result.enrolledCount,
      });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      console.error('Failed to open draw:', err);
      res.status(500).json({ success: false, message: 'Failed to open draw.' });
    }
  }

  static async closeDraw(req: Request, res: Response): Promise<void> {
    try {
      const draw = await closeDraw(req.params.id as string);
      res.json({ success: true, message: 'Draw entries locked and closed.', draw });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to close draw.' });
    }
  }

  static async simulateDraw(req: Request, res: Response): Promise<void> {
    try {
      const { forceNumbers } = req.body || {};
      const result = await simulateDraw(req.params.id as string, forceNumbers);
      res.json({
        success: true,
        message: 'Draw simulated successfully. Review results before publishing.',
        draw: result.draw,
        simulation: result.simulation,
      });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      console.error('Failed to simulate draw:', err);
      res.status(500).json({ success: false, message: 'Simulation failed.' });
    }
  }

  static async publishDraw(req: Request, res: Response): Promise<void> {
    try {
      const result = await publishDraw(req.params.id as string);
      res.json({
        success: true,
        message: 'Draw published and completed successfully. Winners officially recorded.',
        draw: result.draw,
        winners: result.winners,
      });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      console.error('Failed to publish draw:', err);
      res.status(500).json({ success: false, message: 'Publishing failed.' });
    }
  }

  // ─── Public Endpoints ───────────────────────────────────────────────────────

  static async getPublicDraws(_req: Request, res: Response): Promise<void> {
    try {
      const draws = await getPublicDraws();
      res.json({ success: true, draws });
    } catch (err: unknown) {
      console.error('Failed to get public draws:', err);
      res.status(500).json({ success: false, message: 'Failed to load draws.' });
    }
  }

  static async getPublicDrawById(req: Request, res: Response): Promise<void> {
    try {
      const result = await getPublicDrawById(req.params.id as string);
      res.json({ success: true, draw: result.draw, winners: result.winners });
    } catch (err: unknown) {
      if (err instanceof DrawServiceError) {
        res.status(err.statusCode).json({ success: false, code: err.code, message: err.message });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to load draw details.' });
    }
  }

  // ─── Subscriber Endpoints ───────────────────────────────────────────────────

  static async getMyDrawEntry(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }

      const entry = await getSubscriberDrawEntry(req.params.id as string, userId);
      res.json({ success: true, entry });
    } catch (err: unknown) {
      console.error('Failed to get subscriber draw entry:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve draw ticket.' });
    }
  }
}
