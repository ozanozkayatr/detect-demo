"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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

function formatDateTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
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
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);

  const [isSyncingTemplates, setIsSyncingTemplates] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);

  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const selectedPromptTemplate = useMemo(
    () =>
      promptTemplates.find(
        (template) => String(template.id) === selectedPromptTemplateId,
      ) ?? null,
    [promptTemplates, selectedPromptTemplateId],
  );
  const normalizedAnalysisResponse = useMemo(
    () => normalizeParsedResponse(analysis?.parsed_response),
    [analysis?.parsed_response],
  );
  const reviewVideo = analysis?.video ?? uploadedVideo;
  const uploadedVideoUrl = useMemo(
    () => (uploadedVideo ? buildApiAssetUrl(uploadedVideo.file_url) : null),
    [uploadedVideo],
  );
  const reviewVideoUrl = useMemo(
    () => (reviewVideo ? buildApiAssetUrl(reviewVideo.file_url) : null),
    [reviewVideo],
  );
  const isAnalysisReady =
    Boolean(uploadedVideo) && Boolean(selectedPromptTemplateId);
  const hasAnalysisResult = Boolean(analysis);

  async function syncTemplates() {
    setIsSyncingTemplates(true);
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
      setTemplateMessage(
        `Synced ${result.synced_count} prompt template${result.synced_count === 1 ? "" : "s"} from local files.`,
      );
    } catch (error) {
      setTemplateError(
        error instanceof Error
          ? error.message
          : "Prompt templates could not be synced.",
      );
    } finally {
      setIsSyncingTemplates(false);
    }
  }

  async function loadBackendHealth() {
    setHealthError(null);

    try {
      const result = await apiRequest<BackendHealth>("/health");
      setBackendHealth(result);
    } catch (error) {
      setBackendHealth(null);
      setHealthError(
        error instanceof Error
          ? error.message
          : "Backend health could not be loaded.",
      );
    }
  }

  useEffect(() => {
    void syncTemplates();
    void loadBackendHealth();
  }, []);

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadError("Choose a video file before uploading.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadMessage(null);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const video = await apiRequest<VideoRecord>("/videos/upload", {
        method: "POST",
        body: formData,
      });

      setUploadedVideo(video);
      setUploadMessage(`Uploaded video #${video.id} successfully.`);
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
          prompt_template_id: Number(selectedPromptTemplateId),
        }),
      });

      setAnalysis(createdAnalysis);
      setUploadMessage(null);
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
    <div className="flow-stack">
      <div className="workflow-overview">
        <article
          className={`overview-card ${uploadedVideo ? "overview-card-complete" : ""}`}
        >
          <span className="overview-index">1</span>
          <div>
            <h3>Upload</h3>
            <p>
              {uploadedVideo
                ? `Video #${uploadedVideo.id} is ready`
                : selectedFile
                  ? "File selected and ready to upload"
                  : "Choose a local clip to begin"}
            </p>
          </div>
        </article>
        <article
          className={`overview-card ${selectedPromptTemplate ? "overview-card-complete" : ""}`}
        >
          <span className="overview-index">2</span>
          <div>
            <h3>Template</h3>
            <p>
              {selectedPromptTemplate
                ? `${selectedPromptTemplate.title} selected`
                : isSyncingTemplates
                  ? "Syncing local templates"
                  : "Pick the analysis prompt"}
            </p>
          </div>
        </article>
        <article
          className={`overview-card ${hasAnalysisResult ? "overview-card-complete" : ""}`}
        >
          <span className="overview-index">3</span>
          <div>
            <h3>Review</h3>
            <p>
              {analysis
                ? `Analysis #${analysis.id} is ready to inspect`
                : isAnalysisReady
                  ? "Run Gemini and review the output"
                  : "Complete the first two steps"}
            </p>
          </div>
        </article>
      </div>

      <section className="panel workflow-panel">
        <div className="step-header">
          <div className="step-badge">1</div>
          <div className="step-copy">
            <p className="kicker">Step 1</p>
            <h2>Upload a local video</h2>
            <p className="section-lead">
              Choose a clip, upload it once, and keep the stored local file
              available for preview and analysis.
            </p>
          </div>
        </div>

        <div className="step-grid step-grid-wide">
          <div className="surface-card">
            <form className="form-stack" onSubmit={handleUploadSubmit}>
              <label className="field">
                <span>Video file</span>
                <input
                  className="input-control"
                  type="file"
                  accept="video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setUploadedVideo(null);
                    setAnalysis(null);
                    setAnalysisError(null);
                    setUploadError(null);
                    setUploadMessage(null);
                  }}
                />
              </label>

              {selectedFile ? (
                <dl className="data-list data-list-grid compact-data-list">
                  <div>
                    <dt>Filename</dt>
                    <dd>{selectedFile.name}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedFile.type || "unknown"}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{formatFileSize(selectedFile.size)}</dd>
                  </div>
                </dl>
              ) : (
                <div className="empty-state-card">
                  <p className="mini-label">No file selected</p>
                  <p className="muted-label">
                    Pick one local video to unlock upload, preview, and
                    analysis.
                  </p>
                </div>
              )}

              <div className="action-strip">
                <div className="action-copy">
                  <p className="mini-label">Storage target</p>
                  <p>
                    Uploaded files are stored in <code>backend/data/uploads/</code>.
                  </p>
                </div>
                <div className="button-row">
                  <button
                    className="button-primary"
                    type="submit"
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload video"}
                  </button>
                </div>
              </div>
            </form>

            {uploadMessage ? (
              <p className="feedback-success">{uploadMessage}</p>
            ) : null}
            {uploadError ? <p className="feedback-error">{uploadError}</p> : null}
          </div>

          <div className="surface-card surface-card-subtle">
            <div className="subsection-header">
              <div>
                <p className="mini-label">Stored preview</p>
                <h3>{uploadedVideo ? "Uploaded video ready" : "Waiting for upload"}</h3>
              </div>
              {uploadedVideo ? (
                <span className="meta-pill meta-pill-success">
                  Video #{uploadedVideo.id}
                </span>
              ) : null}
            </div>

            {uploadedVideo ? (
              <>
                <dl className="data-list data-list-grid compact-data-list">
                  <div>
                    <dt>Filename</dt>
                    <dd>{uploadedVideo.original_filename}</dd>
                  </div>
                  <div>
                    <dt>MIME type</dt>
                    <dd>{uploadedVideo.mime_type}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{formatFileSize(uploadedVideo.size_bytes)}</dd>
                  </div>
                  <div>
                    <dt>Created at</dt>
                    <dd>{formatDateTime(uploadedVideo.created_at)}</dd>
                  </div>
                </dl>

                {!analysis && uploadedVideoUrl ? (
                  <div className="result-block">
                    <h3>Uploaded video preview</h3>
                    <video
                      className="video-player"
                      controls
                      preload="metadata"
                      src={uploadedVideoUrl}
                    >
                      Your browser could not play this uploaded video.
                    </video>
                  </div>
                ) : null}

                <dl className="data-list compact-link-list">
                  <div>
                    <dt>Stored path</dt>
                    <dd className="break-text">{uploadedVideo.stored_path}</dd>
                  </div>
                  <div>
                    <dt>Playback URL</dt>
                    <dd className="break-text">{uploadedVideo.file_url}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="empty-state-card">
                <p className="mini-label">Preview area</p>
                <p className="muted-label">
                  The stored video record, local preview, and playback path
                  appear here after upload.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel workflow-panel">
        <div className="step-header">
          <div className="step-badge">2</div>
          <div className="step-copy">
            <p className="kicker">Step 2</p>
            <h2>Select a prompt template</h2>
            <p className="section-lead">
              Sync local prompt files, pick the right template, and keep the
              template details compact and easy to compare.
            </p>
          </div>
        </div>

        <div className="step-grid">
          <div className="surface-card">
            <div className="subsection-header">
              <div>
                <p className="mini-label">Prompt source</p>
                <h3>Local template sync</h3>
              </div>
              <span className="meta-pill">
                {promptTemplates.length} template
                {promptTemplates.length === 1 ? "" : "s"}
              </span>
            </div>

            <p className="muted-label panel-note">
              Templates are loaded from <code>prompts/templates/</code> and can
              be resynced at any time.
            </p>

            <div className="action-strip">
              <label className="field">
                <span>Prompt template</span>
                <select
                  className="input-control"
                  value={selectedPromptTemplateId}
                  onChange={(event) => setSelectedPromptTemplateId(event.target.value)}
                  disabled={promptTemplates.length === 0 || isSyncingTemplates}
                >
                  <option value="">Select a prompt template</option>
                  {promptTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.title} ({template.key})
                    </option>
                  ))}
                </select>
              </label>

              <div className="button-row">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => {
                    void syncTemplates();
                  }}
                  disabled={isSyncingTemplates}
                >
                  {isSyncingTemplates ? "Syncing..." : "Sync local templates"}
                </button>
              </div>
            </div>

            {templateMessage ? (
              <p className="feedback-success">{templateMessage}</p>
            ) : null}
            {templateError ? (
              <p className="feedback-error">{templateError}</p>
            ) : null}
          </div>

          <div className="surface-card surface-card-subtle">
            {selectedPromptTemplate ? (
              <div className="template-summary-card">
                <div className="template-summary-head">
                  <div>
                    <p className="mini-label">Selected template</p>
                    <h3>{selectedPromptTemplate.title}</h3>
                  </div>
                  <span className="template-key-pill">
                    {selectedPromptTemplate.key}
                  </span>
                </div>

                <p className="template-description">
                  {selectedPromptTemplate.description ?? "No description"}
                </p>

                <div className="meta-pill-row">
                  <span className="meta-pill">
                    {selectedPromptTemplate.output_type} output
                  </span>
                  <span className="meta-pill">
                    {selectedPromptTemplate.is_active ? "active" : "inactive"}
                  </span>
                  {selectedPromptTemplate.key === "boxing_structured" ? (
                    <span className="meta-pill meta-pill-accent">
                      Default structured test template
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <p className="mini-label">No template selected</p>
                <p className="muted-label">
                  Choose one template to define how Gemini should review the
                  uploaded video.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel workflow-panel">
        <div className="step-header">
          <div className="step-badge">3</div>
          <div className="step-copy">
            <p className="kicker">Step 3</p>
            <h2>Run Gemini analysis</h2>
            <p className="section-lead">
              Execute the selected template on the uploaded video, then review
              the normalized and raw output in one place.
            </p>
          </div>
        </div>

        <div className="surface-card action-surface">
          <div className="action-surface-copy">
            <p className="mini-label">Execution readiness</p>
            <h3>Run the current local demo flow</h3>
            <div className="meta-pill-row">
              <span
                className={`meta-pill ${uploadedVideo ? "meta-pill-success" : ""}`}
              >
                {uploadedVideo ? "Video ready" : "Upload required"}
              </span>
              <span
                className={`meta-pill ${selectedPromptTemplate ? "meta-pill-success" : ""}`}
              >
                {selectedPromptTemplate ? "Template selected" : "Template required"}
              </span>
              <span
                className={`meta-pill ${backendHealth?.gemini_configured ? "meta-pill-success" : ""}`}
              >
                {backendHealth?.gemini_configured
                  ? "Gemini configured"
                  : "Gemini not configured"}
              </span>
            </div>
          </div>
          <div className="button-row">
            <button
              className="button-primary"
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
              Gemini is not configured in the backend yet. Set
              <code> DETECT_DEMO_GEMINI_API_KEY</code> in <code>backend/.env</code>,
              then restart the backend.
            </p>
            <p className="muted-label">
              Configured model: <code>{backendHealth.gemini_model}</code>
            </p>
          </div>
        ) : null}

        {healthError ? <p className="feedback-error">{healthError}</p> : null}
        {analysisError ? <p className="feedback-error">{analysisError}</p> : null}

        {analysis ? (
          <div className="result-card result-card-strong">
            <div className="result-card-head">
              <div>
                <p className="mini-label">Analysis result</p>
                <h3>Stored Gemini review</h3>
              </div>
              <div className="meta-pill-row">
                <span className="meta-pill meta-pill-accent">
                  {analysis.status}
                </span>
                <span className="meta-pill">{analysis.prompt_template.key}</span>
              </div>
            </div>

            <dl className="data-list data-list-grid compact-data-list">
              <div>
                <dt>Analysis ID</dt>
                <dd>{analysis.id}</dd>
              </div>
              <div>
                <dt>Model name</dt>
                <dd>{analysis.model_name ?? "null"}</dd>
              </div>
              <div>
                <dt>Parser strategy</dt>
                <dd>{analysis.parser_strategy ?? "n/a"}</dd>
              </div>
              <div>
                <dt>JSON parse</dt>
                <dd>
                  {analysis.json_parse_succeeded === null
                    ? "n/a"
                    : analysis.json_parse_succeeded
                      ? "succeeded"
                      : "not used / failed"}
                </dd>
              </div>
              <div>
                <dt>Updated at</dt>
                <dd>{formatDateTime(analysis.updated_at)}</dd>
              </div>
              <div>
                <dt>Prompt template</dt>
                <dd>
                  {analysis.prompt_template.title} ({analysis.prompt_template.key})
                </dd>
              </div>
              <div>
                <dt>Template key at execution</dt>
                <dd>{analysis.template_key_snapshot ?? "n/a"}</dd>
              </div>
              <div>
                <dt>Video</dt>
                <dd>
                  #{analysis.video.id} {analysis.video.original_filename}
                </dd>
              </div>
              <div>
                <dt>Video type</dt>
                <dd>{analysis.video.mime_type}</dd>
              </div>
              <div>
                <dt>Video size</dt>
                <dd>{formatFileSize(analysis.video.size_bytes)}</dd>
              </div>
            </dl>

            {reviewVideo && reviewVideoUrl ? (
              <div className="result-block">
                <div className="subsection-header">
                  <div>
                    <p className="mini-label">Recorded input</p>
                    <h3>Uploaded video</h3>
                  </div>
                </div>
                <div className="video-review-card">
                  <video
                    className="video-player"
                    controls
                    preload="metadata"
                    src={reviewVideoUrl}
                  >
                    Your browser could not play this uploaded video.
                  </video>
                  <dl className="data-list video-meta-list data-list-grid compact-data-list">
                    <div>
                      <dt>Filename</dt>
                      <dd>{reviewVideo.original_filename}</dd>
                    </div>
                    <div>
                      <dt>MIME type</dt>
                      <dd>{reviewVideo.mime_type}</dd>
                    </div>
                    <div>
                      <dt>Size</dt>
                      <dd>{formatFileSize(reviewVideo.size_bytes)}</dd>
                    </div>
                    <div>
                      <dt>Created at</dt>
                      <dd>{formatDateTime(reviewVideo.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Playback URL</dt>
                      <dd className="break-text">{reviewVideo.file_url}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null}

            <div className="result-block">
              <div className="subsection-header">
                <div>
                  <p className="mini-label">Normalized review</p>
                  <h3>Parsed response</h3>
                </div>
              </div>
              <div className="normalized-grid">
                <section className="normalized-card normalized-card-wide">
                  <h4>Summary</h4>
                  <p>
                    {normalizedAnalysisResponse.summary || "No summary was parsed."}
                  </p>
                </section>
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
            </div>

            <div className="result-block">
              <div className="subsection-header">
                <div>
                  <p className="mini-label">Model output</p>
                  <h3>Raw response</h3>
                </div>
              </div>
              <pre className="code-block">
                {analysis.raw_response ?? "No raw text response was stored."}
              </pre>
            </div>
          </div>
        ) : (
          <div className="empty-state-card">
            <p className="mini-label">No analysis yet</p>
            <p className="muted-label">
              Upload a video and select a prompt template to generate the first
              Gemini result for this page.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
