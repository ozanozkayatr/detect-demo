"use client";

import { useEffect, useMemo, useState } from "react";

type VideoRecord = {
  id: number;
  original_filename: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  file_url: string;
};

type PromptTemplate = {
  id: number;
  key: string;
  title: string;
  description: string | null;
  prompt_body: string;
  output_type: string;
  is_active: boolean;
  created_at: string;
};

type PromptTemplateSyncResult = {
  created_count: number;
  updated_count: number;
  synced_count: number;
  templates: PromptTemplate[];
};

type BackendHealth = {
  status: string;
  service: string;
  database: string;
  prompts_dir: string;
  upload_dir: string;
  gemini_configured: boolean;
  gemini_model: string;
  error?: string | null;
};

type GeminiModelOption = {
  value: string;
  display_name: string;
  description: string | null;
  input_token_limit: number | null;
  output_token_limit: number | null;
};

type GeminiModelListResponse = {
  configured_model: string;
  models: GeminiModelOption[];
};

type Persona = {
  key: string;
  title: string;
  height_cm: number;
  weight_kg: number;
  sports_routine: string;
  boxing_background: string;
};

type NormalizedParsedResponse = {
  summary: string;
  strengths: string[];
  issues: string[];
  next_steps: string[];
  notes: string[];
};

