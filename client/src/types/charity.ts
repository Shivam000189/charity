export interface CharityEvent {
  id?: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  images: string[];
  upcomingEvents: CharityEvent[];
  featured: boolean;
  isActive: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharityInput {
  name: string;
  description?: string;
  category: string;
  logoUrl?: string;
  websiteUrl?: string;
  images?: string[];
  upcomingEvents?: CharityEvent[];
  featured?: boolean;
}

export interface UpdateCharityInput extends Partial<CreateCharityInput> {
  isActive?: boolean;
}

export interface SubscriptionCharityPreference {
  subscriptionId: string;
  charityId: string | null;
  charity: Charity | null;
  contributionPercentage: number;
}

export interface Donation {
  id: string;
  userId: string | null;
  charityId: string;
  charityName?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  donorName: string | null;
  message: string | null;
  transactionReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharityApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  charity?: Charity;
  charities?: Charity[];
  preference?: SubscriptionCharityPreference;
  donation?: Donation;
  url?: string;
}
