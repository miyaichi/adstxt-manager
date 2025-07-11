import fs from 'fs';
import path from 'path';

/**
 * マイグレーションSQLファイルのパスを解決する関数
 * 開発環境とデプロイメント環境の両方で動作するように複数のパスを試行する
 */
export function resolveMigrationPath(sqlFileName: string): string {
  const possiblePaths = [
    path.join(__dirname, sqlFileName),
    path.join(__dirname, '../../../src/db/migrations', sqlFileName),
    path.join(process.cwd(), 'src/db/migrations', sqlFileName), // デプロイメント構造用
    path.join(process.cwd(), 'backend/src/db/migrations', sqlFileName), // デプロイメント構造用
    path.join(process.cwd(), 'db/migrations', sqlFileName), // デプロイメント構造用 - 実際のSQL配置場所
    path.join(__dirname, '../../../../db/migrations', sqlFileName), // デプロイメント構造用 - 相対パス
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`Found migration file: ${p}`);
      return p;
    }
  }
  
  throw new Error(`Migration file '${sqlFileName}' not found in any of the expected locations: ${possiblePaths.join(', ')}`);
}

/**
 * マイグレーションSQLファイルを読み込む関数
 */
export function readMigrationFile(sqlFileName: string): string {
  const sqlPath = resolveMigrationPath(sqlFileName);
  return fs.readFileSync(sqlPath, 'utf8');
}