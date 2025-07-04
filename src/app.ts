import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();

app.get('/', (_req, res) => {
  res.send('Hello World!');
});

app.get('/api', (_req, res) => {
  res.send('API is running.');
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'Ok' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const wss = new WebSocketServer({ noServer: true });

export { wss };
export default app;
