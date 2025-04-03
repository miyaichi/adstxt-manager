const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_PORT = process.env.BACKEND_PORT || 4000;

// リクエストボディを解析するミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// スタートアップメッセージ
console.log('Starting Ads.txt Manager application...');
console.log(`Main server port: ${PORT}`);
console.log(`Backend server port: ${BACKEND_PORT}`);

// バックエンドサーバーを起動
const startBackend = () => {
  console.log('Starting backend server...');
  
  // 環境変数を設定
  const env = {
    ...process.env,
    PORT: BACKEND_PORT,
    NODE_ENV: process.env.NODE_ENV || 'production',
    DB_PATH: process.env.DB_PATH || './backend/db/database.sqlite',
    // メモリ使用量を制限
    NODE_OPTIONS: '--max-old-space-size=512'
  };
  
  // バックエンドサーバーを子プロセスとして起動
  const backend = spawn('node', ['backend/dist/server.js'], { 
    env,
    stdio: 'inherit'
  });
  
  backend.on('error', (err) => {
    console.error('Failed to start backend server:', err);
  });
  
  backend.on('exit', (code, signal) => {
    console.log(`Backend server exited with code ${code} and signal ${signal}`);
    // 5秒後に再起動を試みる
    setTimeout(startBackend, 5000);
  });
  
  return backend;
};

// バックエンドサーバーを起動
const backendProcess = startBackend();

// プロセス終了時にバックエンドも適切に終了させる
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  backendProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  backendProcess.kill();
  process.exit(0);
});

// APIリクエストをバックエンドにプロキシする簡易ミドルウェア
app.use('/api', (req, res) => {
  // バックエンドが起動するまで待機するシンプルな実装
  const backendUrl = `http://localhost:${BACKEND_PORT}${req.url}`;
  
  // バックエンドへのプロキシを実装
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${BACKEND_PORT}`
    }
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    
    // ヘッダーをコピー
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // レスポンスをパイプ
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (e) => {
    console.error(`Backend proxy error: ${e.message}`);
    res.status(503).json({ 
      error: 'Backend service unavailable',
      message: 'The backend service is currently unavailable. Please try again later.'
    });
  });
  
  // リクエストボディがある場合は転送
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  // リクエストデータをパイプ
  req.pipe(proxyReq, { end: true });
});

// フロントエンドの静的ファイルを配信
app.use(express.static(path.join(__dirname, 'frontend/build')));

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  // バックエンドのヘルスチェックも試みる
  try {
    const http = require('http');
    const backendHealthCheck = http.get(`http://localhost:${BACKEND_PORT}/health`, (backendRes) => {
      if (backendRes.statusCode === 200) {
        res.status(200).json({ 
          status: 'ok',
          frontend: 'ok',
          backend: 'ok'
        });
      } else {
        res.status(200).json({ 
          status: 'ok',
          frontend: 'ok',
          backend: 'error'
        });
      }
    });
    
    backendHealthCheck.on('error', () => {
      res.status(200).json({ 
        status: 'ok',
        frontend: 'ok',
        backend: 'unavailable'
      });
    });
    
    backendHealthCheck.end();
  } catch (err) {
    res.status(200).json({ 
      status: 'ok',
      frontend: 'ok',
      backend: 'unknown error'
    });
  }
});

// SPA用のフォールバックルーティング
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// メインサーバー起動
app.listen(PORT, () => {
  console.log(`Main server running on port ${PORT}`);
});