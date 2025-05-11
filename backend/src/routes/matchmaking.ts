import { FastifyInstance } from 'fastify';

interface WaitingPlayer {
  userId: number;
  username: string;
  joinedAt: number;
}

interface Match {
  id: string;
  players: { userId: number; username: string }[];
  status: 'waiting' | 'ready' | 'in_progress' | 'finished';
}

const matchmakingQueue: WaitingPlayer[] = [];
const matches: Record<string, Match> = {};

function generateMatchId() {
  return Math.random().toString(36).substr(2, 9);
}

export async function matchmakingRoutes(fastify: FastifyInstance) {
  // Join matchmaking
  fastify.post('/matchmaking/join', async (request, reply) => {
    const user = request.user;
    if (!user) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    try {
      fastify.log.info(`[MATCHMAKING] User ${user.id} (${user.name}) is joining matchmaking.`);
      // Check if already in a match
      for (const match of Object.values(matches)) {
        if (match.players.some(p => p.userId === user.id)) {
          if (match.status === 'finished') {
            // Remove finished match
            delete matches[match.id];
            fastify.log.info(`[MATCHMAKING] Removed finished match for user ${user.id}`);
          } else {
            fastify.log.info(`[MATCHMAKING] User ${user.id} already in match ${match.id}`);
            return { matchId: match.id, status: match.status, players: match.players };
          }
        }
      }

      // Remove from queue if already there
      const queueIndex = matchmakingQueue.findIndex(p => p.userId === user.id);
      if (queueIndex !== -1) {
        matchmakingQueue.splice(queueIndex, 1);
        fastify.log.info(`[MATCHMAKING] Removed user ${user.id} from queue (duplicate join)`);
      }

      // Check for available opponent in queue
      const opponent = matchmakingQueue.shift();
      if (opponent) {
        const matchId = generateMatchId();
        matches[matchId] = {
          id: matchId,
          players: [
            { userId: opponent.userId, username: opponent.username },
            { userId: user.id, username: user.name }
          ],
          status: 'ready'
        };
        fastify.log.info(`[MATCHMAKING] Created match ${matchId} between ${opponent.userId} and ${user.id}`);
        return { matchId, status: 'ready', players: matches[matchId].players };
      }

      // No opponent found, add to queue
      matchmakingQueue.push({
        userId: user.id,
        username: user.name,
        joinedAt: Date.now()
      });
      fastify.log.info(`[MATCHMAKING] Added user ${user.id} to queue. Queue length: ${matchmakingQueue.length}`);
      return { status: 'waiting', userId: user.id };
    } catch (error) {
      fastify.log.error('Matchmaking error:', error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Poll match status
  fastify.get('/matchmaking/status/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const userIdNum = Number(userId);

    try {
      // Check if in queue
      const queuePosition = matchmakingQueue.findIndex(p => p.userId === userIdNum);
      if (queuePosition !== -1) {
        return { status: 'waiting' };
      }

      // Check if in match
      for (const match of Object.values(matches)) {
        if (match.players.some(p => p.userId === userIdNum)) {
          return { 
            matchId: match.id, 
            status: match.status, 
            players: match.players 
          };
        }
      }

      return { status: 'waiting' };
    } catch (error) {
      fastify.log.error('Status check error:', error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Update match status
  fastify.post<{ Body: { matchId: string; status: Match['status'] } }>('/matchmaking/update', async (request, reply) => {
    const { matchId, status } = request.body;
    const user = request.user;

    if (!user) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    try {
      const match = matches[matchId];
      if (!match) {
        reply.code(404);
        return { error: 'Match not found' };
      }

      if (!match.players.some(p => p.userId === user.id)) {
        reply.code(403);
        return { error: 'Not a participant in this match' };
      }

      match.status = status;
      fastify.log.info('Updated match status:', { matchId, status });
      return { status: 'success' };
    } catch (error) {
      fastify.log.error('Match update error:', error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });

  // Leave matchmaking or match
  fastify.post('/matchmaking/leave', async (request, reply) => {
    const user = request.user;
    if (!user) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    try {
      // Remove from matchmaking queue if present
      const queueIndex = matchmakingQueue.findIndex(p => p.userId === user.id);
      if (queueIndex !== -1) {
        matchmakingQueue.splice(queueIndex, 1);
        fastify.log.info(`[MATCHMAKING] User ${user.id} left the matchmaking queue.`);
        return { status: 'left_queue' };
      }

      // Find and mark any active matches as finished
      for (const match of Object.values(matches)) {
        if (match.players.some(p => p.userId === user.id)) {
          match.status = 'finished';
          // Remove the match from active matches
          delete matches[match.id];
          fastify.log.info(`[MATCHMAKING] User ${user.id} left match ${match.id}, marked as finished and removed.`);
          return { status: 'left_match', matchId: match.id };
        }
      }

      return { status: 'not_found' };
    } catch (error) {
      fastify.log.error('Error leaving matchmaking:', error);
      reply.code(500);
      return { error: 'Internal server error' };
    }
  });
} 