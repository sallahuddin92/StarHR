/**
 * Validation Utilities Unit Tests
 * Tests for input validation and data sanitization
 */

import { describe, it, expect } from '@jest/globals';

// ============================================================================
// VALIDATION FUNCTIONS (extracted for testing)
// ============================================================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate employee ID format (e.g., EMP-001)
 */
function isValidEmployeeId(id: string): boolean {
  const idRegex = /^[A-Z]{2,4}-\d{3,6}$/;
  return idRegex.test(id);
}

/**
 * Validate time format (HH:MM)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);

  // Check if the date components match (handles invalid days like Feb 30)
  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day
  );
}

/**
 * Validate Malaysian IC number
 */
function isValidMalaysianIC(ic: string): boolean {
  // Format: YYMMDD-PB-XXXX
  const icRegex = /^\d{6}-\d{2}-\d{4}$/;
  return icRegex.test(ic);
}

/**
 * Validate phone number (Malaysian format)
 */
function isValidPhoneNumber(phone: string): boolean {
  // Malaysian mobile: 01X-XXXXXXX or 01X-XXXXXXXX
  const phoneRegex = /^01[0-9]-\d{7,8}$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize string input (remove XSS vectors)
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Validate password strength
 */
function isStrongPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate numeric range
 */
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should accept valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isValidEmployeeId', () => {
    it('should accept valid ID format EMP-001', () => {
      expect(isValidEmployeeId('EMP-001')).toBe(true);
    });

    it('should accept valid ID format HR-12345', () => {
      expect(isValidEmployeeId('HR-12345')).toBe(true);
    });

    it('should reject lowercase IDs', () => {
      expect(isValidEmployeeId('emp-001')).toBe(false);
    });

    it('should reject IDs without hyphen', () => {
      expect(isValidEmployeeId('EMP001')).toBe(false);
    });
  });

  describe('isValidTimeFormat', () => {
    it('should accept 24-hour format', () => {
      expect(isValidTimeFormat('09:30')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
    });

    it('should reject invalid hours', () => {
      expect(isValidTimeFormat('25:00')).toBe(false);
    });

    it('should reject invalid minutes', () => {
      expect(isValidTimeFormat('12:60')).toBe(false);
    });

    it('should accept single digit hour', () => {
      expect(isValidTimeFormat('9:30')).toBe(true);
    });
  });

  describe('isValidDateFormat', () => {
    it('should accept valid ISO date', () => {
      expect(isValidDateFormat('2024-12-24')).toBe(true);
    });

    it('should reject invalid month', () => {
      expect(isValidDateFormat('2024-13-01')).toBe(false);
    });

    it('should reject invalid day', () => {
      expect(isValidDateFormat('2024-02-30')).toBe(false);
    });

    it('should reject wrong format', () => {
      expect(isValidDateFormat('24-12-2024')).toBe(false);
    });
  });

  describe('isValidMalaysianIC', () => {
    it('should accept valid IC format', () => {
      expect(isValidMalaysianIC('901231-14-5678')).toBe(true);
    });

    it('should reject without hyphens', () => {
      expect(isValidMalaysianIC('901231145678')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should accept valid Malaysian mobile', () => {
      expect(isValidPhoneNumber('012-3456789')).toBe(true);
    });

    it('should accept 8-digit suffix', () => {
      expect(isValidPhoneNumber('011-12345678')).toBe(true);
    });

    it('should reject landline format', () => {
      expect(isValidPhoneNumber('03-12345678')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });
  });

  describe('isStrongPassword', () => {
    it('should accept strong password', () => {
      const result = isStrongPassword('SecurePass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = isStrongPassword('Abc1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should require uppercase', () => {
      const result = isStrongPassword('lowercase123');
      expect(result.errors).toContain('Password must contain uppercase letter');
    });

    it('should require number', () => {
      const result = isStrongPassword('NoNumbers');
      expect(result.errors).toContain('Password must contain a number');
    });
  });

  describe('isInRange', () => {
    it('should return true for value in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
    });

    it('should include boundary values', () => {
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
    });

    it('should return false for value out of range', () => {
      expect(isInRange(15, 1, 10)).toBe(false);
    });
  });
});
