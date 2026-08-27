import 'dotenv/config';
import app from './app.js';

const port = Number.parseInt(process.env.PORT || '5000', 10);

const server = app.listen(port, () => {
  console.log(
    `[AI Prompt Marketplace API] Server running at http://localhost:${port}`,
  );

  console.log(
    `[AI Prompt Marketplace API] Health check available at http://localhost:${port}/api/health`,
  );
});

function shutDownServer(signal) {
  console.log(
    `[AI Prompt Marketplace API] ${signal} received. Closing the server safely.`,
  );

  server.close(() => {
    console.log('[AI Prompt Marketplace API] Server closed successfully.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      '[AI Prompt Marketplace API] Forced shutdown after waiting for active requests.',
    );

    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => {
  shutDownServer('SIGTERM');
});

process.on('SIGINT', () => {
  shutDownServer('SIGINT');
});