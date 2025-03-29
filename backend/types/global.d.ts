import { Database } from 'sqlite3';

declare global {
  var __TEST_DB__: Database;
}
