import app, { wss } from './app.js';
import { webSocketController } from './controllers/websocket.controller.js';

import type { HandlerWebSocket } from './types/websocket.type.js';

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
  socket.on('error', (err) => {
    console.error('WebSocket socket error:', err);
  });
});

wss.on('connection', (ws: HandlerWebSocket) => {
  // TODO: Assign handlerWs.userId here based on authentication/session/query, for now use a random string for demo
  if (!ws.userId) {
    ws.userId = Math.random().toString(36).substring(2, 15);
  }

  ws.on('message', (message) => {
    if (typeof message === 'string') {
      webSocketController.handleMessage(ws, message);
    } else {
      console.warn('Received non-string WebSocket message:', message);
      ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid message format.' } }));
    }

  });
});
