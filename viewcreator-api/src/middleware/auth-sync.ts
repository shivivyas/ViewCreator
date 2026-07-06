import express from 'express';
import { getAuth } from '@clerk/express';
import { clerkClient } from '@clerk/express';
import { UserRepository } from 'viewcreator-database';

/**
 * Ensures the authenticated user exists in the database.
 * If not, fetches details from Clerk and creates a new database record.
 */
export async function ensureUserSynced(userId: string): Promise<void> {
  try {
    console.log(`[Auth Sync] Checking if user ${userId} exists in database...`);
    const dbUser = await UserRepository.findById(userId);
    if (!dbUser) {
      console.log(`[Auth Sync] User ${userId} not found in database. Fetching from Clerk...`);
      const clerkUser = await clerkClient.users.getUser(userId);
      
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        throw new Error(`User ${userId} does not have a primary email address in Clerk.`);
      }
      
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;
      
      console.log(`[Auth Sync] Registering user in database: ${email} | Name: ${name}`);
      await UserRepository.create({
        id: userId,
        email,
        name,
      });
      console.log(`[Auth Sync] Successfully created user row for ${userId}`);
    } else {
      console.log(`[Auth Sync] User ${userId} already exists in database.`);
    }
  } catch (error) {
    console.error(`[Auth Sync] Failed to sync user ${userId}:`, error);
  }
}

export const syncUserMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { userId } = getAuth(req);
  console.log('[Auth Sync] userId:', userId);
  if (userId) {
    await ensureUserSynced(userId);
  }
  next();
};
