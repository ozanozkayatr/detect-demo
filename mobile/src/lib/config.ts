import Constants from 'expo-constants';

const fallbackApiBaseUrl = 'http://127.0.0.1:8000/api/v1';
const expoExtra =
  (Constants.expoConfig?.extra as { clerkPublishableKey?: string } | undefined) ?? {};

export const mobileConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackApiBaseUrl,
  clerkPublishableKey:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    expoExtra.clerkPublishableKey ??
    '',
  devAuthBypass: process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === 'true',
  enableSampleClips:
    process.env.EXPO_PUBLIC_ENABLE_SAMPLE_CLIPS === 'true' || __DEV__,
};

export function resolveBackendUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const apiBase = mobileConfig.apiBaseUrl.replace(/\/+$/, '');
  const apiRoot = apiBase.replace(/\/api\/v1$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiRoot}${normalizedPath}`;
}

export function isLoopbackApiBaseUrl(url: string): boolean {
  return url.includes('127.0.0.1') || url.includes('localhost');
}
