/**
 * Jest Test Setup
 * Runs before each test file
 */

import { jest } from '@jest/globals';

// Extend expect with custom matchers if needed
// import '@testing-library/jest-dom';

// Set default timeout for async tests
jest.setTimeout(30000);

// Mock console.log during tests to reduce noise
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
// };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DEV_FALLBACK_PASSWORD = 'true';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
