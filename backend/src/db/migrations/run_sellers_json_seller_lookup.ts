import { readMigrationFile } from './pathHelper';

/**
 * Migration runner for sellers_json_seller_lookup table creation
 * This creates the normalized lookup table for high-performance seller_id searches
 */
/**
 * Migrate existing sellers.json data to the normalized lookup table
 */
async function migrateExistingData(db: any): Promise<void> {
  console.log(
    '📊 Starting data migration from sellers_json_cache to sellers_json_seller_lookup...'
  );

  // Check if there's existing data in the lookup table
  const existingCount = await db.raw(`
    SELECT COUNT(*) as count FROM sellers_json_seller_lookup
  `);

  const existingRecords = parseInt(existingCount.rows[0].count, 10);
  console.log(`📋 Found ${existingRecords} existing records in sellers_json_seller_lookup`);

  // Get total count of source records
  const sourceCount = await db.raw(`
    SELECT COUNT(*) as count
    FROM sellers_json_cache
    WHERE status = 'success'
      AND content IS NOT NULL
      AND jsonb_array_length(content->'sellers') > 0
  `);

  const totalSourceRecords = parseInt(sourceCount.rows[0].count, 10);
  console.log(`📋 Found ${totalSourceRecords} source records in sellers_json_cache`);

  if (totalSourceRecords === 0) {
    console.log('ℹ️ No source data found for migration');
    return;
  }

  const BATCH_SIZE = 100; // Process 100 cache records at a time
  let processedCacheRecords = 0;
  let totalSellersInserted = 0;
  let offset = 0;

  while (processedCacheRecords < totalSourceRecords) {
    console.log(
      `🔄 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1}/${Math.ceil(totalSourceRecords / BATCH_SIZE)}...`
    );

    // Get a batch of cache records
    const batchResult = await db.raw(
      `
      SELECT id, domain, content
      FROM sellers_json_cache
      WHERE status = 'success'
        AND content IS NOT NULL
        AND jsonb_array_length(content->'sellers') > 0
      ORDER BY id
      LIMIT $1 OFFSET $2
    `,
      [BATCH_SIZE, offset]
    );

    const cacheRecords = batchResult.rows;

    if (cacheRecords.length === 0) {
      break;
    }

    // Process each cache record in the batch
    for (const cacheRecord of cacheRecords) {
      try {
        const content = cacheRecord.content;
        const sellers = content.sellers || [];

        if (sellers.length === 0) {
          continue;
        }

        // Insert sellers for this cache record
        const sellersRaw = sellers
          .filter((seller: any) => seller.seller_id)
          .map((seller: any) => ({
            cache_id: cacheRecord.id,
            domain: cacheRecord.domain.toLowerCase(),
            seller_id: seller.seller_id,
            seller_data: seller,
          }));

        // Remove duplicates within the same cache record
        // Keep the last occurrence of each seller_id for this cache_id
        const sellerMap = new Map();
        sellersRaw.forEach((seller) => {
          const key = `${seller.cache_id}:${seller.seller_id}`;
          sellerMap.set(key, seller);
        });

        const sellersToInsert = Array.from(sellerMap.values());

        if (sellersToInsert.length > 0) {
          // Insert sellers one by one to handle individual conflicts gracefully
          let insertedCount = 0;

          for (const seller of sellersToInsert) {
            try {
              const insertQuery = `
                INSERT INTO sellers_json_seller_lookup (cache_id, domain, seller_id, seller_data)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (cache_id, seller_id) DO UPDATE SET
                  domain = EXCLUDED.domain,
                  seller_data = EXCLUDED.seller_data,
                  updated_at = NOW()
              `;

              await db.raw(insertQuery, [
                seller.cache_id,
                seller.domain,
                seller.seller_id,
                JSON.stringify(seller.seller_data),
              ]);

              insertedCount++;
            } catch (sellerError) {
              const errorMessage =
                sellerError instanceof Error ? sellerError.message : String(sellerError);
              console.error(`     ⚠️ Failed to insert seller ${seller.seller_id}:`, errorMessage);
              // Continue with next seller
            }
          }

          totalSellersInserted += insertedCount;

          if (sellersRaw.length !== sellersToInsert.length) {
            console.log(
              `   ✅ Inserted ${insertedCount}/${sellersToInsert.length} unique sellers from domain: ${cacheRecord.domain} (removed ${sellersRaw.length - sellersToInsert.length} duplicates)`
            );
          } else {
            console.log(
              `   ✅ Inserted ${insertedCount}/${sellersToInsert.length} sellers from domain: ${cacheRecord.domain}`
            );
          }
        }
      } catch (error) {
        console.error(
          `   ❌ Error processing cache record ${cacheRecord.id} (${cacheRecord.domain}):`,
          error
        );
        // Continue with next record instead of failing entire migration
      }
    }

    processedCacheRecords += cacheRecords.length;
    offset += BATCH_SIZE;

    // Show progress
    const progress = ((processedCacheRecords / totalSourceRecords) * 100).toFixed(1);
    console.log(
      `📈 Progress: ${processedCacheRecords}/${totalSourceRecords} cache records (${progress}%) - ${totalSellersInserted} sellers total`
    );

    // Small delay to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `🎉 Data migration completed! Processed ${processedCacheRecords} cache records, inserted ${totalSellersInserted} sellers`
  );

  // Verify migration results
  const finalCount = await db.raw(`
    SELECT COUNT(*) as count FROM sellers_json_seller_lookup
  `);

  const finalRecords = parseInt(finalCount.rows[0].count, 10);
  console.log(`📊 Final count in sellers_json_seller_lookup: ${finalRecords} records`);
}

export async function runSellersJsonSellerLookupMigration(
  db: any,
  options: { skipDataMigration?: boolean } = {}
): Promise<void> {
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

    // Fix covering index if it exists with seller_data
    try {
      console.log('🔧 Checking and fixing covering index...');
      await db.raw(`
        DROP INDEX IF EXISTS idx_seller_lookup_covering;
        CREATE INDEX idx_seller_lookup_covering
        ON sellers_json_seller_lookup (domain, seller_id) INCLUDE (cache_id);
      `);
      console.log('✅ Fixed covering index (removed seller_data to avoid size limits)');
    } catch (indexError) {
      console.log('ℹ️ Index fix not needed or already applied');
    }

    // Perform data migration unless explicitly skipped
    if (!options.skipDataMigration) {
      console.log('');
      await migrateExistingData(db);
    } else {
      console.log('⏭️ Skipping data migration (skipDataMigration = true)');
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
    const path = require('path');
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
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
        ssl:
          process.env.DB_SSL_REQUIRED === 'true'
            ? {
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
              }
            : false,
      });

      await client.connect();
      console.log('✅ Connected to PostgreSQL database');

      // Create a Knex-like wrapper for the migration function
      const dbWrapper = {
        raw: async (sql: string, bindings?: any[]) => {
          const result = await client.query(sql, bindings);
          return { rows: result.rows };
        },
      };

      // Check for command line arguments
      const args = process.argv.slice(2);
      const skipDataMigration = args.includes('--skip-data-migration');

      if (skipDataMigration) {
        console.log('⚠️ Data migration will be skipped due to --skip-data-migration flag');
      }

      await runSellersJsonSellerLookupMigration(dbWrapper, { skipDataMigration });
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
