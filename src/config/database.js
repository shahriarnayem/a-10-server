import {
  MongoClient,
  ServerApiVersion,
} from 'mongodb';

let mongoClient = null;
let database = null;

export async function connectToDatabase({
  mongoUri,
  mongoDatabaseName,
}) {
  if (database) {
    return database;
  }

  mongoClient = new MongoClient(mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await mongoClient.connect();

    database = mongoClient.db(mongoDatabaseName);

    await database.command({
      ping: 1,
    });

    return database;
  } catch (error) {
    if (mongoClient) {
      await mongoClient
        .close()
        .catch(() => undefined);
    }

    mongoClient = null;
    database = null;

    throw new Error(
      `Unable to connect to the AI Prompt Marketplace database: ${error.message}`,
      {
        cause: error,
      },
    );
  }
}

export function getDatabase() {
  if (!database) {
    throw new Error(
      'The AI Prompt Marketplace database is not connected.',
    );
  }

  return database;
}

export async function pingDatabase() {
  const connectedDatabase = getDatabase();

  const result = await connectedDatabase.command({
    ping: 1,
  });

  return result.ok === 1;
}

export async function closeDatabaseConnection() {
  if (!mongoClient) {
    return;
  }

  await mongoClient.close();

  mongoClient = null;
  database = null;
}