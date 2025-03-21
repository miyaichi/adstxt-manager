/**
 * Test Database Utility
 * Provides a connection to a test database for use in tests
 */
import sqlite3, { Database } from 'sqlite3';

// Create in-memory database for tests
const db = new sqlite3.Database(':memory:');

// Initialize database with schema
export const initTestDatabase = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Create requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY,
          publisher_email TEXT NOT NULL,
          requester_email TEXT NOT NULL,
          requester_name TEXT NOT NULL,
          status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'completed')) NOT NULL DEFAULT 'pending',
          ads_txt_content TEXT,
          token TEXT UNIQUE NOT NULL,
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
          FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
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
          domain TEXT NOT NULL,
          account_id TEXT NOT NULL,
          account_type TEXT NOT NULL,
          relationship TEXT CHECK(relationship IN ('DIRECT', 'RESELLER')) NOT NULL,
          certification_authority_id TEXT,
          publisher_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
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

// Clear all data from tables
export const clearTestDatabase = async (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM messages', (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      db.run('DELETE FROM ads_txt_records', (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      db.run('DELETE FROM requests', (err) => {
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