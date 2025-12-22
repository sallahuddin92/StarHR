/**
 * Enterprise HR Portal - API Server
 * Express.js Backend with Zod Validation
 * Date: 2025-12-19
 * 
 * Security packages to install: helmet, express-rate-limit, hpp
 * Run: docker-compose up -d --build api
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// TODO: Uncomment after running `npm install` with new packages
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import hpp from 'hpp';
import { attendanceRouter } from './routes/attendance';
import { payrollRouter } from './routes/payroll';
import { ewaRouter } from './routes/ewa';
import { employeesRouter } from './routes/employees';
import { statsRouter } from './routes/stats';
import { approvalsRouter } from './routes/approvals';
import { documentsRouter } from './routes/documents';
import authRouter from './routes/auth';
import { authenticateToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// SECURITY MIDDLEWARE (Basic - upgrade after installing security packages)
// ============================================================================

// CORS - Configure allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser with size limit (prevent large payload attacks)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================================================
// REQUEST LOGGING
// ============================================================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Public Auth Routes
app.use('/api/auth', authRouter);

// Protected Routes
app.use('/api/attendance', authenticateToken, attendanceRouter);
app.use('/api/payroll', authenticateToken, payrollRouter);
app.use('/api/ewa', authenticateToken, ewaRouter);
app.use('/api/employees', authenticateToken, employeesRouter);
app.use('/api/stats', authenticateToken, statsRouter);
app.use('/api/approvals', authenticateToken, approvalsRouter);
app.use('/api/documents', authenticateToken, documentsRouter);

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
