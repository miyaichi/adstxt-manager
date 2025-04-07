const db = require('../utils/database');
const logger = require('../utils/logger');

/**
 * Clean up old request and message data
 * @param {Object} options - Task options
 * @param {number} options.age - Age in days for data retention
 * @param {boolean} options.dryRun - Show what would be deleted without actually deleting
 */
async function run(options = {}) {
  const { age = 90, dryRun = false } = options;
  let transaction = null;
  const results = {
    requests: { identified: 0, deleted: 0 },
    messages: { identified: 0, deleted: 0 },
    adsTxtCache: { identified: 0, deleted: 0 },
    sellersJsonCache: { identified: 0, deleted: 0 },
  };

  try {
    logger.info('Starting data cleanup task', { age, dryRun });
    await db.initDatabase();

    // Calculate the cutoff date based on age
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - age);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Start transaction if not dry run
    if (!dryRun) {
      transaction = await db.beginTransaction();
    }

    // 1. Find old requests
    const oldRequestsQuery =
      process.env.DATABASE_TYPE === 'postgres'
        ? 'SELECT id FROM requests WHERE created_at < $1'
        : 'SELECT id FROM requests WHERE created_at < ?';

    const oldRequests = await db.executeQuery(oldRequestsQuery, [cutoffTimestamp]);
    results.requests.identified = oldRequests.length;

    logger.info(`Identified ${oldRequests.length} old requests to delete`, { dryRun });

    // 2. Find related messages
    if (oldRequests.length > 0) {
      const requestIds = oldRequests.map((r) => r.id);

      // SQLite and PostgreSQL handle array parameters differently
      let messagesQuery, messagesParams;

      if (process.env.DATABASE_TYPE === 'postgres') {
        messagesQuery = 'SELECT id FROM messages WHERE request_id = ANY($1)';
        messagesParams = [requestIds];
      } else {
        // For SQLite, we need to use IN with individual parameters
        messagesQuery = `SELECT id FROM messages WHERE request_id IN (${requestIds
          .map(() => '?')
          .join(',')})`;
        messagesParams = requestIds;
      }

      const relatedMessages = await db.executeQuery(messagesQuery, messagesParams);
      results.messages.identified = relatedMessages.length;

      logger.info(`Identified ${relatedMessages.length} related messages to delete`, { dryRun });

      // 3. Delete messages first (due to foreign key constraints)
      if (!dryRun && relatedMessages.length > 0) {
        let deleteMessagesQuery, deleteMessagesParams;

        if (process.env.DATABASE_TYPE === 'postgres') {
          deleteMessagesQuery = 'DELETE FROM messages WHERE request_id = ANY($1)';
          deleteMessagesParams = [requestIds];
        } else {
          deleteMessagesQuery = `DELETE FROM messages WHERE request_id IN (${requestIds
            .map(() => '?')
            .join(',')})`;
          deleteMessagesParams = requestIds;
        }

        const deleteMessagesResult = await (process.env.DATABASE_TYPE === 'postgres'
          ? transaction.query(deleteMessagesQuery, deleteMessagesParams)
          : transaction.run(deleteMessagesQuery, deleteMessagesParams));

        results.messages.deleted =
          process.env.DATABASE_TYPE === 'postgres'
            ? deleteMessagesResult.rowCount
            : deleteMessagesResult.changes;

        logger.info(`Deleted ${results.messages.deleted} messages`);
      }

      // 4. Delete the requests
      if (!dryRun) {
        let deleteRequestsQuery, deleteRequestsParams;

        if (process.env.DATABASE_TYPE === 'postgres') {
          deleteRequestsQuery = 'DELETE FROM requests WHERE created_at < $1';
          deleteRequestsParams = [cutoffTimestamp];
        } else {
          deleteRequestsQuery = 'DELETE FROM requests WHERE created_at < ?';
          deleteRequestsParams = [cutoffTimestamp];
        }

        const deleteRequestsResult = await (process.env.DATABASE_TYPE === 'postgres'
          ? transaction.query(deleteRequestsQuery, deleteRequestsParams)
          : transaction.run(deleteRequestsQuery, deleteRequestsParams));

        results.requests.deleted =
          process.env.DATABASE_TYPE === 'postgres'
            ? deleteRequestsResult.rowCount
            : deleteRequestsResult.changes;

        logger.info(`Deleted ${results.requests.deleted} requests`);
      }
    }

    // 5. Clean up error-status cache entries older than retention period
    // For ads.txt cache
    const adsTxtCacheQuery =
      process.env.DATABASE_TYPE === 'postgres'
        ? `SELECT id FROM ads_txt_cache 
         WHERE status != 'success' AND updated_at < $1`
        : `SELECT id FROM ads_txt_cache 
         WHERE status != 'success' AND updated_at < ?`;

    const oldAdsTxtCache = await db.executeQuery(adsTxtCacheQuery, [cutoffTimestamp]);
    results.adsTxtCache.identified = oldAdsTxtCache.length;

    logger.info(`Identified ${oldAdsTxtCache.length} old ads.txt cache entries with errors`, {
      dryRun,
    });

    if (!dryRun && oldAdsTxtCache.length > 0) {
      const deleteAdsTxtCacheQuery =
        process.env.DATABASE_TYPE === 'postgres'
          ? `DELETE FROM ads_txt_cache 
           WHERE status != 'success' AND updated_at < $1`
          : `DELETE FROM ads_txt_cache 
           WHERE status != 'success' AND updated_at < ?`;

      const deleteAdsTxtCacheResult = await (process.env.DATABASE_TYPE === 'postgres'
        ? transaction.query(deleteAdsTxtCacheQuery, [cutoffTimestamp])
        : transaction.run(deleteAdsTxtCacheQuery, [cutoffTimestamp]));

      results.adsTxtCache.deleted =
        process.env.DATABASE_TYPE === 'postgres'
          ? deleteAdsTxtCacheResult.rowCount
          : deleteAdsTxtCacheResult.changes;

      logger.info(`Deleted ${results.adsTxtCache.deleted} ads.txt cache entries with errors`);
    }

    // For sellers.json cache
    const sellersJsonCacheQuery =
      process.env.DATABASE_TYPE === 'postgres'
        ? `SELECT id FROM sellers_json_cache 
         WHERE status != 'success' AND updated_at < $1`
        : `SELECT id FROM sellers_json_cache 
         WHERE status != 'success' AND updated_at < ?`;

    const oldSellersJsonCache = await db.executeQuery(sellersJsonCacheQuery, [cutoffTimestamp]);
    results.sellersJsonCache.identified = oldSellersJsonCache.length;

    logger.info(
      `Identified ${oldSellersJsonCache.length} old sellers.json cache entries with errors`,
      { dryRun }
    );

    if (!dryRun && oldSellersJsonCache.length > 0) {
      const deleteSellersJsonCacheQuery =
        process.env.DATABASE_TYPE === 'postgres'
          ? `DELETE FROM sellers_json_cache 
           WHERE status != 'success' AND updated_at < $1`
          : `DELETE FROM sellers_json_cache 
           WHERE status != 'success' AND updated_at < ?`;

      const deleteSellersJsonCacheResult = await (process.env.DATABASE_TYPE === 'postgres'
        ? transaction.query(deleteSellersJsonCacheQuery, [cutoffTimestamp])
        : transaction.run(deleteSellersJsonCacheQuery, [cutoffTimestamp]));

      results.sellersJsonCache.deleted =
        process.env.DATABASE_TYPE === 'postgres'
          ? deleteSellersJsonCacheResult.rowCount
          : deleteSellersJsonCacheResult.changes;

      logger.info(
        `Deleted ${results.sellersJsonCache.deleted} sellers.json cache entries with errors`
      );
    }

    // Commit transaction if not dry run
    if (!dryRun && transaction) {
      await db.commitTransaction(transaction);
      logger.info('Transaction committed successfully');
    }
  } catch (error) {
    // Rollback transaction if not dry run
    if (!dryRun && transaction) {
      await db.rollbackTransaction(transaction);
      logger.warn('Transaction rolled back due to error');
    }

    logger.error('Error during data cleanup task', { error: error.message });
    throw error;
  } finally {
    // Log summary statistics
    logger.info('Data cleanup task summary', {
      dryRun,
      age,
      requests: results.requests,
      messages: results.messages,
      adsTxtCache: results.adsTxtCache,
      sellersJsonCache: results.sellersJsonCache,
    });

    // Close database connection
    await db.closeDatabase();
  }

  return results;
}

module.exports = { run };
