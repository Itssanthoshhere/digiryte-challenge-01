import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`Digiryte Secure REST API server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`\n⚠️ Received ${signal}. Shutting down server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
