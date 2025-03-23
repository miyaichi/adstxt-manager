/**
 * ロガーユーティリティ
 * 環境変数に基づいてログレベルを制御します
 */

// 環境変数を取得（Reactのプロセス環境変数）
const isTestEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

// ロガークラス
class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  // 情報ログ - 常に表示
  info(...args: any[]): void {
    console.log(`${this.prefix}INFO:`, ...args);
  }

  // 警告ログ - 常に表示
  warn(...args: any[]): void {
    console.warn(`${this.prefix}WARN:`, ...args);
  }

  // エラーログ - 常に表示
  error(...args: any[]): void {
    console.error(`${this.prefix}ERROR:`, ...args);
  }

  // デバッグログ - テスト環境のみ表示
  debug(...args: any[]): void {
    if (isTestEnv) {
      console.log(`${this.prefix}DEBUG:`, ...args);
    }
  }

  // 開発環境専用ログ - 一切表示しない本番環境向け
  dev(...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
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