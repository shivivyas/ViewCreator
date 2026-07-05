/**
 * Global Setup — Clerk Testing Token
 *
 * Called once before all tests to obtain a Clerk Testing Token.
 * This token bypasses bot detection for all subsequent test workers.
 *
 * Prerequisites:
 *   - CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be set
 *     in the environment (from viewcreator-ui/.env.local)
 *   - @clerk/testing must be installed
 */

import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load Clerk API keys from the UI project's .env.local
dotenv.config({ path: path.resolve(__dirname, "../../viewcreator-ui/.env.local") });

setup.describe.configure({ mode: "serial" });

setup("global setup — obtain Clerk testing token", async () => {
  await clerkSetup();
});
