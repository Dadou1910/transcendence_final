import { FastifyInstance } from 'fastify';
import { Database } from 'sqlite3';
import { User, Match, UserSettings } from '../types.js';
import { compare, hash } from 'bcrypt';
import { isUserOnline } from './ws.js';

export async function profileRoutes(fastify: FastifyInstance, db: Database) {
  fastify.get<{ Params: { id: string } }>('/profile/:id', async (request: any, reply: any) => {
    const { id } = request.params;

    try {
      const isId = !isNaN(parseInt(id));
      let user: User | undefined;
      if (isId) {
        user = await new Promise<User | undefined>((resolve, reject) => {
          db.get('SELECT id, name, email, wins, losses, tournamentsWon FROM users WHERE id = ?', [parseInt(id)], (err: Error | null, row: User | undefined) => {
            if (err) reject(err);
            resolve(row);
          });
        });
      } else {
        user = await new Promise<User | undefined>((resolve, reject) => {
          db.get('SELECT id, name, email, wins, losses, tournamentsWon FROM users WHERE name = ?', [id], (err: Error | null, row: User | undefined) => {
            if (err) reject(err);
            resolve(row);
          });
        });
      }

      if (!user) {
        reply.code(404);
        return { error: 'User not found' };
      }

      const matches = await new Promise<Match[]>((resolve, reject) => {
        db.all('SELECT * FROM matches WHERE userId = ? OR opponentId = ?', [user.id, user.id], (err: Error | null, rows: Match[]) => {
          if (err) reject(err);
          resolve(rows || []);
        });
      });

      const settings = await new Promise<UserSettings | undefined>((resolve, reject) => {
        db.get('SELECT backgroundColor, ballSpeed FROM user_settings WHERE userId = ?', [user.id], (err: Error | null, row: UserSettings | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      // Fetch friends for the viewed user (with online status)
      const friends = await new Promise<{ id: number, name: string }[]>((resolve, reject) => {
        db.all(
          `SELECT users.id, users.name FROM friends 
           JOIN users ON friends.friendId = users.id 
           WHERE friends.userId = ?`,
          [user.id],
          (err: Error | null, rows: unknown[] | undefined) => {
            if (err) return reject(err);
            resolve((rows as { id: number, name: string }[]) || []);
          }
        );
      });
      const friendsWithStatus = friends.map(friend => ({
        ...friend,
        online: isUserOnline(friend.id)
      }));

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          wins: user.wins,
          losses: user.losses,
          tournamentsWon: user.tournamentsWon
        },
        matches,
        settings: settings || {},
        friends: friendsWithStatus,
      };
    } catch (err) {
      fastify.log.error('Profile fetch error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });

  fastify.get('/profile/me', async (request: any, reply: any) => {
    try {
      const user = request.user;
      const matches = await new Promise<Match[]>((resolve, reject) => {
        db.all(
          `SELECT * FROM matches 
           WHERE userId = ? OR opponentId = ? OR userName = ? OR opponentName = ?
           ORDER BY date DESC`,
          [user.id, user.id, user.name, user.name],
          (err: Error | null, rows: Match[]) => {
            if (err) reject(err);
            resolve(rows || []);
          }
        );
      });

      const settings = await new Promise<UserSettings | undefined>((resolve, reject) => {
        db.get('SELECT backgroundColor, ballSpeed FROM user_settings WHERE userId = ?', [user.id], (err: Error | null, row: UserSettings | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      // Get the full user data including stats
      const fullUserData = await new Promise<User | undefined>((resolve, reject) => {
        db.get('SELECT id, name, email, wins, losses, tournamentsWon FROM users WHERE id = ?', [user.id], (err: Error | null, row: User | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!fullUserData) {
        reply.code(404);
        return { error: 'User not found' };
      }

      // Get the user's friends
      const friends = await new Promise<{ id: number, name: string }[]>((resolve, reject) => {
        db.all(
          `SELECT users.id, users.name FROM friends 
           JOIN users ON friends.friendId = users.id 
           WHERE friends.userId = ?`,
          [user.id],
          (err: Error | null, rows: unknown[] | undefined) => {
            if (err) return reject(err);
            resolve((rows as { id: number, name: string }[]) || []);
          }
        );
      });

      // Add online status to friends
      const friendsWithStatus = friends.map(friend => ({
        ...friend,
        online: isUserOnline(friend.id)
      }));

      return {
        user: {
          id: fullUserData.id,
          name: fullUserData.name,
          email: fullUserData.email,
          wins: fullUserData.wins,
          losses: fullUserData.losses,
          tournamentsWon: fullUserData.tournamentsWon
        },
        matches,
        settings: settings || {},
        friends: friendsWithStatus,
      };
    } catch (err) {
      fastify.log.error('Current user profile fetch error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });

  fastify.post<{
    Body: {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  }>('/profile/update', async (request: any, reply: any) => {
    const user = request.user;
    if (!user) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    const { username, email, currentPassword, newPassword } = request.body;

    try {
      await new Promise<void>((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err: Error | null) => {
          if (err) reject(err);
          resolve();
        });
      });

      if (currentPassword && newPassword) {
        const userWithPassword = await new Promise<User | undefined>((resolve, reject) => {
          db.get('SELECT password FROM users WHERE id = ?', [user.id], (err: Error | null, row: User | undefined) => {
            if (err) reject(err);
            resolve(row);
          });
        });

        if (!userWithPassword) {
          throw new Error('User not found');
        }

        const isPasswordValid = await compare(currentPassword, userWithPassword.password);
        if (!isPasswordValid) {
          throw new Error('Current password is incorrect');
        }

        // Password requirements: at least 8 characters, one number, one special character
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
          throw new Error('New password must be at least 8 characters, include a number and a special character.');
        }

        const hashedPassword = await hash(newPassword, fastify.config.BCRYPT_SALT_ROUNDS);
        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });
      }

      if (username && username !== user.name) {
        const existingUser = await new Promise<User | undefined>((resolve, reject) => {
          db.get('SELECT id FROM users WHERE name = ? AND id != ?', [username, user.id], (err: Error | null, row: User | undefined) => {
            if (err) reject(err);
            resolve(row);
          });
        });

        if (existingUser) {
          throw new Error('Username already taken');
        }

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE users SET name = ? WHERE id = ?', [username, user.id], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE matches SET userName = ? WHERE userId = ?', [username, user.id], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE matches SET opponentName = ? WHERE opponentId = ?', [username, user.id], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE tournament_players SET username = ? WHERE username = ?', [username, user.name], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE tournament_matches SET player1 = ? WHERE player1 = ?', [username, user.name], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE tournament_matches SET player2 = ? WHERE player2 = ?', [username, user.name], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE tournament_matches SET winner = ? WHERE winner = ?', [username, user.name], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });
      }

      if (email && email !== user.email) {
        if (!email.includes('@')) {
          throw new Error('Invalid email format');
        }

        const existingUser = await new Promise<User | undefined>((resolve, reject) => {
          db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id], (err: Error | null, row: User | undefined) => {
            if (err) reject(err);
            resolve(row);
          });
        });

        if (existingUser) {
          throw new Error('Email already taken');
        }

        await new Promise<void>((resolve, reject) => {
          db.run('UPDATE users SET email = ? WHERE id = ?', [email, user.id], (err: Error | null) => {
            if (err) reject(err);
            resolve();
          });
        });
      }

      await new Promise<void>((resolve, reject) => {
        db.run('COMMIT', (err: Error | null) => {
          if (err) reject(err);
          resolve();
        });
      });

      return { 
        status: 'Profile updated successfully',
        user: {
          ...user,
          name: username || user.name,
          email: email || user.email
        }
      };

    } catch (err) {
      await new Promise<void>((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });

      fastify.log.error('Profile update error:', err);
      reply.code(400);
      return { error: err instanceof Error ? err.message : 'Failed to update profile' };
    }
  });

  fastify.get('/users/search', async (request: any, reply: any) => {
    const { name } = request.query as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      reply.code(400);
      return { error: 'Name query parameter is required' };
    }
    try {
      const user = await new Promise<{ id: number, name: string } | undefined>((resolve, reject) => {
        db.get('SELECT id, name FROM users WHERE name = ?', [name], (err: Error | null, row: { id: number, name: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      if (!user) {
        return { user: null };
      }
      return { user };
    } catch (err) {
      fastify.log.error('User search error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });

  fastify.post<{ Body: { friendId: number } }>('/friends/add', async (request: any, reply: any) => {
    const user = request.user;
    const { friendId } = request.body;
    if (!user || !friendId) {
      reply.code(400);
      return { error: 'friendId is required' };
    }
    if (user.id === friendId) {
      reply.code(400);
      return { error: 'Cannot add yourself as a friend' };
    }
    try {
      // Check if friend exists
      const friend = await new Promise<{ id: number } | undefined>((resolve, reject) => {
        db.get('SELECT id FROM users WHERE id = ?', [friendId], (err: Error | null, row: { id: number } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });
      if (!friend) {
        reply.code(404);
        return { error: 'Friend not found' };
      }
      // Check if already friends
      const alreadyFriends = await new Promise<{ count: number }>((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM friends WHERE userId = ? AND friendId = ?', [user.id, friendId], (err: Error | null, row: { count: number }) => {
          if (err) reject(err);
          resolve(row as { count: number });
        });
      });
      if (alreadyFriends.count > 0) {
        return { status: 'Already friends' };
      }
      // Check max friends for both users
      const userFriendCount = await new Promise<{ count: number }>((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM friends WHERE userId = ?', [user.id], (err: Error | null, row: { count: number }) => {
          if (err) reject(err);
          resolve(row as { count: number });
        });
      });
      const friendFriendCount = await new Promise<{ count: number }>((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM friends WHERE userId = ?', [friendId], (err: Error | null, row: { count: number }) => {
          if (err) reject(err);
          resolve(row as { count: number });
        });
      });
      if (userFriendCount.count >= 20 || friendFriendCount.count >= 20) {
        reply.code(400);
        return { error: 'One of the users already has 20 friends' };
      }
      // Add mutual friendship
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO friends (userId, friendId) VALUES (?, ?)', [user.id, friendId], (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      await new Promise<void>((resolve, reject) => {
        db.run('INSERT INTO friends (userId, friendId) VALUES (?, ?)', [friendId, user.id], (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
      return { status: 'Friend added' };
    } catch (err) {
      fastify.log.error('Add friend error:', err);
      reply.code(500);
      return { error: 'Server error' };
    }
  });
}