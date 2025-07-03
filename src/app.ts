import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const wss = new WebSocketServer({ noServer: true });

export { wss };
export default app;