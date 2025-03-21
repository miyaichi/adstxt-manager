import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import sqlite3, { Database } from 'sqlite3';

dotenv.config();

// Enable verbose mode for debugging if in development
if (process.env.NODE_ENV === 'development') {
  sqlite3.verbose();
}

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../db/database.sqlite');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// Initialize database with required tables
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          publisher_email TEXT NOT NULL,
          requester_email TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          publisher_name TEXT,
          publisher_domain TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          token TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      // Create messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          sender_email TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (request_id) REFERENCES requests (id)
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      // Create ads_txt_records table
      db.run(`
        CREATE TABLE IF NOT EXISTS ads_txt_records (
          id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          domain TEXT NOT NULL,
          account_id TEXT NOT NULL,
          account_type TEXT NOT NULL,
          certification_authority_id TEXT,
          relationship TEXT DEFAULT 'DIRECT',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (request_id) REFERENCES requests (id)
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      resolve();
    });
  });
};

export default db as Database;