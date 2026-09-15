import { describe, it, expect } from 'vitest';
import { validateEmail, validateRollNumber, validatePassword, sanitizeString } from './validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('returns true for valid email addresses', () => {
      expect(validateEmail('student@siet.ac.in')).toBe(true);
      expect(validateEmail('user.name@example.com')).toBe(true);
    });

    it('returns false for invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
    });
  });

  describe('validateRollNumber', () => {
    it('returns true for valid roll numbers', () => {
      expect(validateRollNumber('7377211CS101')).toBe(true);
      expect(validateRollNumber('21CSE001')).toBe(true);
    });

    it('returns false for empty or overly short roll numbers', () => {
      expect(validateRollNumber('')).toBe(false);
      expect(validateRollNumber('AB')).toBe(false);
      expect(validateRollNumber(null)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('validates password length >= 6', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('trims whitespace and handles invalid inputs safely', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });
});
