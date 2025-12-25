import { describe, it, expect } from 'vitest';
import {
  signUpSchema,
  signInSchema,
  createPoolSchema,
  withdrawalRequestSchema,
  createTripSchema,
} from '@/lib/validation/schemas';

describe('Validation Schemas', () => {
  describe('signUpSchema', () => {
    it('accepts valid input', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePass123',
        name: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = signUpSchema.safeParse({
        email: 'invalid-email',
        password: 'SecurePass123',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'securepass123',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without number', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePassword',
        name: 'John Doe',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    it('accepts valid input', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createPoolSchema', () => {
    it('accepts valid pool', () => {
      const result = createPoolSchema.safeParse({
        name: 'Summer Vacation Fund',
        type: 'TRIP',
        targetAmount: 5000,
        description: 'Save for our summer trip',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative target amount', () => {
      const result = createPoolSchema.safeParse({
        name: 'Test Pool',
        type: 'TRIP',
        targetAmount: -100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid pool type', () => {
      const result = createPoolSchema.safeParse({
        name: 'Test Pool',
        type: 'INVALID',
        targetAmount: 1000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects amount over 1 million', () => {
      const result = createPoolSchema.safeParse({
        name: 'Test Pool',
        type: 'CUSTOM',
        targetAmount: 1000001,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('withdrawalRequestSchema', () => {
    it('accepts valid withdrawal', () => {
      const result = withdrawalRequestSchema.safeParse({
        poolId: 'clxxxxxxxxxxxxxxxxxxxxxxxxxx',
        amount: 500,
        reason: 'Need funds for booking',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty reason', () => {
      const result = withdrawalRequestSchema.safeParse({
        poolId: 'clxxxxxxxxxxxxxxxxxxxxxxxxxx',
        amount: 500,
        reason: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createTripSchema', () => {
    it('accepts valid trip', () => {
      const result = createTripSchema.safeParse({
        name: 'Beach Vacation',
        destination: 'Hawaii',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-10'),
      });
      expect(result.success).toBe(true);
    });

    it('rejects end date before start date', () => {
      const result = createTripSchema.safeParse({
        name: 'Beach Vacation',
        destination: 'Hawaii',
        startDate: new Date('2025-06-10'),
        endDate: new Date('2025-06-01'),
      });
      expect(result.success).toBe(false);
    });
  });
});
