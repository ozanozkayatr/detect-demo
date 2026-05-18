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

export type VideoRecord = {
  id: number;
  original_filename: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  file_url: string;
};

export type PromptTemplateRecord = {
  id: number;
  key: string;
  title: string;
  description: string | null;
  prompt_body: string;
  output_type: string;
  is_active: boolean;
  created_at: string;
};

export type ParsedAnalysisResponse = {
  summary: string;
  strengths: string[];
  issues: string[];
  next_steps: string[];
  notes: string[];
};

export type AnalysisRecord = {
  id: number;
  video_id: number;
  prompt_template_id: number;
  status: string;
  raw_response: string | null;
  parsed_response: ParsedAnalysisResponse | null;
  model_name: string | null;
  confidence: number | null;
  parser_strategy: string | null;
  json_parse_succeeded: boolean | null;
  template_key_snapshot: string | null;
  persona_key_snapshot: string | null;
  user_prompt_snapshot: string | null;
  created_at: string;
  updated_at: string;
  video: VideoRecord;
  prompt_template: {
    id: number;
    key: string;
    title: string;
    description: string | null;
    output_type: string;
    is_active: boolean;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${mobileConfig.apiBaseUrl}${path}`, init);

  if (!response.ok) {
    const raw = await response.text();
    let message = `Request failed with status ${response.status}`;

    try {
      const parsed = JSON.parse(raw) as {
        detail?: { message?: string; code?: string } | string;
      };
      if (typeof parsed.detail === 'string') {
        message = parsed.detail;
      } else if (parsed.detail?.message) {
        message = parsed.detail.message;
      }
    } catch {
      if (raw) {
        message = raw;
      }
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function fetchHealth(signal?: AbortSignal) {
  return request<HealthResponse>('/health', { signal });
}

export function fetchPromptTemplates(signal?: AbortSignal) {
  return request<PromptTemplateRecord[]>('/prompt-templates', { signal });
}

export function syncPromptTemplates() {
  return request('/prompt-templates/sync', { method: 'POST' });
}

export async function uploadVideoFile(file: {
  uri: string;
  name: string;
  mimeType: string;
}): Promise<VideoRecord> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as never);

  return request<VideoRecord>('/videos/upload', {
    method: 'POST',
    body: formData,
  });
}

export function createAnalysis(payload: {
  video_id: number;
  prompt_template_id: number;
  persona_key: string;
  model_name?: string | null;
  user_prompt?: string | null;
}) {
  return request<AnalysisRecord>('/analyses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
