import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  // App mobile không cần CORS; chỉ bật cho các origin web được khai báo
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
  app.use(express.json({ limit: '100kb' }));
  if (!config.isProd) app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Bạn gửi yêu cầu quá nhanh, vui lòng thử lại sau' },
  }), routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
