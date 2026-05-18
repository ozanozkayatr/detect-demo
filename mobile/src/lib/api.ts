import { mobileConfig } from '@/lib/config';

export type HealthResponse = {
  status: string;
  service: string;
  database: string;
  prompts_dir: string;
  upload_dir: string;
  gemini_configured: boolean;
  gemini_model: string;
  error: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${mobileConfig.apiBaseUrl}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchHealth(signal?: AbortSignal) {
  return request<HealthResponse>('/health', { signal });
}
