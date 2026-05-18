const fallbackApiBaseUrl = 'http://127.0.0.1:8000/api/v1';

export const mobileConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackApiBaseUrl,
};

export function isLoopbackApiBaseUrl(url: string): boolean {
  return url.includes('127.0.0.1') || url.includes('localhost');
}
