import { config } from './config.js';
import { createApp } from './app.js';

const server = createApp().listen(config.port, () => {
  console.log(`school-backend chạy tại http://localhost:${config.port} (${config.env})`);
});

const stop = sig => () => {
  console.log(`${sig}: đang tắt...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', stop('SIGINT'));
process.on('SIGTERM', stop('SIGTERM'));
process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));
