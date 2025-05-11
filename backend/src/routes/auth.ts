import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hash, compare } from 'bcrypt';
import { Database } from 'sqlite3';
import { User } from '../types.js';
import { onlineUsers } from './ws.js';

const uuidv4 = () => crypto.randomUUID();

export async function authRoutes(fastify: FastifyInstance, db: Database) {
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let name: string | undefined;
      let email: string | undefined;
      let password: string | undefined;
      let avatarBuffer: Buffer | null = null;
      let avatarMime: string | null = null;

      // Process each part of the multipart form data
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          // Handle file upload (avatar)
          avatarBuffer = await part.toBuffer();
          avatarMime = part.mimetype;
        } else if (part.type === 'field' && typeof part.value === 'string') {
          // Handle form fields with type guard
          switch (part.fieldname) {
            case 'name':
              name = part.value;
              break;
            case 'email':
              email = part.value;
              break;
            case 'password':
              password = part.value;
              break;
          }
        }
      }

      fastify.log.info(`[Register Debug] Parsed fields - name: ${name}, email: ${email}, avatar: ${avatarBuffer ? 'present' : 'not present'}`);

    if (!name || !email || !password) {
      reply.code(400);
        return { error: 'Missing required fields' };
      }

      // Password requirements: at least 8 characters, one number, one special character
      const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
      if (!passwordRegex.test(password)) {
        reply.code(400);
        return { error: 'Password must be at least 8 characters, include a number and a special character.' };
      }

      fastify.log.info('[Register Debug] Checking for existing user');
      // Check if user already exists
      const existingUser = await new Promise<User | undefined>((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ? OR name = ?', [email, name], (err: Error | null, row: User | undefined) => {
          if (err) {
            fastify.log.error(`[Register Debug] Database error checking user: ${err.message}`);
            reject(err);
            return;
          }
          fastify.log.info(`[Register Debug] User exists check: ${!!row}`);
          resolve(row);
        });
      });

      if (existingUser) {
        fastify.log.warn(`[Register Debug] User exists - email match: ${existingUser.email === email}, name match: ${existingUser.name === name}`);
        reply.code(400).send({ error: 'User with this email or username already exists' });
        return;
    }

      fastify.log.info('[Register Debug] Hashing password');
      const hashedPassword = await hash(password, fastify.config.BCRYPT_SALT_ROUNDS);
      const now = new Date().toISOString();

      // Insert user with avatar if provided
      fastify.log.info('[Register Debug] Starting user insertion');
      const lastID = await new Promise<number>(async (resolve, reject) => {
        fastify.log.info(`[Register Debug] Attempting database insertion with values - name: ${name}, email: ${email}, hasAvatar: ${!!avatarBuffer}`);
        db.run(
          'INSERT INTO users (name, email, password, wins, losses, tournamentsWon, avatar, avatar_mime) VALUES (?, ?, ?, 0, 0, 0, ?, ?)',
          [name, email, hashedPassword, avatarBuffer, avatarMime],
          function(err: Error | null) {
            if (err) {
              fastify.log.error(`[Register Debug] Database insertion error: ${err.message}`);
              if (err instanceof Error) {
                fastify.log.error(`[Register Debug] Error details - code: ${(err as any).code}, errno: ${(err as any).errno}`);
                fastify.log.error(`[Register Debug] Stack trace: ${err.stack}`);
              }
              reject(err);
              return;
            }
            fastify.log.info(`[Register Debug] Insert successful, lastID: ${this.lastID}`);
            resolve(this.lastID);
          }
        );
      });

      // Get the inserted user to verify
      fastify.log.info('[Register Debug] Verifying inserted user');
      const insertedUser = await new Promise<User | undefined>((resolve, reject) => {
        db.get('SELECT password FROM users WHERE id = ?', [lastID], (err: Error | null, row: User | undefined) => {
          if (err) {
            fastify.log.error('[Register Debug] Error verifying inserted user:', {
              error: err.message,
              code: (err as any).code,
              errno: (err as any).errno,
              stack: err.stack
            });
            reject(err);
            return;
          }
          fastify.log.info('[Register Debug] User verification result:', { exists: !!row });
          resolve(row);
        });
      });

      if (!insertedUser) {
        fastify.log.error('[Register Debug] Failed to verify inserted user');
        reply.code(500).send({ error: 'Failed to create user' });
        return;
      }

      fastify.log.info('[Register Debug] Registration completed successfully');
      reply.code(201).send({ message: 'User created successfully' });
    } catch (err) {
      fastify.log.error('[Register Debug] Registration error:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        type: err instanceof Error ? err.constructor.name : typeof err
      });
      reply.code(500).send({ 
        error: 'Internal server error', 
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  fastify.post<{ Body: { email: string; password: string } }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      reply.code(400);
      return { error: 'Email and password are required' };
    }

    try {
      const user = await new Promise<User | undefined>((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row: User | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      if (!user.password || typeof user.password !== 'string' || !user.password.startsWith('$2b$')) {
        fastify.log.error(`Invalid password hash for user ${email}: ${user.password}`);
        reply.code(401);
        return { error: 'Invalid user credentials' };
      }

      fastify.log.info(`Comparing password for user ${email}`);
      fastify.log.info(`Stored password hash: ${user.password}`);
      let match: boolean;
      try {
        match = await compare(password, user.password);
      } catch (compareErr) {
        fastify.log.error('bcrypt compare error:', compareErr);
        reply.code(500);
        return { error: 'Password verification failed' };
      }
      fastify.log.info(`Password match result: ${match}`);

      if (!match) {
        reply.code(401);
        return { error: 'Incorrect password' };
      }

      // Generate a session token
      const sessionToken = uuidv4();
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

      // Store the session in the database
      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)',
          [sessionToken, user.id, createdAt, expiresAt],
          (err) => {
            if (err) reject(err);
            resolve();
          }
        );
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        wins: user.wins,
        losses: user.losses,
        tournamentsWon: user.tournamentsWon,
        sessionToken
      };
    } catch (err) {
      fastify.log.error('Login error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });

  fastify.post('/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return { error: 'Authorization header with Bearer token is required' };
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const session = await new Promise<{ userId: number } | undefined>((resolve, reject) => {
        db.get('SELECT userId FROM sessions WHERE token = ?', [token], (err, row: { userId: number } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!session) {
        reply.code(401);
        return { error: 'Invalid session' };
      }

      // Remove user from onlineUsers set
      onlineUsers.delete(session.userId);

      await new Promise<void>((resolve, reject) => {
        db.run('DELETE FROM sessions WHERE token = ?', [token], (err) => {
          if (err) reject(err);
          resolve();
        });
      });

      return { message: 'Logged out successfully' };
    } catch (err) {
      fastify.log.error('Logout error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });
}