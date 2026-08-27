import { COLLECTIONS } from './collections.js';

export async function ensureDatabaseIndexes(database) {
  await Promise.all([
    database.collection(COLLECTIONS.USERS).createIndexes([
      {
        key: { email: 1 },
        name: 'users_email_unique',
        unique: true,
      },
      {
        key: { role: 1, subscriptionStatus: 1 },
        name: 'users_role_subscription',
      },
      {
        key: { createdAt: -1 },
        name: 'users_created_at',
      },
    ]),

    database.collection(COLLECTIONS.PROMPTS).createIndexes([
      {
        key: { slug: 1 },
        name: 'prompts_slug_unique',
        unique: true,
      },
      {
        key: {
          title: 'text',
          description: 'text',
          tags: 'text',
          aiTool: 'text',
        },
        name: 'prompts_marketplace_search',
        weights: {
          title: 10,
          tags: 7,
          aiTool: 5,
          description: 2,
        },
      },
      {
        key: {
          status: 1,
          visibility: 1,
          createdAt: -1,
        },
        name: 'prompts_marketplace_visibility',
      },
      {
        key: {
          category: 1,
          aiTool: 1,
          difficultyLevel: 1,
        },
        name: 'prompts_marketplace_filters',
      },
      {
        key: {
          isFeatured: 1,
          status: 1,
          copyCount: -1,
        },
        name: 'prompts_featured_popularity',
      },
      {
        key: {
          creatorId: 1,
          status: 1,
          createdAt: -1,
        },
        name: 'prompts_creator_management',
      },
      {
        key: {
          averageRating: -1,
          copyCount: -1,
          createdAt: -1,
        },
        name: 'prompts_sorting',
      },
    ]),

    database.collection(COLLECTIONS.REVIEWS).createIndexes([
      {
        key: {
          promptId: 1,
          userId: 1,
        },
        name: 'reviews_prompt_user_unique',
        unique: true,
      },
      {
        key: {
          promptId: 1,
          createdAt: -1,
        },
        name: 'reviews_prompt_date',
      },
      {
        key: {
          userId: 1,
          createdAt: -1,
        },
        name: 'reviews_user_date',
      },
    ]),

    database.collection(COLLECTIONS.BOOKMARKS).createIndexes([
      {
        key: {
          userId: 1,
          promptId: 1,
        },
        name: 'bookmarks_user_prompt_unique',
        unique: true,
      },
      {
        key: {
          userId: 1,
          createdAt: -1,
        },
        name: 'bookmarks_user_date',
      },
    ]),

    database.collection(COLLECTIONS.REPORTS).createIndexes([
      {
        key: {
          status: 1,
          createdAt: -1,
        },
        name: 'reports_status_date',
      },
      {
        key: {
          promptId: 1,
          reporterId: 1,
        },
        name: 'reports_prompt_reporter',
      },
    ]),

    database.collection(COLLECTIONS.PAYMENTS).createIndexes([
      {
        key: { transactionId: 1 },
        name: 'payments_transaction_unique',
        unique: true,
      },
      {
        key: {
          userId: 1,
          createdAt: -1,
        },
        name: 'payments_user_date',
      },
    ]),

    database.collection(COLLECTIONS.WARNINGS).createIndexes([
      {
        key: {
          creatorId: 1,
          createdAt: -1,
        },
        name: 'warnings_creator_date',
      },
      {
        key: {
          promptId: 1,
          status: 1,
        },
        name: 'warnings_prompt_status',
      },
    ]),
  ]);
}