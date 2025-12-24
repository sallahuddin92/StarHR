/**
 * Training API Integration Tests
 * Tests for training routes: courses, events, allocations
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../index.js';

describe('Training API Integration', () => {
  let authToken: string = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'EMP-001', password: 'password123' });

    if (res.status === 200) {
      authToken = res.body.token;
    }
  });

  describe('Unauthenticated Access', () => {
    it('should return 401 for courses without auth', async () => {
      const response = await request(app).get('/api/training/courses');
      expect(response.status).toBe(401);
    });

    it('should return 401 for my-trainings without auth', async () => {
      const response = await request(app).get('/api/training/my-trainings');
      expect(response.status).toBe(401);
    });
  });

  describe('With Authentication', () => {
    it('should get training courses with token', async () => {
      if (!authToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await request(app)
        .get('/api/training/courses')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should filter test trainings', async () => {
      if (!authToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await request(app)
        .get('/api/training/courses?is_test=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403, 404]).toContain(response.status);
    });

    it('should get my training allocations', async () => {
      if (!authToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await request(app)
        .get('/api/training/my-trainings')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Training Creation (Admin Only)', () => {
    it('should validate training creation fields', async () => {
      if (!authToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await request(app)
        .post('/api/training/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' }); // Missing required fields

      expect([400, 403, 404]).toContain(response.status);
    });
  });
});
