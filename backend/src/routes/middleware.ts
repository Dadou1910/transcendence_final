import { FastifyInstance } from 'fastify';
import { Database } from 'sqlite3';

export async function sessionMiddleware(fastify: FastifyInstance, db: Database) {
  fastify.decorateRequest('user', null);

  fastify.addHook('preHandler', async (request, reply) => {
    const publicRoutes = ['/register', '/login', '/ws/presence'];
    if (request.url.startsWith('/ws/match/') || 
        (request.url.startsWith('/avatar/') && request.method === 'GET')) {
      return; // Skip session validation for WebSocket match route and GET avatar requests
    }
    if (publicRoutes.some(route => request.url.startsWith(route))) {
      return; // Skip session validation for public routes
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      throw new Error('Authorization header with Bearer token is required');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const session = await new Promise<{ userId: number; expiresAt: string } | undefined>((resolve, reject) => {
        db.get('SELECT userId, expiresAt FROM sessions WHERE token = ?', [token], (err, row: { userId: number; expiresAt: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!session) {
        reply.code(401);
        throw new Error('Invalid or expired session');
      }

      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      if (now > expiresAt) {
        await new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM sessions WHERE token = ?', [token], (err) => {
            if (err) reject(err);
            resolve();
          });
        });
        reply.code(401);
        throw new Error('Session expired');
      }

      const user = await new Promise<{ id: number; name: string; email: string } | undefined>((resolve, reject) => {
        db.get('SELECT id, name, email FROM users WHERE id = ?', [session.userId], (err, row: { id: number; name: string; email: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        reply.code(401);
        throw new Error('User associated with session not found');
      }

      request.user = user;
    } catch (err) {
      fastify.log.error('Session validation error:', err);
      if (!reply.statusCode || reply.statusCode < 400) {
        reply.code(500);
      }
      throw err;
    }
  });
}