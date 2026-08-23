/**
 * SmartBlood AI - Matching Weights Configuration
 * Deterministic scoring weights (sum = 1.0)
 */

export const MATCH_WEIGHTS = {
  compatibility: 0.50,
  availability: 0.20,
  distance: 0.20,
  priority: 0.10
};

export const MAX_DISTANCE_KM = 30.0; // Distance cutoff for 0 distance score

export const URGENCY_SCORES = {
  CRITICAL: 100,
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
};
