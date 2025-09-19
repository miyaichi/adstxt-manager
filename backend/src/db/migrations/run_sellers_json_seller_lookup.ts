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
  // Try multiple possible paths for database connection
  let createConnection;
  try {
    createConnection = require('../db').createConnection;
  } catch (e1) {
    try {
      createConnection = require('../../db').createConnection;
    } catch (e2) {
      try {
        createConnection = require('../../../db').createConnection;
      } catch (e3) {
        const errorMessage = e3 instanceof Error ? e3.message : String(e3);
        console.error('Could not find database connection module:', errorMessage);
        process.exit(1);
      }
    }
  }

  (async () => {
    let db;
    try {
      db = await createConnection();
      await runSellersJsonSellerLookupMigration(db);
      console.log('🎉 Migration completed successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    } finally {
      if (db) {
        await db.destroy();
      }
    }
  })();
}