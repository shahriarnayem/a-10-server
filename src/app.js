import cors from 'cors';
import express from 'express';

const app = express();

const allowedOrigins = (
  process.env.CLIENT_URL || 'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error(
      'This origin is not permitted to access the AI Prompt Marketplace API.',
    );

    error.statusCode = 403;
    callback(error);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (request, response) => {
  response.status(200).json({
    success: true,
    message: 'AI Prompt Marketplace API is ready.',
    data: {
      service: 'AI Prompt Sharing & Marketplace Platform',
      description:
        'API services for AI prompts, creators, bookmarks, reviews, reports, premium access, and marketplace management.',
      version: '1.0.0',
      healthEndpoint: '/api/health',
    },
  });
});

app.get('/api/health', (request, response) => {
  response.status(200).json({
    success: true,
    message: 'AI Prompt Marketplace API is operating normally.',
    data: {
      service: 'AI Prompt Marketplace API',
      environment: process.env.NODE_ENV || 'development',
      status: 'healthy',
      uptimeInSeconds: Math.floor(process.uptime()),
      checkedAt: new Date().toISOString(),
    },
  });
});

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: `The requested AI Prompt Marketplace endpoint ${request.method} ${request.originalUrl} was not found.`,
  });
});

app.use((error, request, response, next) => {
  void request;
  void next;

  const statusCode = error.statusCode || 500;

  response.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? 'The AI Prompt Marketplace API encountered an unexpected error.'
        : error.message,
    error:
      process.env.NODE_ENV === 'development'
        ? error.message
        : undefined,
  });
});

export default app;