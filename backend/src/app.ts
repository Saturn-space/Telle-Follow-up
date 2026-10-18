// ============================================================================
// TELE-FOLLOW-UP ORCHESTRATOR - EXPRESS APPLICATION ROUTER
// Central API Gateway with JWT Verification and RBAC Protection
// ============================================================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { verifyToken, requireRole } from './middleware/auth.middleware';

// Import Route Handlers for Central Auth and the 5 Vertical Slices
import authRoutes from './modules/auth/auth.routes';
import patientRoutes from './modules/patients/patient.routes';
import riskRoutes from './modules/risk/risk.routes';
import providerRoutes from './modules/providers/provider.routes';
import travelRoutes from './modules/travel/travel.routes';
import followupRoutes from './modules/followup/followup.routes';
import paymentRoutes from './modules/payments/payment.routes';

const app: Express = express();

// ----------------------------------------------------------------------------
// GLOBAL MIDDLEWARES
// ----------------------------------------------------------------------------
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-user-role', 'x-user-id'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------------------------
// HEALTH CHECK
// ----------------------------------------------------------------------------
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'tele-follow-up-orchestrator-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------------------------------
// API V1 ROUTE MOUNTING & RBAC ENFORCEMENT
// ----------------------------------------------------------------------------

// 1. Central Auth Layer (Public endpoints: /register, /login)
app.use('/api/v1/auth', authRoutes);

// 2. Module 1: Patient Registration & Recovery Monitoring
// Protected: PATIENT, CLINICIAN, COORDINATOR
app.use(
  '/api/v1/patients',
  verifyToken,
  requireRole(['PATIENT', 'CLINICIAN', 'COORDINATOR']),
  patientRoutes
);

// 3. Module 2: AI Risk Prediction & Clinical Decision Support
// Strictly protected: Restricted to CLINICIAN role
app.use(
  '/api/v1/risk-assessments',
  verifyToken,
  requireRole(['CLINICIAN']),
  riskRoutes
);

// 4. Module 3: Local Healthcare Discovery & Directory
// Protected: CLINICIAN, COORDINATOR, PATIENT
app.use(
  '/api/v1/providers',
  verifyToken,
  requireRole(['CLINICIAN', 'COORDINATOR', 'PATIENT']),
  providerRoutes
);

// 5. Module 4: Travel Optimization & Escalation
// Protected: CLINICIAN, COORDINATOR
app.use(
  '/api/v1/travel',
  verifyToken,
  requireRole(['CLINICIAN', 'COORDINATOR']),
  travelRoutes
);

// 6. Module 5: Follow-Up Plans, Appointments & Orchestration
// Protected: CLINICIAN, COORDINATOR, PATIENT
app.use(
  '/api/v1/follow-ups',
  verifyToken,
  requireRole(['CLINICIAN', 'COORDINATOR', 'PATIENT']),
  followupRoutes
);

// 7. Payment Gateway Integration: Razorpay (INR Only)
app.use('/api/v1/payments', paymentRoutes);

// ----------------------------------------------------------------------------
// ERROR & 404 HANDLERS
// ----------------------------------------------------------------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
    },
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[UNHANDLED_ERROR]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message,
    },
  });
});

export default app;
