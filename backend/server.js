const http = require('http');
const WebSocket = require('ws');
const app = require('./app');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const basePort = Number(process.env.PORT || 3000);
const maxRetries = 10;

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'ws connected' }));
});

function listenWithRetry(port, retriesLeft) {
  server.listen(port, () => {
    console.log(`backend running on :${port}`);
  });

  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`port ${port} is busy, retry on ${nextPort}`);
      setTimeout(() => listenWithRetry(nextPort, retriesLeft - 1), 100);
      return;
    }
    console.error(err);
    process.exit(1);
  });
}

listenWithRetry(basePort, maxRetries);
