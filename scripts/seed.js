import "dotenv/config";

import {
  closeDatabaseConnection,
  connectToDatabase,
} from "../src/config/database.js";

const now = new Date();

function getDatabaseNameFromUri(uri) {
  if (!uri) {
    return "";
  }

  try {
    const uriWithoutQuery = uri
      .split("?")[0]
      .replace(/\/+$/, "");

    const protocolEnd = uriWithoutQuery.indexOf("://");

    if (protocolEnd === -1) {
      return "";
    }

    const pathStart = uriWithoutQuery.indexOf(
      "/",
      protocolEnd + 3,
    );

    if (pathStart === -1) {
      return "";
    }

    return decodeURIComponent(
      uriWithoutQuery.slice(pathStart + 1).split("/")[0],
    );
  } catch {
    return "";
  }
}

const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL;

const mongoDatabaseName =
  process.env.MONGODB_DATABASE_NAME ||
  process.env.MONGO_DATABASE_NAME ||
  process.env.MONGODB_DATABASE ||
  process.env.MONGODB_DB_NAME ||
  process.env.MONGODB_DB ||
  process.env.DB_NAME ||
  getDatabaseNameFromUri(mongoUri);

const users = [
  {
    name: "Ariana Promptcraft",
    email: "ariana@promptmarket.demo",
    role: "creator",
  },
  {
    name: "Noah Automates",
    email: "noah@promptmarket.demo",
    role: "creator",
  },
  {
    name: "Maya Creative AI",
    email: "maya@promptmarket.demo",
    role: "creator",
  },
  {
    name: "Ethan Research Lab",
    email: "ethan@promptmarket.demo",
    role: "user",
  },
  {
    name: "Sofia Growth Studio",
    email: "sofia@promptmarket.demo",
    role: "user",
  },
  {
    name: "PromptMarket Admin",
    email: "admin@promptmarket.demo",
    role: "admin",
  },
].map((user, index) => ({
  ...user,
  firebaseUid: `demo-marketplace-user-${index + 1}`,
  photoURL: `https://i.pravatar.cc/300?img=${index + 20}`,
  subscription: index === 3 ? "premium" : "free",
  accountStatus: "active",
  createdAt: new Date(
    now.getTime() - (index + 1) * 86400000,
  ),
  updatedAt: now,
}));

const promptBlueprints = [
  [
    "Conversion-Focused Product Description",
    "Marketing",
    "ChatGPT",
    "Beginner",
    ["ecommerce", "copywriting", "conversion"],
  ],
  [
    "SaaS Landing Page Positioning",
    "Marketing",
    "Claude",
    "Intermediate",
    ["saas", "landing-page", "positioning"],
  ],
  [
    "Accessible React Component Reviewer",
    "Development",
    "ChatGPT",
    "Pro",
    ["react", "accessibility", "code-review"],
  ],
  [
    "MongoDB Aggregation Planner",
    "Development",
    "Gemini",
    "Pro",
    ["mongodb", "aggregation", "backend"],
  ],
  [
    "Startup Customer Interview Guide",
    "Business",
    "Claude",
    "Beginner",
    ["startup", "research", "interview"],
  ],
  [
    "Weekly Operations Automation Map",
    "Productivity",
    "ChatGPT",
    "Intermediate",
    ["automation", "workflow", "operations"],
  ],
  [
    "Course Lesson Plan Builder",
    "Education",
    "Gemini",
    "Beginner",
    ["education", "lesson-plan", "teaching"],
  ],
  [
    "Editorial Illustration Art Director",
    "Design",
    "Midjourney",
    "Pro",
    ["illustration", "art-direction", "midjourney"],
  ],
  [
    "Technical Blog Outline Architect",
    "Writing",
    "Claude",
    "Intermediate",
    ["technical-writing", "blog", "outline"],
  ],
  [
    "CSV Insight and Anomaly Analyst",
    "Data Analysis",
    "ChatGPT",
    "Pro",
    ["csv", "analytics", "anomaly"],
  ],
  [
    "Social Campaign Content Calendar",
    "Marketing",
    "Gemini",
    "Beginner",
    ["social-media", "calendar", "campaign"],
  ],
  [
    "User Persona Evidence Synthesizer",
    "Business",
    "Claude",
    "Intermediate",
    ["persona", "ux-research", "strategy"],
  ],
];

