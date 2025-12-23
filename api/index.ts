/**
 * Enterprise HR Portal - API Server
 * Express.js Backend with Zod Validation
 * Date: 2025-12-19
 * 
 * Production-ready with security middleware enabled
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
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
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ============================================================================
// PRODUCTION ENVIRONMENT CHECKS
// ============================================================================

if (isProduction) {
  // Verify critical environment variables
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Warn for insecure JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
}

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet - Set secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for hot reload
  crossOriginEmbedderPolicy: false, // Allow embedding PDFs
}));

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Stricter in production
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 10 : 100, // 10 login attempts per 15 min in production
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// HPP - Prevent HTTP Parameter Pollution
app.use(hpp());

// CORS - Configure allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:8082',
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

// ============================================================================
// ROUTES
// ============================================================================

// Public Auth Routes (with stricter rate limiting)
app.use('/api/auth', authLimiter, authRouter);

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
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
  });
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
    message: isProduction ? undefined : err.message
  });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'development'}`);
  if (!isProduction) {
    console.log('   ⚠️  Development mode - security checks relaxed');
  }
});

export default app;
