import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyEnv from './config';
import { initializeDatabase } from './database.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { settingsRoutes } from './routes/settings.js';
import { matchRoutes } from './routes/match.js';
import { tournamentRoutes } from './routes/tournament.js';
import { statsRoutes } from './routes/stats.js';
import { matchmakingRoutes } from './routes/matchmaking.js';
import { sessionMiddleware } from './routes/middleware.js';
import { wsRoutes } from './routes/ws.js';
import { avatarRoutes } from './routes/avatar.js';
import fs from 'fs';
import path from 'path';
import { Database } from 'sqlite3';

async function buildServer() {
  const fastify: FastifyInstance = Fastify({ 
    logger: true,
    https: {
      key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
    }
  });

  await fastify.register(fastifyEnv);

  // Create HTTP server for redirection if HTTPS_ONLY is true
  if (fastify.config.HTTPS_ONLY) {
    const httpServer = Fastify({ logger: true });
    httpServer.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
      const httpsUrl = `https://${request.hostname}${request.url}`;
      reply.redirect(301, httpsUrl);
    });
    await httpServer.listen({ port: 80, host: '0.0.0.0' });
  }

  await fastify.register(cors, { 
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 2 * 1024 * 1024 // 2MB
    }
  });

  const db = await initializeDatabase(fastify);

  await sessionMiddleware(fastify, db);

  // Register routes
  await authRoutes(fastify, db);
  await profileRoutes(fastify, db);
  await settingsRoutes(fastify, db);
  await matchRoutes(fastify, db);
  await tournamentRoutes(fastify, db);
  await statsRoutes(fastify, db);
  await matchmakingRoutes(fastify);
  await wsRoutes(fastify, db);
  await avatarRoutes(fastify, db);

  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return { status: 'Server is running' };
  });

  fastify.addHook('onClose', (instance: FastifyInstance, done: (err?: Error) => void) => {
    db.close((err) => {
      if (err) {
        fastify.log.error('Error closing database:', err);
      }
      done();
    });
  });

  const port = fastify.config.PORT;
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`Server listening on ${port}`);
}

buildServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});