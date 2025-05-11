import { FastifyInstance } from 'fastify';
import { Database } from 'sqlite3';
import { UserSettings } from '../types';

export async function settingsRoutes(fastify: FastifyInstance, db: Database) {
  // Get user settings
  fastify.get('/settings', async (request, reply) => {
    const user = request.user;
    if (!user) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    try {
      const settings = await new Promise<UserSettings | undefined>((resolve, reject) => {
        db.get('SELECT backgroundColor, ballSpeed FROM user_settings WHERE userId = ?', [user.id], (err, row: UserSettings | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      return settings || { backgroundColor: '#d8a8b5', ballSpeed: 1.0 };
    } catch (err) {
      fastify.log.error('Settings fetch error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });

  // Update user settings
  fastify.post<{ Body: Partial<UserSettings> }>('/settings', async (request, reply) => {
    const user = request.user;
    if (!user) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const { backgroundColor, ballSpeed } = request.body;
    const updatedAt = new Date().toISOString();

    try {
      // Check if settings exist
      const existingSettings = await new Promise<UserSettings | undefined>((resolve, reject) => {
        db.get('SELECT * FROM user_settings WHERE userId = ?', [user.id], (err, row: UserSettings | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (existingSettings) {
        // Update existing settings
        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE user_settings SET backgroundColor = ?, ballSpeed = ?, updatedAt = ? WHERE userId = ?',
            [backgroundColor, ballSpeed, updatedAt, user.id],
            (err) => {
              if (err) reject(err);
              resolve();
            }
          );
        });
      } else {
        // Insert new settings
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT INTO user_settings (userId, backgroundColor, ballSpeed, updatedAt) VALUES (?, ?, ?, ?)',
            [user.id, backgroundColor, ballSpeed, updatedAt],
            (err) => {
              if (err) reject(err);
              resolve();
            }
          );
        });
      }

      return { status: 'Settings updated' };
    } catch (err) {
      fastify.log.error('Settings update error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });
} 