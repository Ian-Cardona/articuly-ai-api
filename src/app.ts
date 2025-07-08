import express, { type Request, type Response } from 'express';

import { getSessionStats } from './services/session_monitor.service.ts';
import { httpRequestLogger, notFoundHandler, httpErrorHandler } from './middlewares/index.ts';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use structured logging middleware
app.use(httpRequestLogger);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: getSessionStats(),
  });
});

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'SpeakFast API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(httpErrorHandler);

export default app;
