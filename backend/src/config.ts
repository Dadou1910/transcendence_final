import fp from 'fastify-plugin'
import { FastifyEnvOptions } from '@fastify/env'
import { FastifyInstance } from 'fastify'

// Define the shape of the environment variables for TypeScript
export interface Env {
  PORT: number
  DB_PATH: string
  BCRYPT_SALT_ROUNDS: number
  SSL_CERT_PATH: string
  SSL_KEY_PATH: string
  HTTPS_ONLY: boolean
}

// Extend FastifyInstance with our config
declare module 'fastify' {
  interface FastifyInstance {
    config: Env
  }
}

// Define the schema for environment variables validation
const schema = {
  type: 'object',
  required: ['PORT', 'DB_PATH', 'BCRYPT_SALT_ROUNDS'],
  properties: {
    PORT: { 
      type: 'number',
      default: 4000 // Default port if not specified
    },
    DB_PATH: { 
      type: 'string' // Path to SQLite database
    },
    BCRYPT_SALT_ROUNDS: { 
      type: 'number',
      default: 10 // Default for bcrypt hashing
    },
    SSL_CERT_PATH: {
      type: 'string',
      default: '/app/certs/cert.pem'
    },
    SSL_KEY_PATH: {
      type: 'string',
      default: '/app/certs/key.pem'
    },
    HTTPS_ONLY: {
      type: 'boolean',
      default: true
    }
  }
}

// Configure the @fastify/env plugin options
const options: FastifyEnvOptions = {
  schema, // Validation schema
  dotenv: true, // Load .env file
  data: process.env // Source of environment variables
}

// Export the plugin to load environment variables
export default fp(async (fastify) => {
  await fastify.register(import('@fastify/env'), options)
})