import { ObjectId } from 'mongodb';

function createPhotoUrl(photoId, width = 900) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

function createUser({
  id,
  name,
  email,
  photoId,
  role,
  subscriptionStatus,
  joinedAt,
}) {
  const createdAt = new Date(joinedAt);

  return {
    _id: new ObjectId(id),
    name,
    email,
    photoURL: createPhotoUrl(photoId, 400),
    role,
    subscriptionStatus,
    isPremium: subscriptionStatus === 'premium',
    accountStatus: 'active',
    authenticationProvider: 'demo',
    createdAt,
    updatedAt: createdAt,
  };
}

export const seedUsers = [
  createUser({
    id: '660000000000000000000001',
    name: 'Nora Bennett',
    email: 'admin.promptmarket@example.com',
    photoId: 'photo-1494790108377-be9c29b29330',
    role: 'admin',
    subscriptionStatus: 'premium',
    joinedAt: '2026-06-02T09:00:00.000Z',
  }),
  createUser({
    id: '660000000000000000000002',
    name: 'Maya Chen',
    email: 'maya.creator@example.com',
    photoId: 'photo-1534528741775-53994a69daeb',
    role: 'creator',
    subscriptionStatus: 'premium',
    joinedAt: '2026-06-10T11:30:00.000Z',
  }),
  createUser({
    id: '660000000000000000000003',
    name: 'Daniel Brooks',
    email: 'daniel.creator@example.com',
    photoId: 'photo-1500648767791-00dcc994a43e',
    role: 'creator',
    subscriptionStatus: 'free',
    joinedAt: '2026-06-18T08:15:00.000Z',
  }),
  createUser({
    id: '660000000000000000000004',
    name: 'Aisha Rahman',
    email: 'aisha.creator@example.com',
    photoId: 'photo-1544005313-94ddf0286df2',
    role: 'creator',
    subscriptionStatus: 'premium',
    joinedAt: '2026-06-24T14:00:00.000Z',
  }),
  createUser({
    id: '660000000000000000000005',
    name: 'Sophia Carter',
    email: 'sophia.user@example.com',
    photoId: 'photo-1517841905240-472988babdf9',
    role: 'user',
    subscriptionStatus: 'free',
    joinedAt: '2026-07-01T10:20:00.000Z',
  }),
  createUser({
    id: '660000000000000000000006',
    name: 'Ethan Walker',
    email: 'ethan.user@example.com',
    photoId: 'photo-1507003211169-0a1dd7228f2d',
    role: 'user',
    subscriptionStatus: 'premium',
    joinedAt: '2026-07-08T16:45:00.000Z',
  }),
];

const admin = seedUsers[0];
const maya = seedUsers[1];
const daniel = seedUsers[2];
const aisha = seedUsers[3];
const sophia = seedUsers[4];
const ethan = seedUsers[5];

function createPrompt({
  id,
  creator,
  title,
  slug,
  description,
  promptContent,
  category,
  aiTool,
  tags,
  difficultyLevel,
  usageInstructions,
  photoId,
  visibility,
  status,
  isFeatured,
  copyCount,
  createdAt,
  rejectionFeedback = null,
}) {
  const publishedAt = new Date(createdAt);

  return {
    _id: new ObjectId(id),
    title,
    slug,
    description,
    promptContent,
    category,
    aiTool,
    tags,
    difficultyLevel,
    usageInstructions,
    thumbnailURL: createPhotoUrl(photoId),
    visibility,
    status,
    isFeatured,
    copyCount,
    averageRating: 0,
    reviewCount: 0,
    bookmarkCount: 0,
    creatorId: creator._id,
    creatorName: creator.name,
    creatorEmail: creator.email,
    rejectionFeedback,
    createdAt: publishedAt,
    updatedAt: publishedAt,
  };
}

