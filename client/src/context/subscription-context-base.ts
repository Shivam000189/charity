import { createContext } from 'react';
import type { SubscriptionContextType } from '../types/subscription';

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
