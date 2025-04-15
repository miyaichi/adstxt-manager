#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// Load environment variables from current directory first, then parent
if (fs.existsSync(path.resolve(__dirname, '.env'))) {
  require('dotenv').config({
    path: path.resolve(__dirname, '.env'),
  });
} else {
  require('dotenv').config({
    path: path.resolve(__dirname, '../.env'),
  });
}

// Task modules
const refreshAdsTxt = require('./tasks/refresh-ads-txt');
const refreshSellersJson = require('./tasks/refresh-sellers-json');
const cleanupData = require('./tasks/cleanup-data');
const prefetchSellersJson = require('./tasks/prefetch-sellers-json');

// Configure CLI program
program
  .name('adstxt-batch')
  .description('Batch processing system for Ads.txt Manager')
  .version('1.0.0');

program
  .command('refresh-ads-txt')
  .description('Refresh expired ads.txt cache entries')
  .option('-l, --limit <number>', 'Maximum number of records to process', parseInt)
  .option('-a, --age <days>', 'Process records older than specified days', parseInt)
  .action(async (options) => {
    try {
      logger.info('Starting ads.txt cache refresh task');
      await refreshAdsTxt.run(options);
      logger.info('ads.txt cache refresh task completed');
    } catch (error) {
      logger.error('ads.txt cache refresh task failed', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('refresh-sellers-json')
  .description('Refresh expired sellers.json cache entries')
  .option('-l, --limit <number>', 'Maximum number of records to process', parseInt)
  .option('-a, --age <days>', 'Process records older than specified days', parseInt)
  .action(async (options) => {
    try {
      logger.info('Starting sellers.json cache refresh task');
      await refreshSellersJson.run(options);
      logger.info('sellers.json cache refresh task completed');
    } catch (error) {
      logger.error('sellers.json cache refresh task failed', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('cleanup-data')
  .description('Clean up old request and message data')
  .option('-a, --age <days>', 'Age in days for data retention (default: 90)', parseInt, 90)
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .action(async (options) => {
    try {
      logger.info('Starting data cleanup task');
      await cleanupData.run(options);
      logger.info('Data cleanup task completed');
    } catch (error) {
      logger.error('Data cleanup task failed', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('prefetch-sellers-json')
  .description('Prefetch sellers.json for domains found in ads.txt records')
  .option('-l, --limit <number>', 'Maximum number of domains to process', parseInt)
  .option(
    '-m, --min-usage <number>',
    'Minimum number of times a domain appears in ads.txt records (default: 3)',
    parseInt
  )
  .option(
    '-p, --priority-age <days>',
    'Prioritize domains with cache older than this many days (default: 3)',
    parseInt
  )
  .action(async (options) => {
    try {
      logger.info('Starting sellers.json prefetch task');
      await prefetchSellersJson.run(options);
      logger.info('Sellers.json prefetch task completed');
    } catch (error) {
      logger.error('Sellers.json prefetch task failed', { error: error.message });
      process.exit(1);
    }
  });

program
  .command('run-all')
  .description('Run all maintenance tasks in sequence')
  .option('--ads-txt-limit <number>', 'Maximum number of ads.txt records to process', parseInt)
  .option(
    '--sellers-json-limit <number>',
    'Maximum number of sellers.json records to process',
    parseInt
  )
  .option('--prefetch-limit <number>', 'Maximum number of domains to prefetch', parseInt)
  .option(
    '--min-usage <number>',
    'Minimum number of times a domain appears in ads.txt records (default: 3)',
    parseInt,
    3
  )
  .option(
    '--priority-age <days>',
    'Prioritize domains with cache older than this many days (default: 3)',
    parseInt,
    3
  )
  .option('--retention-days <days>', 'Age in days for data retention (default: 90)', parseInt, 90)
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .action(async (options) => {
    try {
      logger.info('Starting all maintenance tasks');

      // Run tasks sequentially
      logger.info('Starting ads.txt cache refresh task');
      await refreshAdsTxt.run({ limit: options.adsTxtLimit });
      logger.info('ads.txt cache refresh task completed');

      // Prefetch sellers.json data based on ads.txt domains (always run before refresh)
      // Use reasonable defaults if no specific limits provided
      const prefetchLimit = options.prefetchLimit || 300;
      logger.info('Starting sellers.json prefetch task');
      await prefetchSellersJson.run({
        limit: prefetchLimit,
        minUsage: options.minUsage || 3, // Only prefetch domains that appear frequently
        priorityAge: options.priorityAge || 3, // Prioritize domains with no cache or older than 3 days
      });
      logger.info('Sellers.json prefetch task completed');

      // Standard sellers.json refresh for expired entries
      logger.info('Starting sellers.json cache refresh task');
      await refreshSellersJson.run({ limit: options.sellersJsonLimit });
      logger.info('sellers.json cache refresh task completed');

      logger.info('Starting data cleanup task');
      await cleanupData.run({
        age: options.retentionDays,
        dryRun: options.dryRun,
      });
      logger.info('Data cleanup task completed');

      logger.info('All maintenance tasks completed successfully');
    } catch (error) {
      logger.error('Maintenance tasks failed', { error: error.message });
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(`Invalid command: ${program.args.join(' ')}`);
  console.error('See --help for a list of available commands.');
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (process.argv.length === 2) {
  program.help();
}