export const seedPrompts = [
  createPrompt({
    id: '670000000000000000000001',
    creator: maya,
    title: 'High-Converting SaaS Landing Page Strategist',
    slug: 'high-converting-saas-landing-page-strategist',
    description:
      'Create a complete SaaS landing-page structure based on audience pain points, benefits, objections, and conversion goals.',
    promptContent:
      'Act as an experienced SaaS conversion strategist. Using the product details, target audience, primary pain points, key benefits, objections, and desired action I provide, create a complete landing-page outline. Include a clear hero message, social proof, benefit sections, feature explanations, objection handling, frequently asked questions, and conversion-focused calls to action.',
    category: 'Marketing',
    aiTool: 'ChatGPT',
    tags: ['saas', 'landing page', 'conversion', 'copywriting'],
    difficultyLevel: 'Intermediate',
    usageInstructions:
      'Replace the product, audience, benefits, objections, and desired action before submitting the prompt.',
    photoId: 'photo-1552664730-d307ca884978',
    visibility: 'public',
    status: 'approved',
    isFeatured: true,
    copyCount: 1284,
    createdAt: '2026-07-12T09:30:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000002',
    creator: maya,
    title: 'Editorial Product Photography Director',
    slug: 'editorial-product-photography-director',
    description:
      'Produce sophisticated product-scene directions with professional lighting, composition, camera, texture, and brand mood.',
    promptContent:
      'Create an editorial product photography scene for the supplied product. Define the environment, background materials, lighting direction, shadows, lens choice, camera angle, composition, color palette, surface texture, and overall brand mood. Keep the product accurate, readable, and visually dominant.',
    category: 'Image Generation',
    aiTool: 'Midjourney',
    tags: ['product photography', 'editorial', 'lighting', 'branding'],
    difficultyLevel: 'Pro',
    usageInstructions:
      'Provide the product type, brand personality, preferred colors, aspect ratio, and intended advertising platform.',
    photoId: 'photo-1542744173-8e7e53415bb0',
    visibility: 'private',
    status: 'approved',
    isFeatured: true,
    copyCount: 931,
    createdAt: '2026-07-15T13:10:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000003',
    creator: daniel,
    title: 'Full-Stack Bug Investigation Guide',
    slug: 'full-stack-bug-investigation-guide',
    description:
      'Investigate frontend and backend errors systematically before recommending focused, testable fixes.',
    promptContent:
      'Act as a senior full-stack debugging partner. Review the error message, relevant files, expected behavior, actual behavior, environment, and recent changes I provide. Identify the most likely root causes, explain the evidence for each cause, propose the smallest safe fix, and give clear verification steps.',
    category: 'Development',
    aiTool: 'Claude',
    tags: ['debugging', 'react', 'nodejs', 'problem solving'],
    difficultyLevel: 'Intermediate',
    usageInstructions:
      'Include the complete error, related code, reproduction steps, and recent changes. Remove secrets before sharing.',
    photoId: 'photo-1461749280684-dccba630e2f6',
    visibility: 'public',
    status: 'approved',
    isFeatured: true,
    copyCount: 1088,
    createdAt: '2026-07-18T07:40:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000004',
    creator: aisha,
    title: 'Research Synthesis and Evidence Mapper',
    slug: 'research-synthesis-and-evidence-mapper',
    description:
      'Compare multiple research sources, identify agreement and disagreement, and organize evidence into useful themes.',
    promptContent:
      'Act as a research synthesis specialist. Analyze the supplied research summaries and organize the findings into major themes. Separate strong evidence from weak evidence, identify agreements, contradictions, limitations, knowledge gaps, and practical conclusions. Do not invent sources or claims.',
    category: 'Research',
    aiTool: 'Gemini',
    tags: ['research', 'evidence', 'analysis', 'synthesis'],
    difficultyLevel: 'Pro',
    usageInstructions:
      'Provide source summaries with titles, dates, authors, and links whenever available.',
    photoId: 'photo-1434030216411-0b793f4b4173',
    visibility: 'private',
    status: 'approved',
    isFeatured: true,
    copyCount: 776,
    createdAt: '2026-07-20T15:20:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000005',
    creator: maya,
    title: 'Empathetic Customer Support Response Architect',
    slug: 'empathetic-customer-support-response-architect',
    description:
      'Turn customer complaints into calm, helpful, and brand-appropriate support responses.',
    promptContent:
      'Act as a customer support specialist. Write a concise and empathetic response to the customer message I provide. Acknowledge the concern, explain the next action clearly, avoid blame, maintain the supplied brand voice, and close with a realistic resolution or follow-up expectation.',
    category: 'Customer Support',
    aiTool: 'ChatGPT',
    tags: ['customer support', 'email', 'service', 'communication'],
    difficultyLevel: 'Beginner',
    usageInstructions:
      'Provide the customer message, company policy, desired tone, and available resolution options.',
    photoId: 'photo-1553484771-371a605b060b',
    visibility: 'public',
    status: 'approved',
    isFeatured: false,
    copyCount: 642,
    createdAt: '2026-07-23T10:00:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000006',
    creator: daniel,
    title: 'Short-Form Educational Video Script Engine',
    slug: 'short-form-educational-video-script-engine',
    description:
      'Create engaging short-video scripts with a strong hook, useful explanation, pattern changes, and natural CTA.',
    promptContent:
      'Act as a short-form educational video strategist. Create a script for the topic, audience, platform, and duration I provide. Include a compelling opening hook, concise teaching points, visual directions, pattern interruptions, on-screen text, and a natural call to action.',
    category: 'Social Media',
    aiTool: 'Claude',
    tags: ['video script', 'reels', 'shorts', 'education'],
    difficultyLevel: 'Intermediate',
    usageInstructions:
      'Specify the topic, audience, video duration, platform, tone, and desired viewer action.',
    photoId: 'photo-1611162617474-5b21e879e113',
    visibility: 'public',
    status: 'approved',
    isFeatured: true,
    copyCount: 1196,
    createdAt: '2026-07-26T12:25:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000007',
    creator: aisha,
    title: 'Benefit-Led Ecommerce Description Studio',
    slug: 'benefit-led-ecommerce-description-studio',
    description:
      'Write clear product descriptions that translate specifications into customer-focused benefits.',
    promptContent:
      'Act as an ecommerce copywriter. Using the product specifications, target customer, use cases, differentiators, and brand voice I provide, write a benefit-led product description. Include a concise opening, scannable benefits, important specifications, appropriate use cases, and an honest call to action.',
    category: 'Ecommerce',
    aiTool: 'Gemini',
    tags: ['ecommerce', 'product description', 'sales', 'copywriting'],
    difficultyLevel: 'Beginner',
    usageInstructions:
      'Provide accurate product information and never include benefits the product cannot support.',
    photoId: 'photo-1556742049-0cfed4f6a45d',
    visibility: 'public',
    status: 'approved',
    isFeatured: true,
    copyCount: 887,
    createdAt: '2026-07-29T09:50:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000008',
    creator: aisha,
    title: 'Strategic Brand Identity Moodboard',
    slug: 'strategic-brand-identity-moodboard',
    description:
      'Translate a brand strategy into a cohesive visual moodboard direction for image-generation tools.',
    promptContent:
      'Develop a sophisticated visual moodboard for the supplied brand. Define the color atmosphere, typography personality, photographic style, materials, textures, lighting, composition, cultural references, and emotional tone. Keep every visual choice aligned with the audience and brand positioning.',
    category: 'Branding',
    aiTool: 'Midjourney',
    tags: ['branding', 'moodboard', 'visual identity', 'creative direction'],
    difficultyLevel: 'Intermediate',
    usageInstructions:
      'Provide the brand purpose, audience, values, personality, competitors, and visual preferences.',
    photoId: 'photo-1541701494587-cb58502866ab',
    visibility: 'private',
    status: 'approved',
    isFeatured: false,
    copyCount: 504,
    createdAt: '2026-08-01T14:35:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000009',
    creator: maya,
    title: 'Meeting Summary and Action Planner',
    slug: 'meeting-summary-and-action-planner',
    description:
      'Convert meeting notes into decisions, action items, responsibilities, deadlines, and unresolved questions.',
    promptContent:
      'Act as an operations assistant. Analyze the meeting transcript or notes I provide. Produce a concise summary, key decisions, action items, responsible owners, deadlines, risks, dependencies, unresolved questions, and the recommended agenda for the next meeting.',
    category: 'Productivity',
    aiTool: 'ChatGPT',
    tags: ['meeting', 'productivity', 'action items', 'planning'],
    difficultyLevel: 'Beginner',
    usageInstructions:
      'Remove confidential information and provide participant names only when necessary for assigning responsibilities.',
    photoId: 'photo-1521737711867-e3b97375f902',
    visibility: 'public',
    status: 'approved',
    isFeatured: false,
    copyCount: 721,
    createdAt: '2026-08-04T08:45:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000010',
    creator: aisha,
    title: 'SQL Query Optimization Coach',
    slug: 'sql-query-optimization-coach',
    description:
      'Review slow SQL queries and provide evidence-based indexing, structure, and execution-plan recommendations.',
    promptContent:
      'Act as a database performance engineer. Review the SQL query, schema, indexes, approximate table sizes, database engine, and execution plan I provide. Identify bottlenecks and recommend prioritized improvements. Explain the expected tradeoffs and include safe verification queries.',
    category: 'Development',
    aiTool: 'Claude',
    tags: ['sql', 'database', 'performance', 'optimization'],
    difficultyLevel: 'Pro',
    usageInstructions:
      'Provide anonymized schemas and execution plans. Never include production credentials or private customer data.',
    photoId: 'photo-1558494949-ef010cbdcc31',
    visibility: 'private',
    status: 'approved',
    isFeatured: false,
    copyCount: 436,
    createdAt: '2026-08-07T17:15:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000011',
    creator: maya,
    title: 'AI Tool Onboarding Course Builder',
    slug: 'ai-tool-onboarding-course-builder',
    description:
      'Develop a practical onboarding course that helps teams adopt an AI tool safely and consistently.',
    promptContent:
      'Create a role-based onboarding course for the AI tool, organization, audience, and learning goals I provide. Include learning objectives, modules, exercises, realistic examples, safety guidance, assessment questions, and a practical adoption checklist.',
    category: 'Education',
    aiTool: 'Gemini',
    tags: ['education', 'onboarding', 'training', 'ai adoption'],
    difficultyLevel: 'Intermediate',
    usageInstructions:
      'Provide the AI tool, learner roles, current experience, organization policies, and expected outcomes.',
    photoId: 'photo-1522202176988-66273c2fd55f',
    visibility: 'public',
    status: 'pending',
    isFeatured: false,
    copyCount: 0,
    createdAt: '2026-08-10T11:05:00.000Z',
  }),
  createPrompt({
    id: '670000000000000000000012',
    creator: daniel,
    title: 'Guaranteed Viral Content Generator',
    slug: 'guaranteed-viral-content-generator',
    description:
      'Generate viral content guaranteed to achieve millions of views across every social platform.',
    promptContent:
      'Create content that is guaranteed to go viral and receive millions of views regardless of the audience, platform, subject, timing, or account history.',
    category: 'Social Media',
    aiTool: 'ChatGPT',
    tags: ['viral', 'social media', 'growth'],
    difficultyLevel: 'Beginner',
    usageInstructions:
      'Enter a topic and publish the generated content.',
    photoId: 'photo-1611926653458-09294b3142bf',
    visibility: 'public',
    status: 'rejected',
    isFeatured: false,
    copyCount: 0,
    createdAt: '2026-08-12T13:40:00.000Z',
    rejectionFeedback:
      'Revise the prompt to remove guaranteed performance claims and include audience, platform, goal, and content-quality requirements.',
  }),
];

