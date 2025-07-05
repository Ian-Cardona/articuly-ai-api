import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'Ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (_req, res) => {
  res.json({
    message: 'SpeakFast API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const wss = new WebSocketServer({ noServer: true });

export { wss };
export default app;
