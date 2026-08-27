import 'dotenv/config';

const supportedEnvironments = new Set([
  'development',
  'test',
  'production',
]);

function getRequiredValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function parsePort(value) {
  const port = Number.parseInt(value || '5000', 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      'PORT must be a valid number between 1 and 65535.',
    );
  }

  return port;
}

function parseClientOrigins(value) {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error(
      'CLIENT_URL must contain at least one frontend URL.',
    );
  }

  origins.forEach((origin) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(origin);
    } catch {
      throw new Error(
        `CLIENT_URL contains an invalid URL: ${origin}`,
      );
    }

    if (
      parsedUrl.protocol !== 'http:' &&
      parsedUrl.protocol !== 'https:'
    ) {
      throw new Error(
        `CLIENT_URL must use http or https: ${origin}`,
      );
    }
  });

  return origins;
}

function validateMongoUri(uri) {
  const validProtocol =
    uri.startsWith('mongodb://') ||
    uri.startsWith('mongodb+srv://');

  if (!validProtocol) {
    throw new Error(
      'MONGODB_URI must begin with mongodb:// or mongodb+srv://',
    );
  }

  return uri;
}

function validateDatabaseName(databaseName) {
  const validDatabaseName = /^[a-zA-Z0-9_-]+$/.test(databaseName);

  if (!validDatabaseName) {
    throw new Error(
      'MONGODB_DB_NAME may contain only letters, numbers, underscores, and hyphens.',
    );
  }

  return databaseName;
}

export function loadEnvironment() {
  const nodeEnvironment = (
    process.env.NODE_ENV || 'development'
  ).trim();

  if (!supportedEnvironments.has(nodeEnvironment)) {
    throw new Error(
      'NODE_ENV must be development, test, or production.',
    );
  }

  const clientUrl = getRequiredValue('CLIENT_URL');
  const mongoUri = getRequiredValue('MONGODB_URI');
  const mongoDatabaseName = getRequiredValue(
    'MONGODB_DB_NAME',
  );

  return Object.freeze({
    port: parsePort(process.env.PORT),
    clientOrigins: parseClientOrigins(clientUrl),
    nodeEnvironment,
    mongoUri: validateMongoUri(mongoUri),
    mongoDatabaseName: validateDatabaseName(
      mongoDatabaseName,
    ),
  });
}