/**
 * Reset sellers.json cache entries for specific domains
 *
 * Usage:
 * node reset-sellers-json-cache.js [domain1] [domain2] ... [domainN]
 *
 * Example:
 * node reset-sellers-json-cache.js 33across.com
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get domains from command line arguments
const domains = process.argv.slice(2);

if (domains.length === 0) {
  console.error('Error: Please specify at least one domain to reset.');
  console.error('Usage: node reset-sellers-json-cache.js [domain1] [domain2] ... [domainN]');
  process.exit(1);
}

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Prepare placeholders for SQL query
const placeholders = domains.map(() => '?').join(',');

// Delete the cache entries for the specified domains
db.run(`DELETE FROM sellers_json_cache WHERE domain IN (${placeholders})`, domains, function (err) {
  if (err) {
    console.error('Error deleting cache entries:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(
    `Successfully deleted ${this.changes} cache entries for domains: ${domains.join(', ')}`
  );

  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      process.exit(1);
    }
    console.log('Database connection closed.');
  });
});
