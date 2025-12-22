import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { query } from '../lib/db';
import { signAuthToken, UserRole } from '../middleware/auth';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SALT_ROUNDS = 10;
const DEV_FALLBACK_PASSWORD = process.env.NODE_ENV === 'production'
  ? undefined
  : (process.env.DEV_PASSWORD || 'password123');

// ============================================================================
// SCHEMAS
// ============================================================================

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Employee ID or email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginInput = z.infer<typeof LoginSchema>;

// ============================================================================
// ROUTER
// ============================================================================

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Authenticate user with employee ID/email and password
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate input
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.format()
      });
    }

    const { identifier, password } = parseResult.data as LoginInput;

    // Query user with password_hash and role
    const userResult = await query<{
      id: string;
      tenant_id: string;
      email: string;
      employee_id: string;
      password_hash: string | null;
      role: string | null;
    }>(
      `SELECT id, tenant_id, email, employee_id, password_hash, role
       FROM employee_master
       WHERE (employee_id = $1 OR email = $1)
         AND is_active = true
       LIMIT 1`,
      [identifier]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Password verification
    let isValidPassword = false;

    if (user.password_hash) {
      // Production: Use bcrypt to verify hashed password
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else if (DEV_FALLBACK_PASSWORD) {
      // Development: Allow fallback password for seeded users without hash
      isValidPassword = password === DEV_FALLBACK_PASSWORD;
      console.warn(`⚠️ Using development fallback password for ${identifier}`);
    } else {
      // Production without password_hash: Deny access
      console.error(`User ${identifier} has no password_hash in production`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Determine user role
    const role: UserRole = (user.role as UserRole) ||
      (process.env.DEFAULT_ROLE as UserRole) ||
      'WORKER';

    // Generate JWT token
    const token = signAuthToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        identifier: user.employee_id || user.email,
        role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/auth/hash-password
 * Utility endpoint to generate bcrypt hash (dev/admin only)
 */
authRouter.post('/hash-password', async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Forbidden in production' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return res.json({
      success: true,
      hash,
      usage: `UPDATE employee_master SET password_hash = '${hash}' WHERE employee_id = 'EMP001';`
    });
  } catch (err) {
    console.error('Hash error:', err);
    return res.status(500).json({ error: 'Failed to hash password' });
  }
});

export default authRouter;
