import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { signAuthToken, UserRole } from '../middleware/auth';

const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
});

type LoginInput = z.infer<typeof LoginSchema>;

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
    }

    const { identifier, password } = parseResult.data as LoginInput;

    const userResult = await query<{ id: string; tenant_id: string; email: string; employee_id: string }>(
      `SELECT id, tenant_id, email, employee_id
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

    const expectedPassword = process.env.MOCK_PASSWORD || 'password123';
    if (password !== expectedPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role: UserRole = (process.env.DEFAULT_ROLE as UserRole) || 'WORKER';

    const token = signAuthToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role,
    });

    return res.json({
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

export default authRouter;
