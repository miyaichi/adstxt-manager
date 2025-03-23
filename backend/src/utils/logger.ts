/**
 * バックエンド用ロガーユーティリティ
 * 環境変数に基づいてログレベルを制御します
 */

// 環境変数からログレベルを取得
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDevEnv = process.env.NODE_ENV === 'development';
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

// ログレベルの数値マッピング
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 現在のログレベルを数値に変換
const currentLogLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

// ロガークラス
class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  // エラーログ - 常に表示
  error(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(`${this.prefix}ERROR:`, ...args);
    }
  }

  // 警告ログ - warn以上のログレベルで表示
  warn(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(`${this.prefix}WARN:`, ...args);
    }
  }

  // 情報ログ - info以上のログレベルで表示
  info(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(`${this.prefix}INFO:`, ...args);
    }
  }

  // デバッグログ - debug以上のログレベルで表示
  debug(...args: any[]): void {
    if (currentLogLevel >= LOG_LEVELS.debug || isTestEnv) {
      console.log(`${this.prefix}DEBUG:`, ...args);
    }
  }

  // 開発環境専用ログ - 開発環境でのみ表示
  dev(...args: any[]): void {
    if (isDevEnv) {
      console.log(`${this.prefix}DEV:`, ...args);
    }
  }
}

// デフォルトロガーのインスタンス
const defaultLogger = new Logger();

// 名前付きロガーを作成する関数
export const createLogger = (name: string): Logger => {
  return new Logger(name);
};

// デフォルトエクスポート
export default defaultLogger;