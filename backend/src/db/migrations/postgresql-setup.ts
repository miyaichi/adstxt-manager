/**
 * PostgreSQL データベース設定用スクリプト
 *
 * SQLiteからPostgreSQLへのデータ移行を支援するツール
 */

import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// PostgreSQL接続設定
const pgPool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'adstxt_manager',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

// SQLiteデータベースのパス
const sqlitePath = process.env.DB_PATH || path.join(__dirname, '../../../db/database.sqlite');

/**
 * テーブル構造を作成する
 */
async function createTables() {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    // リクエストテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        publisher_email TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        requester_name TEXT NOT NULL,
        publisher_name TEXT,
        publisher_domain TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // メッセージテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests (id)
      )
    `);

    // Ads.txtレコードテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads_txt_records (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_type TEXT NOT NULL,
        certification_authority_id TEXT,
        relationship TEXT DEFAULT 'DIRECT',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES requests (id)
      )
    `);

    // Ads.txtキャッシュテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads_txt_cache (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        content TEXT,
        status INTEGER DEFAULT 0,
        last_fetched TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Sellers.jsonキャッシュテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS sellers_json_cache (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        seller_type TEXT,
        name TEXT,
        domain_match INTEGER DEFAULT 0,
        is_confidential INTEGER DEFAULT 0,
        last_fetched TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(domain, seller_id)
      )
    `);

    await client.query('COMMIT');
    console.log('PostgreSQLテーブルが正常に作成されました');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('PostgreSQLテーブル作成エラー:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * SQLiteからPostgreSQLにデータを移行する
 */
async function migrateData() {
  console.log('SQLiteからPostgreSQLへのデータ移行を開始します...');

  // SQLiteデータベースを開く
  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLiteデータベースが見つかりません: ${sqlitePath}`);
    return;
  }

  const db = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  // PostgreSQL接続を取得
  const client = await pgPool.connect();

  try {
    // テーブルごとにトランザクションを分割して実行することで、一部のエラーがあっても他のテーブルのデータ移行を続行できるようにする
    console.log('データ移行を開始します - 各テーブルは個別のトランザクションで処理されます');

    // リクエストデータの移行
    try {
      await client.query('BEGIN');
      const requests = await db.all('SELECT * FROM requests');
      if (requests.length > 0) {
        let migratedCount = 0;
        for (const request of requests) {
          try {
            await client.query(
              'INSERT INTO requests (id, publisher_email, requester_email, requester_name, publisher_name, publisher_domain, status, token, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
              [
                request.id,
                request.publisher_email,
                request.requester_email,
                request.requester_name,
                request.publisher_name,
                request.publisher_domain,
                request.status,
                request.token,
                request.created_at,
                request.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`リクエストの移行エラー (id: ${request.id}):`, err);
          }
        }
        console.log(`${migratedCount}/${requests.length}件のリクエストを移行しました`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('リクエストテーブルの移行中にエラーが発生しました:', err);
    }

    // メッセージデータの移行
    try {
      await client.query('BEGIN');
      const messages = await db.all('SELECT * FROM messages');
      if (messages.length > 0) {
        let migratedCount = 0;
        for (const message of messages) {
          try {
            await client.query(
              'INSERT INTO messages (id, request_id, sender_email, content, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
              [
                message.id,
                message.request_id,
                message.sender_email,
                message.content,
                message.created_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`メッセージの移行エラー (id: ${message.id}):`, err);
          }
        }
        console.log(`${migratedCount}/${messages.length}件のメッセージを移行しました`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('メッセージテーブルの移行中にエラーが発生しました:', err);
    }

    // Ads.txtレコードデータの移行
    try {
      await client.query('BEGIN');
      const adsTxtRecords = await db.all('SELECT * FROM ads_txt_records');
      if (adsTxtRecords.length > 0) {
        let migratedCount = 0;
        for (const record of adsTxtRecords) {
          try {
            await client.query(
              'INSERT INTO ads_txt_records (id, request_id, domain, account_id, account_type, certification_authority_id, relationship, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
              [
                record.id,
                record.request_id,
                record.domain,
                record.account_id,
                record.account_type,
                record.certification_authority_id,
                record.relationship,
                record.status,
                record.created_at,
                record.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Ads.txtレコードの移行エラー (id: ${record.id}):`, err);
          }
        }
        console.log(`${migratedCount}/${adsTxtRecords.length}件のAds.txtレコードを移行しました`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Ads.txtレコードテーブルの移行中にエラーが発生しました:', err);
    }

    // Ads.txtキャッシュデータの移行
    try {
      await client.query('BEGIN');
      const adsTxtCache = await db.all('SELECT * FROM ads_txt_cache');
      if (adsTxtCache.length > 0) {
        let migratedCount = 0;
        for (const cache of adsTxtCache) {
          try {
            // statusの値が文字列の場合は整数に変換
            let statusValue = cache.status;
            if (typeof statusValue === 'string') {
              // 文字列の場合は適切な整数値に変換
              if (statusValue === 'success') {
                statusValue = 1;
              } else if (statusValue === 'error') {
                statusValue = 0;
              } else {
                // 数値に変換を試みる
                statusValue = parseInt(statusValue) || 0;
              }
            }

            await client.query(
              'INSERT INTO ads_txt_cache (id, domain, content, status, last_fetched, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
              [
                cache.id,
                cache.domain,
                cache.content,
                statusValue,
                cache.last_fetched,
                cache.created_at,
                cache.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Ads.txtキャッシュの移行エラー (id: ${cache.id}):`, err);
          }
        }
        console.log(`${migratedCount}/${adsTxtCache.length}件のAds.txtキャッシュを移行しました`);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Ads.txtキャッシュテーブルの移行中にエラーが発生しました:', err);
    }

    // Sellers.jsonキャッシュデータの移行
    try {
      await client.query('BEGIN');
      const sellersJsonCache = await db.all('SELECT * FROM sellers_json_cache');
      if (sellersJsonCache.length > 0) {
        let migratedCount = 0;

        for (const cache of sellersJsonCache) {
          // seller_idがnullの場合はスキップ
          if (!cache.seller_id) {
            console.log(
              `警告: seller_idがnullのレコードをスキップします (id: ${cache.id}, domain: ${cache.domain})`
            );
            continue;
          }

          // domain_matchとis_confidentialが文字列の場合は整数に変換
          let domainMatch =
            typeof cache.domain_match === 'string'
              ? cache.domain_match === 'true' || cache.domain_match === '1'
                ? 1
                : 0
              : cache.domain_match
                ? 1
                : 0;

          let isConfidential =
            typeof cache.is_confidential === 'string'
              ? cache.is_confidential === 'true' || cache.is_confidential === '1'
                ? 1
                : 0
              : cache.is_confidential
                ? 1
                : 0;

          try {
            await client.query(
              'INSERT INTO sellers_json_cache (id, domain, seller_id, seller_type, name, domain_match, is_confidential, last_fetched, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
              [
                cache.id,
                cache.domain,
                cache.seller_id || 'unknown',
                cache.seller_type,
                cache.name,
                domainMatch,
                isConfidential,
                cache.last_fetched,
                cache.created_at,
                cache.updated_at,
              ]
            );
            migratedCount++;
          } catch (err) {
            console.error(`Sellers.jsonキャッシュの移行エラー (id: ${cache.id}):`, err);
          }
        }
        console.log(
          `${migratedCount}/${sellersJsonCache.length}件のSellers.jsonキャッシュを移行しました`
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Sellers.jsonキャッシュテーブルの移行中にエラーが発生しました:', err);
    }

    console.log('データ移行が正常に完了しました');
  } catch (error) {
    console.error('データ移行エラー:', error);

    // より詳細なデバッグ情報を提供
    if (error instanceof Error) {
      console.error('エラータイプ:', error.constructor.name);
      console.error('エラーメッセージ:', error.message);
      console.error('スタックトレース:', error.stack);

      // PostgreSQLエラーの追加情報を表示
      const pgError = error as any;
      if (pgError.code) {
        console.error('PostgreSQLエラーコード:', pgError.code);
        console.error('PostgreSQLエラー詳細:', {
          severity: pgError.severity,
          detail: pgError.detail,
          hint: pgError.hint,
          position: pgError.position,
          table: pgError.table,
          column: pgError.column,
          dataType: pgError.dataType,
          constraint: pgError.constraint,
          file: pgError.file,
          line: pgError.line,
          routine: pgError.routine,
        });
      }
    }

    throw error;
  } finally {
    client.release();
    await db.close();
  }
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    // テーブルの作成
    await createTables();

    // データ移行の確認
    const answer = process.argv.includes('--migrate')
      ? 'y'
      : process.argv.includes('--no-migrate')
        ? 'n'
        : null;

    if (answer === null) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await new Promise<void>((resolve) => {
        readline.question(
          'SQLiteからPostgreSQLにデータを移行しますか？ (y/n): ',
          async (ans: string) => {
            if (ans.toLowerCase() === 'y') {
              await migrateData();
            } else {
              console.log('データ移行はスキップされました');
            }
            readline.close();
            resolve();
          }
        );
      });
    } else if (answer === 'y') {
      await migrateData();
    } else {
      console.log('データ移行はスキップされました');
    }

    console.log('PostgreSQL設定が完了しました');
  } catch (error) {
    console.error('PostgreSQL設定エラー:', error);
    process.exit(1);
  } finally {
    // プールを終了
    await pgPool.end();
  }
}

// スクリプトの実行
if (require.main === module) {
  main();
}

export { createTables, migrateData };
