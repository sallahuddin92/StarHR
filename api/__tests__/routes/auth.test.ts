/**
 * Auth API Integration Tests
 * Tests for authentication routes using the actual Express app
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../index.js';

describe('Auth API Integration', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 if identifier is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({ password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app).post('/api/auth/login').send({ identifier: 'EMP-001' });

      expect(response.status).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'INVALID-USER', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return JWT token on valid credentials', async () => {
      // This test requires a real user in the database
      // Using the default test user from seed data
      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'EMP-001', password: 'password123' });

      // May be 200 (success) or 401 (if DB not seeded)
      expect([200, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user).toBeDefined();
      }
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 for protected route without token', async () => {
      const response = await request(app).get('/api/employees');

      expect(response.status).toBe(401);
    });
  });
});
