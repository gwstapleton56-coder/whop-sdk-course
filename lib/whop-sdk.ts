import { Whop } from "@whop/sdk";

// Validate required env vars at module load time
if (!process.env.NEXT_PUBLIC_WHOP_APP_ID) {
  throw new Error("NEXT_PUBLIC_WHOP_APP_ID is not set in environment variables");
}
if (!process.env.WHOP_API_KEY) {
  throw new Error("WHOP_API_KEY is not set in environment variables");
}

// WHOP_WEBHOOK_SECRET is required in production for webhook validation
// In development, it's optional (webhooks typically only work in production)
// Skip validation during build/static generation to avoid build errors
// Check if we're in a build context by checking for NEXT_PHASE or if we're being imported during build
const skipValidation = 
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-development" ||
  process.env.NEXT_RUNTIME === undefined; // Build time doesn't set NEXT_RUNTIME

if (!skipValidation && process.env.NODE_ENV === "production" && !process.env.WHOP_WEBHOOK_SECRET) {
  throw new Error("WHOP_WEBHOOK_SECRET is not set in environment variables (required in production)");
}

export const whopsdk = new Whop({
	appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
	apiKey: process.env.WHOP_API_KEY,
	webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET || ""),
});
