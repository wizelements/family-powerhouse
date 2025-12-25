import { v4 as uuidv4 } from 'uuid';

export function generateIdempotencyKey(prefix: string, ...parts: string[]): string {
  const base = [prefix, ...parts].join('-');
  return `${base}-${uuidv4()}`;
}

export function generateContributionIdempotencyKey(
  poolId: string,
  userId: string
): string {
  return generateIdempotencyKey('contrib', poolId, userId);
}

export function generateWithdrawalIdempotencyKey(
  poolId: string,
  userId: string
): string {
  return generateIdempotencyKey('withdraw', poolId, userId);
}

export function generateLedgerIdempotencyKey(
  type: 'contribution' | 'withdrawal' | 'adjustment',
  referenceId: string
): string {
  return generateIdempotencyKey('ledger', type, referenceId);
}
