import cors from 'cors';
import express, { Application } from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';
import routesV1 from './routes/v1';

const app: Application = express();

/**
 * Express Security & Core Middlewares
 */
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled CSP inline restriction for local demo asset compatibility
  })
);
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Prevents large payload Denial of Service (DoS)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply Global API Rate Limiting (100 req / 15 mins)
app.use(globalRateLimiter);

/**
 * Health Check Endpoint
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
 * API v1 Routes (Registered BEFORE static asset serving)
 */
app.use('/api/v1', routesV1);

// Paths to compiled React production bundle and static public fallback
const clientDistPath = path.join(__dirname, '../../client/dist');
const publicPath = path.join(__dirname, '../public');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
} else {
  app.use(express.static(publicPath));
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


