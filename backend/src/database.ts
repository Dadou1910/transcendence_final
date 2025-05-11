import sqlite3 from 'sqlite3';
import { FastifyInstance } from 'fastify';
import { User, UserSettings, Match, Tournament, TournamentPlayer, TournamentMatch } from './types';

export async function initializeDatabase(fastify: FastifyInstance) {
  const db = new sqlite3.Database(fastify.config.DB_PATH, (err) => {
    if (err) {
      fastify.log.error('Failed to connect to SQLite database:', err);
      throw err;
    }
    fastify.log.info(`Connected to database at ${fastify.config.DB_PATH}`);
  });

  try {
    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          wins INTEGER NOT NULL DEFAULT 0,
          losses INTEGER NOT NULL DEFAULT 0,
          tournamentsWon INTEGER NOT NULL DEFAULT 0,
          avatar BLOB,
          avatar_mime TEXT
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Users table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          userId INTEGER PRIMARY KEY,
          backgroundColor TEXT,
          ballSpeed INTEGER,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('User_settings table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER, -- Nullable, references users(id) but no foreign key constraint
          opponentId INTEGER, -- Nullable, references users(id) but no foreign key constraint
          userName TEXT NOT NULL, -- Store the username directly
          opponentName TEXT NOT NULL, -- Store the opponent name directly
          userScore INTEGER NOT NULL,
          opponentScore INTEGER NOT NULL,
          gameType TEXT NOT NULL, -- New column for game type (Pong, Neon City Pong, AI Pong, Space Battle)
          date TEXT NOT NULL
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Matches table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          createdAt TEXT NOT NULL
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Tournaments table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tournament_players (
          tournamentId INTEGER NOT NULL,
          username TEXT NOT NULL,
          position INTEGER,
          PRIMARY KEY (tournamentId, username),
          FOREIGN KEY(tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Tournament_players table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tournament_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournamentId INTEGER NOT NULL,
          roundNumber INTEGER NOT NULL,
          player1 TEXT NOT NULL,
          player2 TEXT NOT NULL,
          winner TEXT,
          FOREIGN KEY(tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Tournament_matches table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          userId INTEGER NOT NULL,
          createdAt TEXT NOT NULL,
          expiresAt TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Sessions table created');
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS friends (
          userId INTEGER NOT NULL,
          friendId INTEGER NOT NULL,
          PRIMARY KEY (userId, friendId),
          FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(friendId) REFERENCES users(id) ON DELETE CASCADE
        );
      `, (err) => {
        if (err) reject(err);
        fastify.log.info('Friends table created');
        resolve();
      });
    });

    fastify.log.info('Database schema initialized');
  } catch (err) {
    fastify.log.error('Failed to initialize database schema:', err);
    throw err;
  }

  return db;
}