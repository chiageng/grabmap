import { client } from '@/client/client.gen';

// Configure the API client base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Token management
let authToken: string | null = null;

/**
 * Set the bearer token for API requests
 * Call this after successful login
 */
export const setAuthToken = (token: string) => {
  authToken = token;
  client.setConfig({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Clear the bearer token
 * Call this on logout
 */
export const clearAuthToken = () => {
  authToken = null;
  client.setConfig({
    headers: {
      Authorization: undefined,
    },
  });
};

/**
 * Get the current auth token
 */
export const getAuthToken = (): string | null => {
  return authToken;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return authToken !== null;
};

// Initialize client with base configuration
client.setConfig({
  baseUrl: API_BASE_URL,
  throwOnError: true
});