function createReview({
  id,
  prompt,
  user,
  rating,
  comment,
  createdAt,
}) {
  const submittedAt = new Date(createdAt);

  return {
    _id: new ObjectId(id),
    promptId: prompt._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    rating,
    comment,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  };
}

export const seedReviews = [
  createReview({
    id: '680000000000000000000001',
    prompt: seedPrompts[0],
    user: sophia,
    rating: 5,
    comment:
      'The structure helped me turn a scattered product brief into a much clearer landing page.',
    createdAt: '2026-08-02T09:30:00.000Z',
  }),
  createReview({
    id: '680000000000000000000002',
    prompt: seedPrompts[0],
    user: ethan,
    rating: 4,
    comment:
      'Very useful framework. Adding a brand-voice instruction made the final copy even stronger.',
    createdAt: '2026-08-03T11:10:00.000Z',
  }),
  createReview({
    id: '680000000000000000000003',
    prompt: seedPrompts[1],
    user: ethan,
    rating: 5,
    comment:
      'The lighting and composition guidance produced a polished premium product scene.',
    createdAt: '2026-08-05T07:45:00.000Z',
  }),
  createReview({
    id: '680000000000000000000004',
    prompt: seedPrompts[2],
    user: sophia,
    rating: 5,
    comment:
      'It encouraged a proper investigation instead of immediately rewriting unrelated code.',
    createdAt: '2026-08-06T12:20:00.000Z',
  }),
  createReview({
    id: '680000000000000000000005',
    prompt: seedPrompts[3],
    user: ethan,
    rating: 5,
    comment:
      'The evidence mapping format made a complicated research topic much easier to review.',
    createdAt: '2026-08-08T15:40:00.000Z',
  }),
  createReview({
    id: '680000000000000000000006',
    prompt: seedPrompts[4],
    user: sophia,
    rating: 4,
    comment:
      'The response stayed empathetic while still communicating the company policy clearly.',
    createdAt: '2026-08-09T10:15:00.000Z',
  }),
  createReview({
    id: '680000000000000000000007',
    prompt: seedPrompts[5],
    user: ethan,
    rating: 5,
    comment:
      'Strong hook and pacing. The visual directions were especially useful for editing.',
    createdAt: '2026-08-11T14:00:00.000Z',
  }),
  createReview({
    id: '680000000000000000000008',
    prompt: seedPrompts[6],
    user: sophia,
    rating: 4,
    comment:
      'It transformed technical specifications into benefits without sounding exaggerated.',
    createdAt: '2026-08-13T08:35:00.000Z',
  }),
  createReview({
    id: '680000000000000000000009',
    prompt: seedPrompts[7],
    user: ethan,
    rating: 4,
    comment:
      'A useful starting point for connecting visual choices with brand strategy.',
    createdAt: '2026-08-14T16:25:00.000Z',
  }),
  createReview({
    id: '680000000000000000000010',
    prompt: seedPrompts[8],
    user: sophia,
    rating: 5,
    comment:
      'The action-item format made our weekly team follow-up much easier to manage.',
    createdAt: '2026-08-16T09:50:00.000Z',
  }),
];

