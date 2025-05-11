import { FastifyInstance } from 'fastify';
import websocket, { SocketStream } from '@fastify/websocket';
import { Database } from 'sqlite3';

interface MatchClient {
  socket: SocketStream;
  name: string;
  userId: number;
  ready: boolean;
  lastPing: number;
}

interface MatchClients {
  [matchId: string]: {
    host?: MatchClient;
    guest?: MatchClient;
    gameState?: any;
  };
}

// Global set to track online user IDs
export const onlineUsers = new Set<number>();

// Exported function to check if a user is online
export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

// Track active presence connections
const presenceConnections = new Map<number, SocketStream>();

const matchClients: MatchClients = {};

export async function wsRoutes(fastify: FastifyInstance, db: Database) {
  // Register the websocket plugin if not already
  if (!fastify.hasDecorator('websocketServer')) {
    await fastify.register(websocket);
  }

  fastify.get('/ws/match/:matchId', { websocket: true }, async (connection: SocketStream, req) => {
    const { matchId } = req.params as { matchId: string };

    // Extract token from query parameters
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      fastify.log.error('WebSocket connection attempt without token');
      connection.socket.close();
      return;
    }

    try {
      // Validate the token
      const session = await new Promise<{ userId: number; expiresAt: string } | undefined>((resolve, reject) => {
        db.get('SELECT userId, expiresAt FROM sessions WHERE token = ?', [token], (err, row: { userId: number; expiresAt: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!session) {
        fastify.log.error('Invalid session token in WebSocket connection');
        connection.socket.close();
        return;
      }

      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      if (now > expiresAt) {
        fastify.log.error('Expired session token in WebSocket connection');
        connection.socket.close();
        return;
      }

      // Get user info
      const user = await new Promise<{ id: number; name: string } | undefined>((resolve, reject) => {
        db.get('SELECT id, name FROM users WHERE id = ?', [session.userId], (err, row: { id: number; name: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        fastify.log.error('User not found');
        connection.socket.close();
        return;
      }

      // Mark user as online
      onlineUsers.add(user.id);

      // Initialize match if needed
      if (!matchClients[matchId]) {
        matchClients[matchId] = {};
      }

      // Check for existing connection and handle reconnection
      const existingConnection = Object.values(matchClients[matchId]).find(
        client => client?.userId === user.id
      );

      if (existingConnection) {
        // Close old connection
        if (existingConnection.socket.socket.readyState === 1) {
          existingConnection.socket.socket.close();
        }
      }

      // Determine role (host or guest)
      const isHost = !matchClients[matchId].host || matchClients[matchId].host?.userId === user.id;
      const client: MatchClient = {
        socket: connection,
        name: user.name,
        userId: user.id,
        ready: false,
        lastPing: Date.now()
      };

      if (isHost) {
        matchClients[matchId].host = client;
      } else if (!matchClients[matchId].guest || matchClients[matchId].guest?.userId === user.id) {
        matchClients[matchId].guest = client;
      } else {
        fastify.log.error('Match is full');
        connection.socket.close();
        return;
      }

      // Send role assignment and game state if reconnecting
      const opponent = isHost ? matchClients[matchId].guest : matchClients[matchId].host;
      const message: any = {
        type: 'assign',
        host: isHost,
        opponentName: opponent?.name,
        reconnecting: !!existingConnection
      };

      if (existingConnection && matchClients[matchId].gameState) {
        message.gameState = matchClients[matchId].gameState;
      }

      fastify.log.info(`Sending role assignment to ${user.name}:`, message);
      connection.socket.send(JSON.stringify(message));

      // If guest just joined or reconnected, notify host
      if (!isHost && matchClients[matchId].host) {
        fastify.log.info(`Notifying host (${matchClients[matchId].host.name}) about guest (${user.name})`);
        matchClients[matchId].host.socket.socket.send(JSON.stringify({
          type: 'opponent',
          name: user.name,
          reconnecting: !!existingConnection
        }));
      }

      // Start ping interval
      const pingInterval = setInterval(() => {
        if (connection.socket.readyState === 1) {
          connection.socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30 * 1000);

      connection.socket.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          fastify.log.info(`Received message from ${user.name}:`, data);

          // Handle pong
          if (data.type === 'pong') {
            if (isHost && matchClients[matchId].host) {
              matchClients[matchId].host.lastPing = Date.now();
            } else if (!isHost && matchClients[matchId].guest) {
              matchClients[matchId].guest.lastPing = Date.now();
            }
            return;
          }
          
          // Handle ready state
          if (data.type === 'ready') {
            fastify.log.info(`Player ${user.name} is ready`);
            if (isHost && matchClients[matchId].host) {
              matchClients[matchId].host.ready = true;
            } else if (!isHost && matchClients[matchId].guest) {
              matchClients[matchId].guest.ready = true;
            }

            // Notify both players about the current ready states
            const hostReady = matchClients[matchId].host?.ready || false;
            const guestReady = matchClients[matchId].guest?.ready || false;

            // Notify host about current states
            if (matchClients[matchId].host?.socket.socket.readyState === 1) {
              matchClients[matchId].host.socket.socket.send(JSON.stringify({
                type: 'ready_state',
                hostReady,
                guestReady
              }));
            }

            // Notify guest about current states
            if (matchClients[matchId].guest?.socket.socket.readyState === 1) {
              matchClients[matchId].guest.socket.socket.send(JSON.stringify({
                type: 'ready_state',
                hostReady,
                guestReady
              }));
            }

            // If both players are ready, notify them to start the game
            if (hostReady && guestReady) {
              fastify.log.info('Both players ready, starting game');
              try {
                if (matchClients[matchId].host?.socket.socket.readyState === 1) {
                  fastify.log.info(`Sending game_start to host (${matchClients[matchId].host.name})`);
                  matchClients[matchId].host.socket.socket.send(JSON.stringify({ type: 'game_start' }));
                  fastify.log.info('Sent game_start to host');
                } else {
                  fastify.log.warn('Host WebSocket not open when trying to send game_start');
                }
              } catch (err) {
                fastify.log.error('Error sending game_start to host:', err);
              }
              try {
                if (matchClients[matchId].guest?.socket.socket.readyState === 1) {
                  fastify.log.info(`Sending game_start to guest (${matchClients[matchId].guest.name})`);
                  matchClients[matchId].guest.socket.socket.send(JSON.stringify({ type: 'game_start' }));
                  fastify.log.info('Sent game_start to guest');
                } else {
                  fastify.log.warn('Guest WebSocket not open when trying to send game_start');
                }
              } catch (err) {
                fastify.log.error('Error sending game_start to guest:', err);
              }
            }
            return;
          }

          // Handle game state updates
          if (data.type === 'gameState') {
            matchClients[matchId].gameState = data.state;
          }

          // Relay messages to the appropriate client
          const targetClient = isHost ? matchClients[matchId].guest : matchClients[matchId].host;
          if (targetClient?.socket.socket.readyState === 1) {
            fastify.log.debug(`Relaying message from ${user.name} to ${targetClient.name}`);
            targetClient.socket.socket.send(message.toString());
          }
        } catch (err) {
          fastify.log.error('Error processing WebSocket message:', err);
        }
      });

      connection.socket.on('close', async () => {
        clearInterval(pingInterval);
        fastify.log.info(`WebSocket connection closed for ${user.name}`);

        // Mark user as offline
        onlineUsers.delete(user.id);

        // Call matchmaking/leave to clean up the match
        try {
          const reply = await fastify.inject({
            method: 'POST',
            url: '/matchmaking/leave',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          fastify.log.info('Matchmaking leave response:', reply.json());
        } catch (error) {
          fastify.log.error('Error calling matchmaking/leave:', error);
        }

        // Only remove this specific client's connection
        if (isHost) {
          if (matchClients[matchId]?.host?.userId === user.id) {
            fastify.log.info(`Removing host ${user.name} from match ${matchId}`);
            delete matchClients[matchId].host;
          }
        } else {
          if (matchClients[matchId]?.guest?.userId === user.id) {
            fastify.log.info(`Removing guest ${user.name} from match ${matchId}`);
            delete matchClients[matchId].guest;
          }
        }

        // Notify the other player about disconnection
        const otherPlayer = isHost ? matchClients[matchId]?.guest : matchClients[matchId]?.host;
        if (otherPlayer?.socket.socket.readyState === 1) {
          fastify.log.info(`Notifying ${otherPlayer.name} about ${user.name}'s disconnection`);
          otherPlayer.socket.socket.send(JSON.stringify({
            type: 'opponent_disconnected',
            name: user.name
          }));
        }

        // Clean up the match if:
        // 1. The match is empty (no host or guest)
        // 2. The game has ended (gameOver is true)
        // 3. One player has disconnected
        if (!matchClients[matchId]?.host && !matchClients[matchId]?.guest) {
          fastify.log.info(`Removing empty match ${matchId}`);
          delete matchClients[matchId];
        } else if (matchClients[matchId]?.gameState?.gameOver || !matchClients[matchId]?.host || !matchClients[matchId]?.guest) {
          // If the game has ended or one player has disconnected, clean up the entire match
          fastify.log.info(`Game ended or player disconnected, cleaning up match ${matchId}`);
          if (matchClients[matchId]?.host?.socket.socket.readyState === 1) {
            matchClients[matchId].host.socket.socket.close();
          }
          if (matchClients[matchId]?.guest?.socket.socket.readyState === 1) {
            matchClients[matchId].guest.socket.socket.close();
          }
          delete matchClients[matchId];
        }
      });

    } catch (err) {
      fastify.log.error('Error validating WebSocket connection:', err);
      connection.socket.close();
    }
  });

  // Lightweight presence WebSocket endpoint
  fastify.get('/ws/presence', { websocket: true }, async (connection: SocketStream, req: any) => {
    // Extract token from query parameters
    const url = new URL(req.url, `https://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      fastify.log.error('Presence WebSocket connection attempt without token');
      connection.socket.close();
      return;
    }

    try {
      // Validate the token
      const session = await new Promise<{ userId: number; expiresAt: string } | undefined>((resolve, reject) => {
        db.get('SELECT userId, expiresAt FROM sessions WHERE token = ?', [token], (err: Error | null, row: { userId: number; expiresAt: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!session) {
        fastify.log.error('Invalid session token in Presence WebSocket connection');
        connection.socket.close();
        return;
      }

      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      if (now > expiresAt) {
        fastify.log.error('Expired session token in Presence WebSocket connection');
        connection.socket.close();
        return;
      }

      // Get user info
      const user = await new Promise<{ id: number; name: string } | undefined>((resolve, reject) => {
        db.get('SELECT id, name FROM users WHERE id = ?', [session.userId], (err: Error | null, row: { id: number; name: string } | undefined) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!user) {
        fastify.log.error('User not found (presence)');
        connection.socket.close();
        return;
      }

      // Close any existing connection for this user
      const existingConnection = presenceConnections.get(user.id);
      if (existingConnection && existingConnection.socket.readyState === 1) {
        existingConnection.socket.close();
      }

      // Store the new connection
      presenceConnections.set(user.id, connection);

      // Mark user as online
      onlineUsers.add(user.id);
      fastify.log.info(`User ${user.name} connected to presence WebSocket.`);

      // Handle connection close
      connection.socket.on('close', () => {
        // Only remove from online users if this is the most recent connection
        if (presenceConnections.get(user.id) === connection) {
          onlineUsers.delete(user.id);
          presenceConnections.delete(user.id);
          fastify.log.info(`User ${user.name} disconnected from presence WebSocket.`);
        }
      });

      // Handle ping messages
      connection.socket.on('message', (msg: Buffer) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          fastify.log.error('Error processing presence message:', err);
        }
      });

    } catch (err) {
      fastify.log.error('Error validating Presence WebSocket connection:', err);
      connection.socket.close();
    }
  });
} 