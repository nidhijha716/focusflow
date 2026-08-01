/**
 * Stub for the challenge/streak feature domain logic, kept as an
 * architectural placeholder per the suggested source structure
 * (02_Technical_Architecture §8). Concrete rules depend on feature scope
 * not yet finalized.
 */
export interface ChallengeService {
  isEnabled: () => boolean;
}

export const challengeService: ChallengeService = {
  isEnabled: () => false,
};
