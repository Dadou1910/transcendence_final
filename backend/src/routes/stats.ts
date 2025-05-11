import { FastifyInstance } from 'fastify';
import { Database } from 'sqlite3';

export async function statsRoutes(fastify: FastifyInstance, db: Database) {
  fastify.post<{ Body: { userId: number; won: boolean } }>('/stats/update', async (request, reply) => {
    const { userId, won } = request.body;

    if (!userId || typeof won !== 'boolean') {
      reply.code(400);
      return { error: 'userId and won (boolean) are required' };
    }

    try {
      // Verify the user exists
      const user = await new Promise<{ id: number } | undefined>((resolve, reject) => {
        db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row: { id: number } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      // Update wins or losses based on the 'won' parameter
      const query = won
        ? 'UPDATE users SET wins = wins + 1 WHERE id = ?'
        : 'UPDATE users SET losses = losses + 1 WHERE id = ?';

      await new Promise<void>((resolve, reject) => {
        db.run(query, [userId], (err) => {
          if (err) reject(err);
          resolve();
        });
      });

      return { status: 'Stats updated' };
    } catch (err) {
      fastify.log.error('Stats update error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });
}