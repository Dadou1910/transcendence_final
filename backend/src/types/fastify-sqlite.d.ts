import { FastifyInstance, FastifyRequest } from 'fastify';
import { User } from './models/user'; // Import the User type

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: number;
      DB_PATH: string;
      BCRYPT_SALT_ROUNDS: number;
    };
  }

  // Extend FastifyRequest to include the user property
  interface FastifyRequest {
    user?: User; // Optional user property of type User
  }
}

export {};