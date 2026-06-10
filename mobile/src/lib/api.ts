import { mobileConfig } from '@/lib/config';

type AccessTokenGetter = () => Promise<string | null>;

let getAccessToken: AccessTokenGetter | null = null;

export function setApiAccessTokenGetter(getter: AccessTokenGetter | null) {
  getAccessToken = getter;
}

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

export type AppUserRecord = {
  id: number;
  display_name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
};

export type AthleteProfileRecord = {
  id: number;
  user_id: number;
  name: string;
  age_range: string;
  stance: string;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: string;
  years_boxing: number | null;
  weekly_training_days: number | null;
  training_types: string[];
  routine_summary: string;
  has_amateur_bouts: boolean;
  has_professional_experience: boolean;
  has_coaching_experience: boolean;
  limitations: string;
  additional_context: string;
  created_at: string;
  updated_at: string;
};

export type AppSessionRecord = {
  user: AppUserRecord;
  athlete_profile: AthleteProfileRecord | null;
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
  const headers = new Headers(init?.headers);
  const accessToken = getAccessToken ? await getAccessToken() : null;

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${mobileConfig.apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

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

export function fetchAppSession(signal?: AbortSignal) {
  return request<AppSessionRecord>('/app/session', { signal });
}

export function saveAthleteProfile(payload: Omit<AthleteProfileRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  return request<AthleteProfileRecord>('/athlete-profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function fetchPromptTemplates(signal?: AbortSignal) {
  return request<PromptTemplateRecord[]>('/prompt-templates', { signal });
}

export function fetchAnalyses(signal?: AbortSignal) {
  return request<AnalysisRecord[]>('/analyses', { signal });
}

export function fetchAnalysisById(analysisId: number, signal?: AbortSignal) {
  return request<AnalysisRecord>(`/analyses/${analysisId}`, { signal });
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
