import { Router } from "express";
import { ObjectId } from "mongodb";
import Stripe from "stripe";

import { getDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { verifyMarketplaceToken } from "../middleware/verifyMarketplaceToken.js";

const router = Router();

const stripe = new Stripe(env.stripeSecretKey);

/**
 * Safely resolves an absolute base URL for Stripe success/cancel redirects.
 * Fallbacks: Request Origin -> env.clientUrl -> Default Production URL
 */
function resolveBaseUrl(req) {
  let origin = req.headers.origin || env.clientUrl;

  if (!origin || typeof origin !== "string" || origin === "undefined") {
    origin = "https://promptmarketbd.vercel.app";
  }

  // Strip trailing slashes
  origin = origin.replace(/\/+$/, "");

  // Prepend https:// if protocol is missing
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    origin = `https://${origin}`;
  }

  return origin;
}

function safeReturnPath(value) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/prompts";
}

function paymentTransactionId(session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id || session.id;
}

async function fulfillPremiumCheckout(session) {
  if (session.payment_status !== "paid") {
    return false;
  }

  const userId = session.metadata?.userId;

  if (!ObjectId.isValid(userId)) {
    throw new Error(
      "Stripe checkout metadata does not contain a valid user ID.",
    );
  }

  const database = getDatabase();
  const marketplaceUserId = new ObjectId(userId);
  const transactionId = paymentTransactionId(session);
  const now = new Date();

  await database.collection("payments").updateOne(
    { checkoutSessionId: session.id },
    {
      $setOnInsert: {
        checkoutSessionId: session.id,
        transactionId,
        paymentIntentId: transactionId,
        userId: marketplaceUserId,
        email:
          session.customer_details?.email ||
          session.customer_email ||
          session.metadata?.userEmail,
        amount: Number(session.amount_total || 500) / 100,
        currency: session.currency || "usd",
        status: "paid",
        provider: "stripe",
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  await database.collection("users").updateOne(
    { _id: marketplaceUserId },
    {
      $set: {
        subscription: "premium",
        subscriptionStatus: "active",
        premiumCheckoutSessionId: session.id,
        premiumActivatedAt: now,
        updatedAt: now,
      },
    },
  );

  return true;
}

export async function stripeWebhookHandler(req, res) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Missing Stripe signature.");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (error) {
    return res
      .status(400)
      .send(`Webhook signature failed: ${error.message}`);
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillPremiumCheckout(event.data.object);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook fulfillment failed:", error);

    return res.status(500).json({
      message: "Stripe payment fulfillment failed.",
    });
  }
}

router.post(
  "/checkout-session",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const user = req.auth.user;

      if (
        user.subscription === "premium" ||
        user.subscriptionStatus === "active"
      ) {
        return res.status(409).json({
          message: "This marketplace account already has premium access.",
        });
      }

      const returnTo = safeReturnPath(req.body?.returnTo);
      const baseUrl = resolveBaseUrl(req);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        client_reference_id: user._id.toString(),

        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 500,
              product_data: {
                name: "PromptMarket Premium Access",
                description:
                  "One-time access to every private AI prompt in the marketplace.",
              },
            },
          },
        ],

        metadata: {
          userId: user._id.toString(),
          userEmail: user.email,
          returnTo,
        },

        success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`,
        cancel_url: `${baseUrl}/payment?cancelled=1&returnTo=${encodeURIComponent(returnTo)}`,
      });

      return res.status(201).json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  "/checkout-session/:sessionId",
  verifyMarketplaceToken,
  async (req, res, next) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId,
      );

      if (session.metadata?.userId !== req.auth.user._id.toString()) {
        return res.status(403).json({
          message:
            "This Stripe checkout belongs to another marketplace user.",
        });
      }

      const fulfilled = await fulfillPremiumCheckout(session);

      return res.json({
        checkout: {
          id: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
          customerEmail:
            session.customer_details?.email || session.customer_email,
          amount: Number(session.amount_total || 0) / 100,
          currency: session.currency,
          returnTo: safeReturnPath(session.metadata?.returnTo),
          fulfilled,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;