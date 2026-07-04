/**
 * Dodo Payments Webhook Route Handler
 *
 * Receives raw webhook payloads from Dodo Payments and forwards them
 * to the Express API for database sync.
 * Signature verification will be added once we confirm the signing key format.
 */

import { type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.type ?? "unknown";
    const payload = body.data ?? body;

    console.log(`[Dodo Webhook] Received: ${eventType}`);

    // Forward to Express API for processing
    const res = await fetch(`${API_URL}/api/payments/webhook-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
