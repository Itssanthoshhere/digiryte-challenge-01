import cors from 'cors';
import express, { Application } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { redisStore } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import routesV1 from './routes/v1';
import { generateUUID } from './utils/crypto';

const app: Application = express();

// Trust reverse proxies (Render, Vercel, AWS ALB, CloudFront) for accurate IP rate limiting
app.set('trust proxy', 1);

// Pino Structured JSON Request Logger & X-Request-ID Tracing
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || generateUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
});

if (env.NODE_ENV !== 'test') {
  app.use(pinoHttp());
}

/**
 * Express Security & Core Middlewares
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", '*'],
      },
    },
  })
);

// Parse CORS_ORIGINS env var into an allowlist array
const allowedOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((o: string) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      // In non-production environments, allow all origins for developer convenience
      if (env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      // Production: strict origin allowlist enforcement
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS policy: Origin '${origin}' is not in the allowed origins list.`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' })); // Prevents large payload Denial of Service (DoS)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply Global API Rate Limiting (100 req / 15 mins)
app.use(globalRateLimiter);

/**
 * Liveness Health Check Endpoint
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Digiryte Secure API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness Health Check Endpoint (Validates Redis & DB availability)
 */
app.get('/health/ready', async (_req, res) => {
  const isRedisOk = redisStore.isRedisConnected();
  const status = isRedisOk || env.NODE_ENV !== 'production' ? 200 : 503;

  res.status(status).json({
    status: isRedisOk ? 'ready' : 'degraded',
    checks: {
      database: 'ok',
      redis: isRedisOk ? 'connected' : env.NODE_ENV === 'production' ? 'disconnected (FAIL_CLOSED)' : 'in_memory_fallback',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * OpenAPI 3.0 Documentation Endpoint
 */
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Digiryte Secure REST API',
    version: '1.0.0',
    description: 'Enterprise REST API featuring Dual-Token JWT, Redis Revocation, RBAC, and HMAC Anti-Replay defenses.',
  },
  paths: {
    '/health': { get: { summary: 'Liveness check', responses: { '200': { description: 'OK' } } } },
    '/health/ready': { get: { summary: 'Readiness check', responses: { '200': { description: 'Ready' } } } },
    '/api/v1/auth/register': { post: { summary: 'Register user' } },
    '/api/v1/auth/login': { post: { summary: 'Authenticate user' } },
    '/api/v1/auth/refresh': { post: { summary: 'Refresh tokens with rotation' } },
    '/api/v1/assets': { get: { summary: 'List assets (RBAC)' }, post: { summary: 'Create asset' } },
    '/api/v1/transactions/transfer': { post: { summary: 'Execute HMAC Anti-Replay money transfer' } },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

/**
 * API v1 Routes (Registered BEFORE static asset serving)
 */
app.use('/api/v1', routesV1);

// Paths to compiled React production bundle (supports monorepo, Vercel, Render)
const possibleClientDistPaths = [
  path.join(__dirname, '../../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist'),
];

const resolvedClientDistPath = possibleClientDistPaths.find((p) => fs.existsSync(p));
const clientDistPath = resolvedClientDistPath || path.join(__dirname, '../public');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

/**
 * Catch-All SPA Fallback / 404 Route Handler
 */
app.use('*', (req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (req.accepts('html') && fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: 'The requested API route or resource was not found.',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Centralized Error Handling Middleware
 */
app.use(errorHandler);

export default app;


