/**
 * Shared utility helpers for the ViewCreator frontend.
 */

/**
 * Cycle an index forward or backward with wrap-around.
 *
 * @example
 *   cycleIndex(0, 3, 1)   // → 1
 *   cycleIndex(0, 3, -1)  // → 2
 *   cycleIndex(3, 4, 1)   // → 0
 */
export function cycleIndex(current: number, length: number, direction: 1 | -1): number {
  return (current + direction + length) % length;
}

/**
 * Safely resolve a Clerk auth token, returning `undefined` on failure.
 *
 * Replaces the 12+ repetitions of `(await getToken().catch(() => undefined)) || undefined` across the codebase.
 */
export async function safeToken(getToken: () => Promise<string | null>): Promise<string | undefined> {
  return (await getToken().catch(() => undefined)) || undefined;
}