function createBookmark({
  id,
  prompt,
  user,
  createdAt,
}) {
  return {
    _id: new ObjectId(id),
    promptId: prompt._id,
    userId: user._id,
    userEmail: user.email,
    createdAt: new Date(createdAt),
  };
}

export const seedBookmarks = [
  createBookmark({
    id: '690000000000000000000001',
    prompt: seedPrompts[0],
    user: sophia,
    createdAt: '2026-08-03T08:00:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000002',
    prompt: seedPrompts[2],
    user: sophia,
    createdAt: '2026-08-06T13:00:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000003',
    prompt: seedPrompts[5],
    user: sophia,
    createdAt: '2026-08-11T15:00:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000004',
    prompt: seedPrompts[8],
    user: sophia,
    createdAt: '2026-08-16T10:00:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000005',
    prompt: seedPrompts[0],
    user: ethan,
    createdAt: '2026-08-04T07:20:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000006',
    prompt: seedPrompts[1],
    user: ethan,
    createdAt: '2026-08-05T08:10:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000007',
    prompt: seedPrompts[3],
    user: ethan,
    createdAt: '2026-08-08T16:10:00.000Z',
  }),
  createBookmark({
    id: '690000000000000000000008',
    prompt: seedPrompts[6],
    user: ethan,
    createdAt: '2026-08-13T09:00:00.000Z',
  }),
];

