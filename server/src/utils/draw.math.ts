import crypto from 'crypto';

export const DRAW_NUMBER_MIN = 1;
export const DRAW_NUMBER_MAX = 45;
export const ENTRY_NUMBER_COUNT = 5;

export interface SubscriberPoolInput {
  plan: 'monthly' | 'annual' | string;
  contributionPercentage?: number;
}

export interface PoolSplitPercentages {
  threeMatch: number; // e.g. 25
  fourMatch: number;  // e.g. 35
  fiveMatch: number;  // e.g. 40
}

export interface CalculatedPrizePool {
  totalPool: number;
  threeMatchPool: number;
  fourMatchPool: number;
  fiveMatchPool: number;
  fiveMatchBase: number;
  jackpotRollover: number;
  subscriberCount: number;
}

export interface EntryForEvaluation {
  id: string;
  userId: string;
  numbers: number[];
}

export interface EvaluatedWinner {
  drawEntryId: string;
  userId: string;
  matchCount: 3 | 4 | 5;
  prizeAmount: number;
  rank?: number;
}

export interface EvaluationResult {
  drawnNumbers: number[];
  threeMatchWinners: EvaluatedWinner[];
  fourMatchWinners: EvaluatedWinner[];
  fiveMatchWinners: EvaluatedWinner[];
  totalWinnersCount: number;
  rolloverToNext: number;
  allWinners: EvaluatedWinner[];
}

/**
 * Uniform random generation of N unique numbers between min and max using Node crypto.
 */
