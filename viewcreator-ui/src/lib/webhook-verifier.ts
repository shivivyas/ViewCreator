/**
 * Dodo Payments Webhook Signature Verification
 *
 * Uses the Svix SDK to verify webhook payloads from Dodo Payments.
 * Svix handles the whsec_ prefix format natively.
 */

import { Webhook, WebhookVerificationError } from "svix";

const SVIX_SECRET = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

export interface SvixHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

/**
 * Verify that a webhook payload was sent by Dodo Payments.
 * Returns true if the signature is valid, false otherwise.
 */
export function verifyDodoWebhook(
  payload: string,
  headers: SvixHeaders
): boolean {
  if (!SVIX_SECRET) {
    console.error("[Webhook Verifier] Missing DODO_PAYMENTS_WEBHOOK_KEY");
    return false;
  }

  const { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature } = headers;

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("[Webhook Verifier] Missing required Svix headers");
    return false;
  }

  try {
    const wh = new Webhook(SVIX_SECRET);
    wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    return true;
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error("[Webhook Verifier] Signature verification failed — possible forgery");
    } else {
      console.error("[Webhook Verifier] Verification error:", err);
    }
    return false;
  }
}
