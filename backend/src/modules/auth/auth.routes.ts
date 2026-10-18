// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - AUTHENTICATION ROUTES
// POST /register, POST /login, GET /me
// ============================================================================

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Role } from '../../types/auth';
import { verifyToken } from '../../middleware/auth.middleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-do-not-use-in-production';
const JWT_EXPIRES_IN = '24h';

// In-Memory User Directory (Synced with Prisma schema model User)
interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();

// Seed default platform accounts for rapid testing & orchestration
(async () => {
  const seedAccounts: Array<{ id: string; email: string; pass: string; role: Role }> = [
    {
      id: 'pat-101',
      email: 'patient@teleflow.org',
      pass: 'patient123',
      role: 'PATIENT',
    },
    {
      id: 'doc-ramanathan',
      email: 'clinician@teleflow.org',
      pass: 'clinician123',
      role: 'CLINICIAN',
    },
    {
      id: 'coord-01',
      email: 'coordinator@teleflow.org',
      pass: 'coordinator123',
      role: 'COORDINATOR',
    },
  ];

  for (const acc of seedAccounts) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(acc.pass, salt);
    const user: StoredUser = {
      id: acc.id,
      email: acc.email.toLowerCase(),
      passwordHash,
      role: acc.role,
      createdAt: new Date(),
    };
    usersByEmail.set(user.email, user);
    usersById.set(user.id, user);
  }
})();

/**
 * POST /api/v1/auth/register
 * Registers a new platform user with specified role and returns signed JWT
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, password, and role are required fields.',
        },
      });
      return;
    }

    const validRoles: Role[] = ['PATIENT', 'CLINICIAN', 'COORDINATOR'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: `Role must be one of: ${validRoles.join(', ')}`,
        },
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (usersByEmail.has(normalizedEmail)) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email address already exists.',
        },
      });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 6 characters long.',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newUser: StoredUser = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      role,
      createdAt: new Date(),
    };

    usersByEmail.set(normalizedEmail, newUser);
    usersById.set(newUser.id, newUser);

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(500).json({
      success: false,
      error: { code: 'REGISTRATION_ERROR', message },
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Validates credentials and returns signed JWT ({ userId, role })
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Both email and password are required.',
        },
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = usersByEmail.get(normalizedEmail);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_ERROR', message },
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Protected endpoint to retrieve the active session details
 */
router.get('/me', verifyToken, (req: Request, res: Response): void => {
  const user = usersById.get(req.user!.userId);
  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User record not found.' },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

export default router;
