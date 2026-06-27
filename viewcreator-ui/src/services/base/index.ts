export * from "./api-client";

export const baseServiceConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
} as const;

