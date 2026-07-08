/**
 * Dodo Payments Webhook Route Handler
 *
 * Verifies webhook signatures using Svix SDK, then forwards
 * verified payloads to the Express API for database sync.
 */

import { type NextRequest } from "next/server";
import { verifyDodoWebhook } from "@/lib/webhook-verifier";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    // Read payload as raw text for signature verification
    const payloadText = await request.text();

    // Extract Svix headers
    const svixId = request.headers.get("svix-id") || "";
    const svixTimestamp = request.headers.get("svix-timestamp") || "";
    const svixSignature = request.headers.get("svix-signature") || "";

    // Verify signature — reject if invalid
    if (!verifyDodoWebhook(payloadText, { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature })) {
      return new Response("Invalid webhook signature", { status: 401 });
    }

    // Parse verified payload
    const body = JSON.parse(payloadText);
    const eventType = body.type ?? "unknown";
    const payload = body.data ?? body;

    console.log(`[Dodo Webhook] Verified: ${eventType}`);

    // Forward to Express API for processing (with internal auth)
    const internalKey = process.env.INTERNAL_API_KEY;
    const res = await fetch(`${API_URL}/api/payments/webhook-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalKey ? { "x-internal-key": internalKey } : {}),
      },
      body: JSON.stringify({ type: eventType, data: payload }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Dodo Webhook] API sync failed:`, err);
      return new Response(`API error: ${err}`, { status: 500 });
    }

    console.log(`[Dodo Webhook] Successfully processed: ${eventType}`);
    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error(`[Dodo Webhook] Error:`, error.message);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
