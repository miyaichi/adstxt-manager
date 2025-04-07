#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const logger = require('./utils/logger');

// Load environment variables
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

// Task modules
const refreshAdsTxt = require('./tasks/refresh-ads-txt');
const refreshSellersJson = require('./tasks/refresh-sellers-json');
const cleanupData = require('./tasks/cleanup-data');

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
  .command('run-all')
  .description('Run all maintenance tasks in sequence')
  .option('--ads-txt-limit <number>', 'Maximum number of ads.txt records to process', parseInt)
  .option(
    '--sellers-json-limit <number>',
    'Maximum number of sellers.json records to process',
    parseInt
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