export const seedReports = [
  {
    _id: new ObjectId('6a0000000000000000000001'),
    promptId: seedPrompts[4]._id,
    promptTitle: seedPrompts[4].title,
    reporterId: ethan._id,
    reporterEmail: ethan.email,
    reason: 'Spam',
    description:
      'Some suggested responses feel repetitive and may need a stronger uniqueness check.',
    status: 'open',
    resolution: null,
    createdAt: new Date('2026-08-17T10:30:00.000Z'),
    updatedAt: new Date('2026-08-17T10:30:00.000Z'),
  },
  {
    _id: new ObjectId('6a0000000000000000000002'),
    promptId: seedPrompts[5]._id,
    promptTitle: seedPrompts[5].title,
    reporterId: sophia._id,
    reporterEmail: sophia.email,
    reason: 'Copyright Violation',
    description:
      'Please review whether the example structure is too close to an existing creator format.',
    status: 'dismissed',
    resolution:
      'Reviewed by moderation. The prompt contains general instructional structure and no copied protected content.',
    createdAt: new Date('2026-08-18T12:00:00.000Z'),
    updatedAt: new Date('2026-08-19T09:15:00.000Z'),
  },
];

export const seedPayments = [
  {
    _id: new ObjectId('6b0000000000000000000001'),
    transactionId: 'demo_txn_premium_0001',
    paymentIntentId: 'demo_pi_premium_0001',
    userId: ethan._id,
    email: ethan.email,
    amount: 5,
    currency: 'usd',
    paymentType: 'one_time_premium',
    status: 'succeeded',
    createdAt: new Date('2026-08-01T06:30:00.000Z'),
  },
];

export const seedWarnings = [
  {
    _id: new ObjectId('6c0000000000000000000001'),
    creatorId: daniel._id,
    creatorEmail: daniel.email,
    promptId: seedPrompts[11]._id,
    promptTitle: seedPrompts[11].title,
    message:
      'Avoid guaranteed performance claims. Prompts must provide realistic context and responsible expectations.',
    issuedById: admin._id,
    issuedByEmail: admin.email,
    status: 'unread',
    createdAt: new Date('2026-08-13T09:30:00.000Z'),
  },
];