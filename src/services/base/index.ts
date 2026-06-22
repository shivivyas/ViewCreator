/**
 * Base service configuration and shared client utilities.
 * Add HTTP client setup, auth headers, and environment config here.
 */

export const baseServiceConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
} as const;