type AnalysisRecord = {
  id: number;
  video_id: number;
  prompt_template_id: number;
  status: string;
  raw_response: string | null;
  parsed_response: NormalizedParsedResponse | null;
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

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000/api/v1";

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildApiAssetUrl(path: string): string {
  return new URL(path, `${apiBaseUrl}/`).toString();
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function normalizeParsedResponse(
  parsedResponse: NormalizedParsedResponse | null | undefined,
): NormalizedParsedResponse {
  if (!parsedResponse) {
    return {
      summary: "",
      strengths: [],
      issues: [],
      next_steps: [],
      notes: [],
    };
  }

  return {
    summary: String(parsedResponse.summary ?? "").trim(),
    strengths: normalizeStringArray(parsedResponse.strengths),
    issues: normalizeStringArray(parsedResponse.issues),
    next_steps: normalizeStringArray(parsedResponse.next_steps),
    notes: normalizeStringArray(parsedResponse.notes),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as
      | {
          detail?:
            | string
            | { msg?: string }[]
            | { code?: string; message?: string; analysis_id?: number | null };
        }
      | undefined;

    if (typeof payload?.detail === "string") {
      return payload.detail;
    }

    if (
      payload?.detail &&
      typeof payload.detail === "object" &&
      !Array.isArray(payload.detail) &&
      payload.detail.message
    ) {
      return payload.detail.message;
    }

    if (Array.isArray(payload?.detail)) {
      const firstIssue = payload.detail[0];
      if (firstIssue?.msg) {
        return firstIssue.msg;
      }
    }
  } catch {
    return `Request failed with status ${response.status}.`;
  }

  return `Request failed with status ${response.status}.`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
}

export function UploadWorkflow() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<VideoRecord | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedPersonaKey, setSelectedPersonaKey] = useState("");
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState("");
  const [availableModels, setAvailableModels] = useState<GeminiModelOption[]>([]);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const [templateError, setTemplateError] = useState<string | null>(null);
  const [personaError, setPersonaError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const normalizedAnalysisResponse = useMemo(
    () => normalizeParsedResponse(analysis?.parsed_response),
    [analysis?.parsed_response],
  );
  const reviewVideo = analysis?.video ?? uploadedVideo;
  const reviewVideoUrl = useMemo(
    () => (reviewVideo ? buildApiAssetUrl(reviewVideo.file_url) : null),
    [reviewVideo],
  );
  const selectedPersona = useMemo(
    () => personas.find((persona) => persona.key === selectedPersonaKey) ?? null,
    [personas, selectedPersonaKey],
  );
  const analysisPersona = useMemo(
    () =>
      analysis?.persona_key_snapshot
        ? personas.find((persona) => persona.key === analysis.persona_key_snapshot) ?? null
        : null,
    [analysis?.persona_key_snapshot, personas],
  );
  const isAnalysisReady =
    Boolean(uploadedVideo) &&
    Boolean(selectedPersonaKey) &&
    Boolean(selectedPromptTemplateId);

  async function syncTemplates() {
    setTemplateError(null);

    try {
      const result = await apiRequest<PromptTemplateSyncResult>(
        "/prompt-templates/sync",
        {
          method: "POST",
        },
      );

      setPromptTemplates(result.templates);
      setSelectedPromptTemplateId((currentValue) => {
        if (
          currentValue &&
          result.templates.some(
            (template) => String(template.id) === currentValue,
          )
        ) {
          return currentValue;
        }

        return result.templates[0] ? String(result.templates[0].id) : "";
      });
    } catch (error) {
      setTemplateError(
        error instanceof Error
          ? error.message
          : "Prompt templates could not be synced.",
      );
    }
  }

  async function loadBackendHealth() {
    try {
      const result = await apiRequest<BackendHealth>("/health");
      setBackendHealth(result);
      return result;
    } catch (error) {
      setBackendHealth(null);
      return null;
    }
  }

  async function loadGeminiModels(configuredModelName: string) {
    setIsLoadingModels(true);
    setModelError(null);

    try {
      const result = await apiRequest<GeminiModelListResponse>("/gemini/models");
      setAvailableModels(result.models);
      setSelectedModelName((currentValue) => {
        if (
          currentValue &&
          result.models.some((model) => model.value === currentValue)
        ) {
          return currentValue;
        }

        if (
          configuredModelName &&
          result.models.some((model) => model.value === configuredModelName)
        ) {
          return configuredModelName;
        }

        return result.models[0]?.value ?? configuredModelName;
      });
    } catch (error) {
      setAvailableModels([]);
      setSelectedModelName(configuredModelName);
      setModelError(
        error instanceof Error ? error.message : "Gemini models could not be loaded.",
      );
    } finally {
      setIsLoadingModels(false);
    }
  }

  async function loadPersonas() {
    setPersonaError(null);

    try {
      const result = await apiRequest<Persona[]>("/personas");
      setPersonas(result);
      setSelectedPersonaKey((currentValue) => {
        if (currentValue && result.some((persona) => persona.key === currentValue)) {
          return currentValue;
        }

        return result[0]?.key ?? "";
      });
    } catch (error) {
      setPersonas([]);
      setPersonaError(
        error instanceof Error ? error.message : "Personas could not be loaded.",
      );
    }
  }

  useEffect(() => {
    void syncTemplates();
    void loadPersonas();

    void (async () => {
      const health = await loadBackendHealth();

      if (health?.gemini_configured) {
        await loadGeminiModels(health.gemini_model);
      } else {
        setAvailableModels([]);
        setSelectedModelName(health?.gemini_model ?? "");
        setModelError(null);
      }
    })();
  }, []);

  async function uploadSelectedFile(file: File) {
    setIsUploading(true);
    setUploadError(null);
    setUploadedVideo(null);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const video = await apiRequest<VideoRecord>("/videos/upload", {
        method: "POST",
        body: formData,
      });

      setUploadedVideo(video);
    } catch (error) {
      setUploadedVideo(null);
      setUploadError(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCreateAnalysis() {
    if (!uploadedVideo) {
      setAnalysisError("Upload a video before creating an analysis.");
      return;
    }

    if (!selectedPromptTemplateId) {
      setAnalysisError("Select a prompt template first.");
      return;
    }

    if (!selectedPersonaKey) {
      setAnalysisError("Select a persona first.");
      return;
    }

    setIsCreatingAnalysis(true);
    setAnalysisError(null);
    setAnalysis(null);

    try {
      const createdAnalysis = await apiRequest<AnalysisRecord>("/analyses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_id: uploadedVideo.id,
          persona_key: selectedPersonaKey,
          prompt_template_id: Number(selectedPromptTemplateId),
          model_name: selectedModelName || undefined,
          user_prompt: userPrompt.trim() || undefined,
        }),
      });

      setAnalysis(createdAnalysis);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Gemini analysis could not be created.",
      );
    } finally {
      setIsCreatingAnalysis(false);
      void loadBackendHealth();
    }
  }

  return (
    <div className="showcase-stack">
      <section className="demo-hero">
        <div className="demo-hero-copy">
          <span className="eyebrow">Local Gemini demo</span>
          <h1>Upload a clip. Run boxing analysis. Review the result.</h1>
          <div className="hero-flow">
            <div className="hero-flow-step">
              <span>01</span>
              <strong>Select clip</strong>
            </div>
            <div className="hero-flow-step">
              <span>02</span>
              <strong>Select persona</strong>
            </div>
            <div className="hero-flow-step">
              <span>03</span>
              <strong>Select prompt</strong>
            </div>
            <div className="hero-flow-step">
              <span>04</span>
              <strong>Inspect output</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace-stage">
        <div className="workspace-grid">
          <section className="workspace-card workspace-card-primary">
            <div className="workspace-card-head">
              <div>
                <p className="mini-label">Step 1</p>
                <h2>Choose a clip</h2>
              </div>
            </div>

            <div className="workspace-card-body">
              <div className="form-stack">
                <label
                  className={`upload-dropzone upload-dropzone-showcase ${selectedFile ? "upload-dropzone-active" : ""}`}
                >
                  <input
                    className="upload-file-input"
                    type="file"
                    accept="video/*"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.currentTarget.value = "";

                      if (!file) {
                        return;
                      }

                      setSelectedFile(file);
                      void uploadSelectedFile(file);
                    }}
                  />
                  <span className="upload-dropzone-button">
                    {isUploading
                      ? "Uploading..."
                      : selectedFile
                        ? "Choose another clip"
                        : "Upload"}
                  </span>
                </label>

                {selectedFile ? (
                  <dl className="data-list data-list-grid compact-data-list">
                    <div>
                      <dt>Filename</dt>
                      <dd className="break-text" title={selectedFile.name}>
                        {selectedFile.name}
                      </dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{formatFileSize(selectedFile.size)}</dd>
                    </div>
                  </dl>
                ) : null}
              </div>

              {uploadError ? <p className="feedback-error">{uploadError}</p> : null}
            </div>
          </section>

          <section className="workspace-card">
            <div className="workspace-card-head">
              <div>
                <p className="mini-label">Step 2</p>
                <h2>Select a persona</h2>
              </div>
            </div>
            <div className="workspace-card-body">
              {personaError ? <p className="feedback-error">{personaError}</p> : null}

              {personas.length > 0 ? (
                <div className="template-grid persona-grid">
                  {personas.map((persona) => {
                    const isSelected = persona.key === selectedPersonaKey;

                    return (
                      <button
                        key={persona.key}
                        type="button"
                        className={`template-option persona-option ${isSelected ? "template-option-selected" : ""}`}
                        onClick={() => setSelectedPersonaKey(persona.key)}
                      >
                        <div className="template-option-head">
                          <div>
                            <p className="mini-label">{persona.key}</p>
                            <h3 className="break-text" title={persona.title}>
                              {persona.title}
                            </h3>
                          </div>
                          {isSelected ? (
                            <span className="template-option-state">Selected</span>
                          ) : null}
                        </div>
                        <p>{persona.height_cm} cm • {persona.weight_kg} kg</p>
                        <p
                          className="break-text"
                          title={persona.sports_routine}
                        >
                          {persona.sports_routine}
                        </p>
                        <p
                          className="break-text"
                          title={persona.boxing_background}
                        >
                          {persona.boxing_background}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-card">
                  <p className="mini-label">No personas loaded</p>
                </div>
              )}
            </div>
          </section>

          <section className="workspace-card">
            <div className="workspace-card-head">
              <div>
                <p className="mini-label">Step 3</p>
                <h2>Select a prompt</h2>
              </div>
            </div>
            <div className="workspace-card-body">
              {templateError ? <p className="feedback-error">{templateError}</p> : null}
              {modelError ? <p className="feedback-error">{modelError}</p> : null}

              {backendHealth?.gemini_configured ? (
                <label className="field field-centered field-model">
                  <span>Model</span>
                  <select
                    className="input-control"
                    value={selectedModelName}
                    onChange={(event) => setSelectedModelName(event.target.value)}
                    disabled={isLoadingModels || availableModels.length === 0}
                  >
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.display_name}
                        </option>
                      ))
                    ) : (
                      <option value={selectedModelName}>
                        {isLoadingModels ? "Loading models..." : backendHealth.gemini_model}
                      </option>
                    )}
                  </select>
                </label>
              ) : null}

              <label className="field field-centered field-note">
                <span>Optional focus note</span>
                <textarea
                  className="input-control input-control-textarea"
                  value={userPrompt}
                  onChange={(event) => setUserPrompt(event.target.value)}
                  maxLength={1200}
                  placeholder="Example: I'm the boxer on the right. Focus on what I am doing wrong."
                />
              </label>

              {promptTemplates.length > 0 ? (
                <div className="template-grid">
                  {promptTemplates.map((template) => {
                    const isSelected = String(template.id) === selectedPromptTemplateId;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        className={`template-option ${isSelected ? "template-option-selected" : ""}`}
                        onClick={() => setSelectedPromptTemplateId(String(template.id))}
                      >
                        <div className="template-option-head">
                          <div>
                            <p className="mini-label">{template.key}</p>
                            <h3 className="break-text" title={template.title}>
                              {template.title}
                            </h3>
                          </div>
                          {isSelected ? (
                            <span className="template-option-state">Selected</span>
                          ) : null}
                        </div>
                        <p className="break-text" title={template.description ?? "No description"}>
                          {template.description ?? "No description"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-card">
                  <p className="mini-label">No templates loaded</p>
                  <p className="muted-label">Sync local prompt files.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="review-stage">
        <div className="review-stage-head">
          <div>
            <p className="kicker">Step 4</p>
            <h2>Run Gemini and review the result</h2>
          </div>
          <div className="review-stage-actions">
            <button
              className="button-primary button-primary-large"
              type="button"
              onClick={() => {
                void handleCreateAnalysis();
              }}
              disabled={!isAnalysisReady || isCreatingAnalysis}
            >
              {isCreatingAnalysis ? "Running Gemini..." : "Run Gemini analysis"}
            </button>
          </div>
        </div>

        {backendHealth && !backendHealth.gemini_configured ? (
          <div className="warning-card">
            <p className="kicker">Gemini configuration</p>
            <p>
              Set <code>DETECT_DEMO_GEMINI_API_KEY</code> in <code>backend/.env</code>
              and restart the backend.
            </p>
            <p className="muted-label">
              Configured model: <code>{backendHealth.gemini_model}</code>
            </p>
          </div>
        ) : null}

        {analysisError ? <p className="feedback-error">{analysisError}</p> : null}

        {analysis ? (
          <div className="review-result-shell">
            <div className="review-media-column">
              <div className="review-hero-card">
                <div className="result-card-head">
                  <div>
                    <p className="mini-label">Video</p>
                    <h3>Uploaded clip</h3>
                  </div>
                </div>

                {reviewVideo && reviewVideoUrl ? (
                  <div className="video-review-card">
                    <video
                      className="video-player video-player-featured"
                      controls
                      preload="metadata"
                      src={reviewVideoUrl}
                    >
                      Your browser could not play this uploaded video.
                    </video>
                    <dl className="data-list video-meta-list data-list-grid compact-data-list">
                      <div>
                        <dt>Filename</dt>
                        <dd className="break-text" title={reviewVideo.original_filename}>
                          {reviewVideo.original_filename}
                        </dd>
                      </div>
                      <div>
                        <dt>Size</dt>
                        <dd>{formatFileSize(reviewVideo.size_bytes)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="review-insight-column">
              <div className="review-summary-card">
                <p className="mini-label">Product result</p>
                <h3>Normalized boxing review</h3>
                <p className="review-summary-text break-text">
                  {normalizedAnalysisResponse.summary || "No summary was parsed."}
                </p>

                <dl className="data-list data-list-grid compact-data-list">
                  <div>
                    <dt>Status</dt>
                    <dd>{analysis.status}</dd>
                  </div>
                  <div>
                    <dt>Template</dt>
                    <dd
                      className="break-text"
                      title={analysis.prompt_template.title}
                    >
                      {analysis.prompt_template.title}
                    </dd>
                  </div>
                  <div>
                    <dt>Parser</dt>
                    <dd>{analysis.parser_strategy ?? "n/a"}</dd>
                  </div>
                  <div>
                    <dt>Model</dt>
                    <dd className="break-text" title={analysis.model_name ?? "n/a"}>
                      {analysis.model_name ?? "n/a"}
                    </dd>
                  </div>
                  <div>
                    <dt>Persona</dt>
                    <dd
                      className="break-text"
                      title={analysisPersona?.title ?? analysis.persona_key_snapshot ?? "n/a"}
                    >
                      {analysisPersona?.title ?? analysis.persona_key_snapshot ?? "n/a"}
                    </dd>
                  </div>
                </dl>

                {analysis.user_prompt_snapshot ? (
                  <div className="analysis-note-card">
                    <p className="mini-label">User focus note</p>
                    <p className="review-summary-text break-text">
                      {analysis.user_prompt_snapshot}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="normalized-grid normalized-grid-showcase">
                <section className="normalized-card">
                  <h4>Strengths</h4>
                  <ul className="normalized-list">
                    {normalizedAnalysisResponse.strengths.length > 0 ? (
                      normalizedAnalysisResponse.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    ) : (
                      <li>No strengths parsed.</li>
                    )}
                  </ul>
                </section>
                <section className="normalized-card">
                  <h4>Issues</h4>
                  <ul className="normalized-list">
                    {normalizedAnalysisResponse.issues.length > 0 ? (
                      normalizedAnalysisResponse.issues.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    ) : (
                      <li>No issues parsed.</li>
                    )}
                  </ul>
                </section>
                <section className="normalized-card">
                  <h4>Next steps</h4>
                  <ul className="normalized-list">
                    {normalizedAnalysisResponse.next_steps.length > 0 ? (
                      normalizedAnalysisResponse.next_steps.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    ) : (
                      <li>No next steps parsed.</li>
                    )}
                  </ul>
                </section>
                <section className="normalized-card">
                  <h4>Notes</h4>
                  <ul className="normalized-list">
                    {normalizedAnalysisResponse.notes.length > 0 ? (
                      normalizedAnalysisResponse.notes.map((item) => (
                        <li key={item}>{item}</li>
                      ))
                    ) : (
                      <li>No notes parsed.</li>
                    )}
                  </ul>
                </section>
              </div>

              <details className="raw-response-panel">
                <summary>Raw model output</summary>
                <pre className="code-block">
                  {analysis.raw_response ?? "No raw text response was stored."}
                </pre>
              </details>
            </div>
          </div>
        ) : (
          <div className="review-placeholder">
            {reviewVideo && reviewVideoUrl ? (
              <div className="review-hero-card">
                <div className="result-card-head">
                  <div>
                    <p className="mini-label">Video</p>
                    <h3>Clip ready for review</h3>
                  </div>
                </div>
                <div className="video-review-card">
                  <video
                    className="video-player video-player-featured"
                    controls
                    preload="metadata"
                    src={reviewVideoUrl}
                  >
                    Your browser could not play this uploaded video.
                  </video>
                  <p className="muted-label">
                    Select a prompt, then run Gemini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-state-card empty-state-card-large">
                <p className="mini-label">Awaiting analysis</p>
                <h3>Add a clip to start the review stage.</h3>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
