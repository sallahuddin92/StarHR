/**
 * Enterprise HR Portal - API Server
 * Express.js Backend with Zod Validation
 * Date: 2025-12-19
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { attendanceRouter } from './routes/attendance';
import { payrollRouter } from './routes/payroll';
import { ewaRouter } from './routes/ewa';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/attendance', attendanceRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/ewa', ewaRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});

export default app;
