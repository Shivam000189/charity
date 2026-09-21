import { Request, Response } from 'express';
import {
  validateCharityInput,
  validateContributionPercentage,
  validateDonationAmount,
} from '../utils/charity.validation';
import {
  getPublicCharities,
  getPublicCharityById,
  getFeaturedCharities,
  getAllCharitiesAdmin,
  getCharityByIdAdmin,
  createCharity,
  updateCharity,
  softDeleteCharity,
  uploadCharityImage,
  getUserCharityPreference,
  updateUserCharityPreference,
  createDonation,
  confirmDonation,
  CharityServiceError,
} from '../services/charity.service';

// ─── Public Endpoints ─────────────────────────────────────────────────────────

export const getCharitiesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    const charities = await getPublicCharities({ search, category });

    res.status(200).json({
      success: true,
      charities,
    });
  } catch (err: unknown) {
    console.error('[Charity] getCharities error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'GET_CHARITIES_FAILED',
      message: 'Failed to retrieve charities.',
    });
  }
};

export const getFeaturedCharitiesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const charities = await getFeaturedCharities();

    res.status(200).json({
      success: true,
      charities,
    });
  } catch (err: unknown) {
    console.error('[Charity] getFeaturedCharities error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'GET_FEATURED_FAILED',
      message: 'Failed to retrieve featured charities.',
    });
  }
};

export const getCharityByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const charityId = req.params.id as string;
    if (!charityId) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'Charity ID parameter is required.',
      });
      return;
    }

    const charity = await getPublicCharityById(charityId);

    res.status(200).json({
      success: true,
      charity,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity] getCharityById error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'GET_CHARITY_FAILED',
      message: 'Failed to retrieve charity details.',
    });
  }
};

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

export const getAdminCharitiesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const charities = await getAllCharitiesAdmin();

    res.status(200).json({
      success: true,
      charities,
    });
  } catch (err: unknown) {
    console.error('[Charity Admin] getAllCharities error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'GET_ADMIN_CHARITIES_FAILED',
      message: 'Failed to retrieve admin charities.',
    });
  }
};

export const getAdminCharityByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const charityId = req.params.id as string;
    const charity = await getCharityByIdAdmin(charityId);

    res.status(200).json({
      success: true,
      charity,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      code: 'GET_CHARITY_FAILED',
      message: 'Failed to retrieve charity.',
    });
  }
};

export const createCharityHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateCharityInput(req.body || {}, false);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: validation.error.code,
        message: validation.error.message,
      });
      return;
    }

    const created = await createCharity(validation.data as any);

    res.status(201).json({
      success: true,
      message: 'Charity created successfully.',
      charity: created,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity Admin] createCharity error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'CREATE_CHARITY_FAILED',
      message: 'An error occurred while creating the charity.',
    });
  }
};

export const updateCharityHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const charityId = req.params.id as string;
    if (!charityId) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'Charity ID parameter is required.',
      });
      return;
    }

    const validation = validateCharityInput(req.body || {}, true);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: validation.error.code,
        message: validation.error.message,
      });
      return;
    }

    const body = req.body || {};
    const updated = await updateCharity(charityId, {
      ...validation.data,
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      ...(body.is_active !== undefined ? { isActive: Boolean(body.is_active) } : {}),
    });

    res.status(200).json({
      success: true,
      message: 'Charity updated successfully.',
      charity: updated,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity Admin] updateCharity error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'UPDATE_CHARITY_FAILED',
      message: 'An error occurred while updating the charity.',
    });
  }
};

export const deleteCharityHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const charityId = req.params.id as string;
    if (!charityId) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'Charity ID parameter is required.',
      });
      return;
    }

    const deactivated = await softDeleteCharity(charityId);

    res.status(200).json({
      success: true,
      message: 'Charity deactivated successfully.',
      charity: deactivated,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity Admin] deleteCharity error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'DELETE_CHARITY_FAILED',
      message: 'An error occurred while deactivating the charity.',
    });
  }
};

export const uploadCharityImageHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Data, filename, mimetype } = req.body || {};

    if (!base64Data || typeof base64Data !== 'string') {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'base64Data is required.',
      });
      return;
    }

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const detectedMime = mimetype && validMimes.includes(mimetype) ? mimetype : 'image/jpeg';

    const publicUrl = await uploadCharityImage(
      buffer,
      detectedMime,
      filename || 'charity-image.jpg'
    );

    res.status(200).json({
      success: true,
      url: publicUrl,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity Upload] error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'UPLOAD_FAILED',
      message: 'Failed to upload image.',
    });
  }
};

// ─── Subscription Charity Preference ──────────────────────────────────────────

export const getUserCharityPreferenceHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    const preference = await getUserCharityPreference(userId);

    res.status(200).json({
      success: true,
      preference,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity Preference] get error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'GET_PREFERENCE_FAILED',
      message: 'Failed to retrieve charity preference.',
    });
  }
};

export const updateUserCharityPreferenceHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
      });
      return;
    }

    const { charityId, contributionPercentage } = req.body || {};

    if (!charityId || typeof charityId !== 'string') {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'charityId is required.',
      });
      return;
    }

    const pctVal = validateContributionPercentage(contributionPercentage);
    if (!pctVal.valid) {
      res.status(400).json({
        success: false,
        code: pctVal.error.code,
        message: pctVal.error.message,
      });
      return;
    }

    const updated = await updateUserCharityPreference(userId, charityId, pctVal.percentage);

    res.status(200).json({
      success: true,
      message: 'Charity preference updated successfully.',
      preference: updated,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Charity Preference] update error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'UPDATE_PREFERENCE_FAILED',
      message: 'Failed to update charity preference.',
    });
  }
};

// ─── Independent Donations ────────────────────────────────────────────────────

export const createDonationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || null;
    const { charityId, amount, donorName, message } = req.body || {};

    if (!charityId || typeof charityId !== 'string') {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'charityId is required.',
      });
      return;
    }

    const amountVal = validateDonationAmount(amount);
    if (!amountVal.valid) {
      res.status(400).json({
        success: false,
        code: amountVal.error.code,
        message: amountVal.error.message,
      });
      return;
    }

    const donation = await createDonation({
      userId,
      charityId,
      amount: amountVal.amount,
      donorName: typeof donorName === 'string' ? donorName.trim() : undefined,
      message: typeof message === 'string' ? message.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Donation created successfully. Proceed to mock checkout.',
      donation,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Donation] create error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'CREATE_DONATION_FAILED',
      message: 'Failed to create donation.',
    });
  }
};

export const confirmDonationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const donationId = req.params.id as string;
    if (!donationId) {
      res.status(400).json({
        success: false,
        code: 'MISSING_FIELD',
        message: 'Donation ID parameter is required.',
      });
      return;
    }

    const { cardNumber } = req.body || {};

    const donation = await confirmDonation({
      donationId,
      cardNumber: typeof cardNumber === 'string' ? cardNumber : undefined,
    });

    res.status(200).json({
      success: true,
      message: 'Donation completed successfully! Thank you for your generous contribution.',
      donation,
    });
  } catch (err: unknown) {
    if (err instanceof CharityServiceError) {
      res.status(err.statusCode).json({
        success: false,
        code: err.code,
        message: err.message,
      });
      return;
    }

    console.error('[Donation] confirm error:', (err as Error).message);
    res.status(500).json({
      success: false,
      code: 'CONFIRM_DONATION_FAILED',
      message: 'Failed to confirm donation.',
    });
  }
};
