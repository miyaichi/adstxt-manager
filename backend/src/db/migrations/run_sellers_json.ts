import db from '../../config/database';
import fs from 'fs';
import path from 'path';

// Read SQL file
const sqlPath = path.join(__dirname, 'sellers_json_cache.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Run migration
db.exec(sql, (err) => {
  if (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } else {
    console.log('Migration completed successfully');
    process.exit(0);
  }
});
