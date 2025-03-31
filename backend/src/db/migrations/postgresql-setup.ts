/**
 * PostgreSQL Database Setup Script
 *
 * A tool to assist with data migration from SQLite to PostgreSQL
 */

import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// PostgreSQL connection settings
const pgPool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'adstxt_manager',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

// Path to SQLite database
const sqlitePath = process.env.DB_PATH || path.join(__dirname, '../../../db/database.sqlite');

/**
 * Create table structures
 */
async function createTables() {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    // Requests table
    await client.query(`
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
    `);

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests (id)
      )
    `);

    // Ads.txt records table
    await client.query(`
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
    `);

    // Ads.txt cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads_txt_cache (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        content TEXT,
        status INTEGER DEFAULT 0,
        last_fetched TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Sellers.json cache table - using JSONB format
    await client.query(`
      CREATE TABLE IF NOT EXISTS sellers_json_cache (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        content JSONB,
        status TEXT NOT NULL CHECK (status IN ('success', 'error', 'not_found', 'invalid_format')),
        status_code INTEGER,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Add JSONB indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_domain ON sellers_json_cache (domain);
      CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);
    `);

    await client.query('COMMIT');
    console.log('PostgreSQL tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating PostgreSQL tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Migrate data from SQLite to PostgreSQL
 */
async function migrateData() {
  console.log('Starting data migration from SQLite to PostgreSQL...');

  // Open SQLite database
  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite database not found: ${sqlitePath}`);
    return;
  }

  const db = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  // Get PostgreSQL connection
  const client = await pgPool.connect();

  try {
    // Split transactions by table to continue migration even if some tables fail
    console.log('Starting data migration - each table processed in its own transaction');

    // Migrate request data
    try {
      await client.query('BEGIN');
      const requests = await db.all('SELECT * FROM requests');
      if (requests.length > 0) {
        let migratedCount = 0;
        for (const request of requests) {
          try {
            await client.query(
              'INSERT INTO requests (id, publisher_email, requester_email, requester_name, publisher_name, publisher_domain, status, token, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
              [
                request.id,
                request.publisher_email,
                request.requester_email,
                request.requester_name,
                request.publisher_name,
                request.publisher_domain,
                request.status,
                request.token,
                request.created_at,
                request.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Error migrating request (id: ${request.id}):`, err);
          }
        }
        console.log(`Migrated ${migratedCount}/${requests.length} requests`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during requests table migration:', err);
    }

    // Migrate message data
    try {
      await client.query('BEGIN');
      const messages = await db.all('SELECT * FROM messages');
      if (messages.length > 0) {
        let migratedCount = 0;
        for (const message of messages) {
          try {
            await client.query(
              'INSERT INTO messages (id, request_id, sender_email, content, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
              [
                message.id,
                message.request_id,
                message.sender_email,
                message.content,
                message.created_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Error migrating message (id: ${message.id}):`, err);
          }
        }
        console.log(`Migrated ${migratedCount}/${messages.length} messages`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during messages table migration:', err);
    }

    // Migrate ads_txt_records data
    try {
      await client.query('BEGIN');
      const adsTxtRecords = await db.all('SELECT * FROM ads_txt_records');
      if (adsTxtRecords.length > 0) {
        let migratedCount = 0;
        for (const record of adsTxtRecords) {
          try {
            await client.query(
              'INSERT INTO ads_txt_records (id, request_id, domain, account_id, account_type, certification_authority_id, relationship, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
              [
                record.id,
                record.request_id,
                record.domain,
                record.account_id,
                record.account_type,
                record.certification_authority_id,
                record.relationship,
                record.status,
                record.created_at,
                record.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Error migrating ads_txt record (id: ${record.id}):`, err);
          }
        }
        console.log(`Migrated ${migratedCount}/${adsTxtRecords.length} ads.txt records`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during ads_txt_records table migration:', err);
    }

    // Migrate ads_txt_cache data
    try {
      await client.query('BEGIN');
      const adsTxtCache = await db.all('SELECT * FROM ads_txt_cache');
      if (adsTxtCache.length > 0) {
        let migratedCount = 0;
        for (const cache of adsTxtCache) {
          try {
            // Convert status to integer if it's a string
            let statusValue = cache.status;
            if (typeof statusValue === 'string') {
              // Convert string status to appropriate integer
              if (statusValue === 'success') {
                statusValue = 1;
              } else if (statusValue === 'error') {
                statusValue = 0;
              } else {
                // Try to parse as integer
                statusValue = parseInt(statusValue) || 0;
              }
            }

            await client.query(
              'INSERT INTO ads_txt_cache (id, domain, content, status, last_fetched, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
              [
                cache.id,
                cache.domain,
                cache.content,
                statusValue,
                cache.last_fetched,
                cache.created_at,
                cache.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Error migrating ads_txt cache (id: ${cache.id}):`, err);
          }
        }
        console.log(`Migrated ${migratedCount}/${adsTxtCache.length} ads.txt cache entries`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during ads_txt_cache table migration:', err);
    }

    // Migrate sellers_json_cache data - SQLite text format to PostgreSQL JSONB format
    try {
      await client.query('BEGIN');

      // Get data from SQLite
      const sellersJsonCache = await db.all('SELECT * FROM sellers_json_cache');
      if (sellersJsonCache.length > 0) {
        console.log(`Processing ${sellersJsonCache.length} sellers_json_cache records`);

        // Aggregate data by domain
        const domainMap = new Map();
        for (const cache of sellersJsonCache) {
          // If content exists, use it directly as JSON
          if (cache.content) {
            try {
              // Parse existing JSON content
              const contentObj = JSON.parse(cache.content);

              if (!domainMap.has(cache.domain)) {
                // Associate existing JSON content with domain
                domainMap.set(cache.domain, {
                  id: cache.id,
                  content: contentObj,
                  status: cache.status || 'success',
                  status_code: cache.status_code || 200,
                  error_message: cache.error_message,
                  created_at: cache.created_at,
                  updated_at: cache.updated_at,
                });
              }
            } catch (parseErr) {
              console.error(`JSON parse error for ${cache.domain}:`, parseErr);
            }
            continue;
          }

          // Skip if no seller_id
          if (!cache.seller_id) {
            continue;
          }

          // Create domain entry if it doesn't exist
          if (!domainMap.has(cache.domain)) {
            domainMap.set(cache.domain, {
              id: uuidv4(),
              content: { sellers: [] },
              status: 'success',
              status_code: 200,
              error_message: null,
              created_at: cache.created_at || new Date().toISOString(),
              updated_at: cache.updated_at || new Date().toISOString(),
            });
          }

          // Get current entry
          const entry = domainMap.get(cache.domain);

          // Create and add seller object
          const seller = {
            seller_id: cache.seller_id,
            name: cache.name,
            seller_type: cache.seller_type,
            domain_match:
              cache.domain_match === 1 ||
              cache.domain_match === true ||
              cache.domain_match === 'true',
            is_confidential:
              cache.is_confidential === 1 ||
              cache.is_confidential === true ||
              cache.is_confidential === 'true',
          };

          entry.content.sellers.push(seller);
        }

        // Insert domain data into PostgreSQL
        let migratedCount = 0;
        for (const [domain, data] of domainMap.entries()) {
          try {
            await client.query(
              `INSERT INTO sellers_json_cache 
               (id, domain, content, status, status_code, error_message, created_at, updated_at)
               VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
               ON CONFLICT (domain) DO UPDATE SET
                 content = $3::jsonb,
                 status = $4,
                 status_code = $5,
                 error_message = $6,
                 updated_at = $8`,
              [
                data.id,
                domain,
                data.content,
                data.status,
                data.status_code,
                data.error_message,
                data.created_at,
                data.updated_at,
              ]
            );
            migratedCount++;

            if (data.content.sellers) {
              console.log(`${domain}: Migrated ${data.content.sellers.length} seller entries`);
            }
          } catch (err) {
            console.error(`Error migrating data for ${domain}:`, err);
          }
        }

        console.log(`Migrated data for ${migratedCount} domains`);
      } else {
        console.log('No sellers_json_cache data to migrate');
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during sellers_json_cache table migration:', err);
    }

    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Data migration error:', error);

    // Provide more detailed debug info
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);

      // Show additional info for PostgreSQL errors
      const pgError = error as any;
      if (pgError.code) {
        console.error('PostgreSQL error code:', pgError.code);
        console.error('PostgreSQL error details:', {
          severity: pgError.severity,
          detail: pgError.detail,
          hint: pgError.hint,
          position: pgError.position,
          table: pgError.table,
          column: pgError.column,
          dataType: pgError.dataType,
          constraint: pgError.constraint,
          file: pgError.file,
          line: pgError.line,
          routine: pgError.routine,
        });
      }
    }

    throw error;
  } finally {
    client.release();
    await db.close();
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Create tables
    await createTables();

    // Check for data migration
    const answer = process.argv.includes('--migrate')
      ? 'y'
      : process.argv.includes('--no-migrate')
        ? 'n'
        : null;

    if (answer === null) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await new Promise<void>((resolve) => {
        readline.question(
          'Migrate data from SQLite to PostgreSQL? (y/n): ',
          async (ans: string) => {
            if (ans.toLowerCase() === 'y') {
              await migrateData();
            } else {
              console.log('Data migration skipped');
            }
            readline.close();
            resolve();
          }
        );
      });
    } else if (answer === 'y') {
      await migrateData();
    } else {
      console.log('Data migration skipped');
    }

    console.log('PostgreSQL setup completed');
  } catch (error) {
    console.error('PostgreSQL setup error:', error);
    process.exit(1);
  } finally {
    // End pool
    await pgPool.end();
  }
}

// Run script
if (require.main === module) {
  main();
}

export { createTables, migrateData };