export function generateRandomNumbers(
  count: number = ENTRY_NUMBER_COUNT,
  min: number = DRAW_NUMBER_MIN,
  max: number = DRAW_NUMBER_MAX
): number[] {
  if (max - min + 1 < count) {
    throw new Error(`Cannot pick ${count} unique numbers from range [${min}, ${max}]`);
  }

  const selected = new Set<number>();
  while (selected.size < count) {
    const num = crypto.randomInt(min, max + 1);
    selected.add(num);
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Score-weighted number generation.
 * - Base weight for each number in [min, max] = 1.
 * - Each occurrence in user's recent retained Stableford scores adds +3 weight.
 * - Samples `count` distinct numbers without replacement weighted by frequency.
 */
export function generateScoreWeightedNumbers(
  retainedScores: number[],
  count: number = ENTRY_NUMBER_COUNT,
  min: number = DRAW_NUMBER_MIN,
  max: number = DRAW_NUMBER_MAX
): number[] {
  if (max - min + 1 < count) {
    throw new Error(`Cannot pick ${count} unique numbers from range [${min}, ${max}]`);
  }

  // Count score frequency
  const scoreFreq = new Map<number, number>();
  for (const s of retainedScores) {
    if (typeof s === 'number' && Number.isInteger(s) && s >= min && s <= max) {
      scoreFreq.set(s, (scoreFreq.get(s) || 0) + 1);
    }
  }

  // Build candidate weights
  const candidates: { num: number; weight: number }[] = [];
  for (let num = min; num <= max; num++) {
    const freq = scoreFreq.get(num) || 0;
    // Base weight 1, each recent score hit adds 3
    const weight = 1 + freq * 3;
    candidates.push({ num, weight });
  }

  const chosen = new Set<number>();

  while (chosen.size < count) {
    // Calculate sum of remaining candidate weights
    const available = candidates.filter((c) => !chosen.has(c.num));
    const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);

    let randomVal = crypto.randomInt(0, totalWeight);
    let picked = available[0].num;

    for (const c of available) {
      if (randomVal < c.weight) {
        picked = c.num;
        break;
      }
      randomVal -= c.weight;
    }

    chosen.add(picked);
  }

  return Array.from(chosen).sort((a, b) => a - b);
}

/**
 * Pure prize pool calculation function.
 * Uses integer minor units (paise) to guarantee zero-leakage precision.
 */
export function calculatePrizePool(
  subscribers: SubscriberPoolInput[],
  carriedRollover: number = 0,
  percentages: PoolSplitPercentages = { threeMatch: 25, fourMatch: 35, fiveMatch: 40 }
): CalculatedPrizePool {
  let totalSubscriberPoolPaise = 0;

  for (const sub of subscribers) {
    // Fee in paise: Monthly = 49900 (₹499), Annual = 41658 (₹4999 / 12)
    const isAnnual = sub.plan === 'annual' || sub.plan === 'yearly';
    const planFeePaise = isAnnual ? Math.round(499900 / 12) : 49900;

    const charityPct = typeof sub.contributionPercentage === 'number' ? sub.contributionPercentage : 10;
    // Bound charity percentage between 10% and 100%
    const boundedPct = Math.max(10, Math.min(100, charityPct));

    const charityAmountPaise = Math.round(planFeePaise * (boundedPct / 100));
    const poolContributionPaise = planFeePaise - charityAmountPaise;

    totalSubscriberPoolPaise += poolContributionPaise;
  }

  // Tier splits from subscriber pool
  const threeMatchPaise = Math.floor(totalSubscriberPoolPaise * (percentages.threeMatch / 100));
  const fourMatchPaise = Math.floor(totalSubscriberPoolPaise * (percentages.fourMatch / 100));
  // Five-match base gets exact remainder so three + four + fiveBase === total
  const fiveMatchBasePaise = totalSubscriberPoolPaise - (threeMatchPaise + fourMatchPaise);

  const carriedRolloverPaise = Math.round(carriedRollover * 100);
  const totalFiveMatchPaise = fiveMatchBasePaise + carriedRolloverPaise;

  return {
    totalPool: totalSubscriberPoolPaise / 100,
    threeMatchPool: threeMatchPaise / 100,
    fourMatchPool: fourMatchPaise / 100,
    fiveMatchPool: totalFiveMatchPaise / 100,
    fiveMatchBase: fiveMatchBasePaise / 100,
    jackpotRollover: carriedRollover,
    subscriberCount: subscribers.length,
  };
}

/**
 * Evaluates ticket matches against drawn numbers, calculates winner allocations,
 * and determines rollover amount.
 */
export function evaluateMatches(
  entries: EntryForEvaluation[],
  drawnNumbers: number[],
  tierPools: { threeMatchPool: number; fourMatchPool: number; fiveMatchPool: number }
): EvaluationResult {
  const drawnSet = new Set(drawnNumbers);

  const threeMatchEntries: EntryForEvaluation[] = [];
  const fourMatchEntries: EntryForEvaluation[] = [];
  const fiveMatchEntries: EntryForEvaluation[] = [];

  for (const entry of entries) {
    let matches = 0;
    for (const n of entry.numbers) {
      if (drawnSet.has(n)) matches++;
    }

    if (matches === 5) {
      fiveMatchEntries.push(entry);
    } else if (matches === 4) {
      fourMatchEntries.push(entry);
    } else if (matches === 3) {
      threeMatchEntries.push(entry);
    }
  }

  // Helper for splitting a tier's pool equally among winners
  const splitTier = (
    tierEntries: EntryForEvaluation[],
    poolAmount: number,
    matchCount: 3 | 4 | 5
  ): EvaluatedWinner[] => {
    if (tierEntries.length === 0 || poolAmount <= 0) {
      return [];
    }

    const poolPaise = Math.round(poolAmount * 100);
    const count = tierEntries.length;
    const baseSharePaise = Math.floor(poolPaise / count);
    const remainderPaise = poolPaise - baseSharePaise * count;

    return tierEntries.map((entry, idx) => {
      // Allocate remainder paise one-by-one to early winners so sum === poolPaise
      const sharePaise = baseSharePaise + (idx < remainderPaise ? 1 : 0);
      return {
        drawEntryId: entry.id,
        userId: entry.userId,
        matchCount,
        prizeAmount: sharePaise / 100,
      };
    });
  };

  const fiveMatchWinners = splitTier(fiveMatchEntries, tierPools.fiveMatchPool, 5);
  const fourMatchWinners = splitTier(fourMatchEntries, tierPools.fourMatchPool, 4);
  const threeMatchWinners = splitTier(threeMatchEntries, tierPools.threeMatchPool, 3);

  // If 0 five-match winners, the entire five-match jackpot rolls over to next draw
  const rolloverToNext = fiveMatchWinners.length === 0 ? tierPools.fiveMatchPool : 0;

  // Combine and assign sequential ranks (1, 2, 3...) satisfying UNIQUE(draw_id, rank)
  let currentRank = 1;
  const allWinners: EvaluatedWinner[] = [];

  for (const w of fiveMatchWinners) {
    w.rank = currentRank++;
    allWinners.push(w);
  }
  for (const w of fourMatchWinners) {
    w.rank = currentRank++;
    allWinners.push(w);
  }
  for (const w of threeMatchWinners) {
    w.rank = currentRank++;
    allWinners.push(w);
  }

  return {
    drawnNumbers,
    threeMatchWinners,
    fourMatchWinners,
    fiveMatchWinners,
    totalWinnersCount: allWinners.length,
    rolloverToNext,
    allWinners,
  };
}
