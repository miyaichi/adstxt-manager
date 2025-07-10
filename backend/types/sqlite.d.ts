declare module 'sqlite' {
  export function open(config: { filename: string; driver: any }): Promise<Database>;

  export interface Database {
    all<T = any>(sql: string, params?: any[]): Promise<T[]>;
    get<T = any>(sql: string, params?: any[]): Promise<T>;
    run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
    exec(sql: string): Promise<void>;
    close(): Promise<void>;
  }
}
