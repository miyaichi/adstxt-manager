import { readMigrationFile } from './pathHelper';

/**
 * Migration runner for sellers_json_seller_lookup table creation
 * This creates the normalized lookup table for high-performance seller_id searches
 */
export async function runSellersJsonSellerLookupMigration(db: any): Promise<void> {
  try {
    console.log('🚀 Starting sellers_json_seller_lookup table migration...');

    // Read the SQL migration file
    const sqlContent = readMigrationFile('sellers_json_seller_lookup.sql');

    // Execute the migration
    await db.raw(sqlContent);

    console.log('✅ sellers_json_seller_lookup table migration completed successfully');
    console.log('📊 Created normalized lookup table with optimized indexes');
    console.log('🔍 Table supports high-performance seller_id searches');

    // Verify the table was created
    const tableExists = await db.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sellers_json_seller_lookup'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Table verification passed: sellers_json_seller_lookup exists');

      // Check indexes
      const indexes = await db.raw(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'sellers_json_seller_lookup'
        ORDER BY indexname;
      `);

      console.log(`📈 Created ${indexes.rows.length} indexes:`);
      indexes.rows.forEach((index: any) => {
        console.log(`   - ${index.indexname}`);
      });

      // Check foreign key constraint
      const foreignKeys = await db.raw(`
        SELECT conname, confrelid::regclass as referenced_table
        FROM pg_constraint
        WHERE conrelid = 'sellers_json_seller_lookup'::regclass
        AND contype = 'f';
      `);

      if (foreignKeys.rows.length > 0) {
        console.log('🔗 Foreign key constraints verified:');
        foreignKeys.rows.forEach((fk: any) => {
          console.log(`   - ${fk.conname} -> ${fk.referenced_table}`);
        });
      }

    } else {
      throw new Error('Table verification failed: sellers_json_seller_lookup was not created');
    }

  } catch (error) {
    console.error('❌ sellers_json_seller_lookup migration failed:', error);
    throw error;
  }
}

// Export for direct execution
if (require.main === module) {
  // Load environment variables from .env file
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv not available, using system environment variables');
  }

  const { Client } = require('pg');

  (async () => {
    let client;
    try {
      // Create PostgreSQL client directly using environment variables
      client = new Client({
        host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
        port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
        database: process.env.DB_NAME || process.env.PGDATABASE || 'adstxt_manager',
        user: process.env.DB_USER || process.env.PGUSER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
        ssl: process.env.DB_SSL_REQUIRED === 'true' ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        } : false
      });

      await client.connect();
      console.log('✅ Connected to PostgreSQL database');

      // Create a Knex-like wrapper for the migration function
      const dbWrapper = {
        raw: async (sql: string, bindings?: any[]) => {
          const result = await client.query(sql, bindings);
          return { rows: result.rows };
        }
      };

      await runSellersJsonSellerLookupMigration(dbWrapper);
      console.log('🎉 Migration completed successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    } finally {
      if (client) {
        await client.end();
      }
    }
  })();
}