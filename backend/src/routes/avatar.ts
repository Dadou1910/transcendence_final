import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Database } from 'sqlite3';
import { User } from '../types';

export async function avatarRoutes(fastify: FastifyInstance, db: Database) {
  // Get user avatar
  fastify.get('/avatar/:identifier', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identifier } = request.params as { identifier: string };
    fastify.log.info(`[Avatar Debug] GET request for identifier: ${identifier}`);
    
    try {
      // Check if identifier is a number (user ID) or string (username)
      const isId = !isNaN(parseInt(identifier));
      const query = isId ? 'SELECT avatar FROM users WHERE id = ?' : 'SELECT avatar FROM users WHERE name = ?';
      const param = isId ? parseInt(identifier) : identifier;
      fastify.log.info(`[Avatar Debug] Query type: ${isId ? 'by ID' : 'by username'}, param: ${param}`);

      const row: User = await new Promise((resolve, reject) => {
        db.get(query, [param], (err: Error | null, row: User) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!row || !row.avatar) {
        fastify.log.info('[Avatar Debug] No avatar found, sending default SVG');
        // If no avatar is found, send a default SVG avatar
        const defaultAvatar = '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="80" r="50" fill="#f4c2c2"/><path d="M30 180c0-40 60-70 140-70s140 30 140 70H30z" fill="#f4c2c2"/></svg>';
        return reply
          .header('Content-Type', 'image/svg+xml')
          .header('Access-Control-Allow-Origin', '*')
          .header('Access-Control-Allow-Methods', 'GET')
          .header('Cross-Origin-Resource-Policy', 'cross-origin')
          .send(defaultAvatar);
      }
      
      fastify.log.info('[Avatar Debug] Avatar found, sending image data');
      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .send(row.avatar);
    } catch (err) {
      fastify.log.error('[Avatar Debug] Error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Upload user avatar
  fastify.post('/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.info('[Avatar Upload] Received avatar upload request');
    
    const user = request.user;
    if (!user) {
        fastify.log.error('[Avatar Upload] No user found in request');
        reply.status(401).send({ error: 'Unauthorized' });
        return;
    }
    fastify.log.info(`[Avatar Upload] Processing upload for user: ${user.name} (ID: ${user.id})`);

    try {
        const data = await request.file();
        if (!data) {
            fastify.log.error('[Avatar Upload] No file received in request');
            reply.status(400).send({ error: 'No file uploaded' });
            return;
        }
        fastify.log.info('[Avatar Upload] File received:', {
            filename: data.filename,
            mimetype: data.mimetype,
            size: data.file.bytesRead
        });

        // Validate file type
        if (!data.mimetype.startsWith('image/')) {
            fastify.log.error(`[Avatar Upload] Invalid file type: ${data.mimetype}`);
            reply.status(400).send({ error: 'Invalid file type. Only images are allowed.' });
            return;
        }

        // Validate file size (2MB limit)
        const MAX_SIZE = 2 * 1024 * 1024;
        if (data.file.bytesRead > MAX_SIZE) {
            fastify.log.error(`[Avatar Upload] File too large: ${data.file.bytesRead} bytes`);
            reply.status(400).send({ error: 'File too large. Maximum size is 2MB.' });
            return;
        }

        const buffer = await data.toBuffer();
        if (!buffer || buffer.length === 0) {
            fastify.log.error('[Avatar Upload] Empty buffer received');
            reply.status(400).send({ error: 'Empty file received' });
            return;
        }
        fastify.log.info(`[Avatar Upload] Buffer created successfully, size: ${buffer.length} bytes`);

        // Save to database
        try {
            await db.run(
                'UPDATE users SET avatar = ?, avatar_mime = ? WHERE id = ?',
                [buffer, data.mimetype, user.id]
            );
            fastify.log.info('[Avatar Upload] Avatar saved successfully to database');
            reply.send({ success: true });
        } catch (dbError) {
            fastify.log.error('[Avatar Upload] Database error:', dbError);
            reply.status(500).send({ error: 'Failed to save avatar' });
        }
    } catch (error) {
        fastify.log.error('[Avatar Upload] Error processing request:', error);
        reply.status(500).send({ error: 'Internal server error' });
    }
  });
} 