async function seedDatabase() {
  if (!mongoUri) {
    throw new Error(
      "MongoDB URI is missing from the server .env file.",
    );
  }

  if (!mongoDatabaseName) {
    throw new Error(
      "MongoDB database name is missing from the server .env file.",
    );
  }

  const database = await connectToDatabase({
    mongoUri,
    mongoDatabaseName,
  });

  const collectionsToClear = [
    "warnings",
    "payments",
    "reports",
    "bookmarks",
    "reviews",
    "prompts",
    "users",
  ];

  await Promise.all(
    collectionsToClear.map((collectionName) =>
      database
        .collection(collectionName)
        .deleteMany({}),
    ),
  );

  const userResult = await database
    .collection("users")
    .insertMany(users);

  const userIds = Object.values(userResult.insertedIds);

  const prompts = promptBlueprints.map(
    (blueprint, index) => {
      const [
        title,
        category,
        aiModel,
        difficultyLevel,
        tags,
      ] = blueprint;

      const visibility =
        index % 4 === 0 ? "private" : "public";

      const slug = `${title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}-${index + 1}`;

      return {
        title,
        slug,
        description: `${title} helps marketplace users produce consistent, reusable AI results with clear variables and practical instructions.`,
        promptText: `Act as an AI specialist for ${category.toLowerCase()}. Complete {{goal}} for {{audience}} using {{context}}. Return a structured result with assumptions, recommendations, and a quality checklist.`,
        usageInstructions:
          "Replace each variable with project-specific information, then submit the complete instruction to the listed AI tool.",
        category,
        aiModel,
        aiTool: aiModel,
        difficultyLevel,
        difficulty: difficultyLevel,
        tags,
        imageUrl: `https://picsum.photos/seed/prompt-${index + 1}/1200/800`,
        visibility,
        accessLevel:
          visibility === "private"
            ? "premium"
            : "free",
        status: "approved",
        rejectionFeedback: "",
        featured: index < 6,
        creatorId: userIds[index % 3],
        creatorName: users[index % 3].name,
        creatorEmail: users[index % 3].email,
        copyCount: 18 + index * 7,
        viewCount: 90 + index * 23,
        averageRating: Number(
          (4 + (index % 5) * 0.2).toFixed(1),
        ),
        reviewCount: index < 10 ? 1 : 0,
        createdAt: new Date(
          now.getTime() -
            (12 - index) * 43200000,
        ),
        updatedAt: now,
      };
    },
  );

  const promptResult = await database
    .collection("prompts")
    .insertMany(prompts);

  const promptIds = Object.values(
    promptResult.insertedIds,
  );

  const reviews = promptIds
    .slice(0, 10)
    .map((promptId, index) => ({
      promptId,
      userId: userIds[(index + 3) % 5],
      userName: users[(index + 3) % 5].name,
      userEmail: users[(index + 3) % 5].email,
      rating: 4 + (index % 2),
      comment:
        "This marketplace prompt produced a clear result and the variables were easy to adapt to a real project.",
      createdAt: new Date(
        now.getTime() - index * 3600000,
      ),
      updatedAt: now,
    }));

  const bookmarks = promptIds
    .slice(0, 8)
    .map((promptId, index) => ({
      promptId,
      userId: userIds[(index + 3) % 5],
      createdAt: new Date(
        now.getTime() - index * 1800000,
      ),
    }));

  await database
    .collection("reviews")
    .insertMany(reviews);

  await database
    .collection("bookmarks")
    .insertMany(bookmarks);

  await database.collection("reports").insertMany([
    {
      promptId: promptIds[2],
      userId: userIds[4],
      reason: "Spam",
      description:
        "Repeated promotional wording requires moderation.",
      status: "open",
      createdAt: now,
    },
    {
      promptId: promptIds[7],
      userId: userIds[3],
      reason: "Copyright Violation",
      description:
        "The visual direction may reproduce protected campaign language.",
      status: "open",
      createdAt: now,
    },
  ]);

  await database.collection("payments").insertOne({
    transactionId: "demo-premium-transaction-001",
    userId: userIds[3],
    email: users[3].email,
    amount: 5,
    currency: "usd",
    status: "paid",
    createdAt: now,
  });

  await database.collection("warnings").insertOne({
    userId: userIds[1],
    message:
      "Review marketplace originality guidance before publishing similar prompt variations.",
    createdAt: now,
  });

  console.log(
    "AI prompt marketplace demo data created successfully.",
  );
}

async function runSeed() {
  try {
    await seedDatabase();
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection().catch(
      (closeError) => {
        console.error(
          "Failed to close MongoDB connection:",
          closeError,
        );

        process.exitCode = 1;
      },
    );
  }
}

await runSeed();