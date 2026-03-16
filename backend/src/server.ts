import app from './app';
import { env } from './config/env';
import { pool, initDb } from './config/database';

async function start() {
  await initDb();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 KodLearn API running on port ${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Frontend URL: ${env.FRONTEND_URL}`);
  });

  async function gracefulShutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down gracefully…`);
    server.close(async () => {
      await pool.end();
      console.log('✅ Server closed and database disconnected');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
