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
      <section className="panel">
        <p className="kicker">Step 1</p>
        <h2>Upload a local video</h2>
        <p>
          Choose a single local video file and send it to the backend. The file
          is stored under <code>backend/data/uploads/</code> and a video record
          is written to PostgreSQL.
        </p>

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
            <dl className="data-list">
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
            <p className="muted-label">No file selected yet.</p>
          )}

          <div className="button-row">
            <button className="button-primary" type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload video"}
            </button>
          </div>
        </form>

        {uploadMessage ? <p className="feedback-success">{uploadMessage}</p> : null}
        {uploadError ? <p className="feedback-error">{uploadError}</p> : null}

        {uploadedVideo ? (
          <div className="result-card">
            <p className="kicker">Uploaded video</p>
            <dl className="data-list">
              <div>
                <dt>Video ID</dt>
                <dd>{uploadedVideo.id}</dd>
              </div>
              <div>
                <dt>Stored filename</dt>
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
                <dt>Stored path</dt>
                <dd className="break-text">{uploadedVideo.stored_path}</dd>
              </div>
              <div>
                <dt>Playback URL</dt>
                <dd className="break-text">{uploadedVideo.file_url}</dd>
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
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="kicker">Step 2</p>
        <h2>Select a prompt template</h2>
        <p>
          Prompt templates are synced from local files in
          <code> prompts/templates/</code>. You can resync them at any time.
        </p>

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

        {templateMessage ? <p className="feedback-success">{templateMessage}</p> : null}
        {templateError ? <p className="feedback-error">{templateError}</p> : null}

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

        {selectedPromptTemplate ? (
          <div className="result-card">
            <p className="kicker">Selected template</p>
            <dl className="data-list">
              <div>
                <dt>Key</dt>
                <dd>{selectedPromptTemplate.key}</dd>
              </div>
              <div>
                <dt>Title</dt>
                <dd>{selectedPromptTemplate.title}</dd>
              </div>
              <div>
                <dt>Output type</dt>
                <dd>{selectedPromptTemplate.output_type}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{selectedPromptTemplate.description ?? "No description"}</dd>
              </div>
              {selectedPromptTemplate.key === "boxing_structured" ? (
                <div>
                  <dt>Recommended use</dt>
                  <dd>Best current template for stable structured boxing feedback.</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="kicker">Step 3</p>
        <h2>Run Gemini analysis</h2>
        <p>
          This runs a single Gemini analysis against the uploaded video using
          the selected prompt template from the database.
        </p>

        {backendHealth && !backendHealth.gemini_configured ? (
          <div className="warning-card">
            <p className="kicker">Gemini configuration</p>
            <p>
              Gemini is not configured in the backend yet. Set
              <code> DETECT_DEMO_GEMINI_API_KEY</code> in
              <code> backend/.env</code>, then restart the backend.
            </p>
            <p className="muted-label">
              Configured model: <code>{backendHealth.gemini_model}</code>
            </p>
          </div>
        ) : null}

        {healthError ? <p className="feedback-error">{healthError}</p> : null}

        <div className="button-row">
          <button
            className="button-primary"
            type="button"
            onClick={() => {
              void handleCreateAnalysis();
            }}
            disabled={
              !uploadedVideo ||
              !selectedPromptTemplateId ||
              isCreatingAnalysis
            }
          >
            {isCreatingAnalysis ? "Running Gemini..." : "Run Gemini analysis"}
          </button>
        </div>

        {analysisError ? <p className="feedback-error">{analysisError}</p> : null}

        {analysis ? (
          <div className="result-card">
            <p className="kicker">Analysis result</p>
            <dl className="data-list">
              <div>
                <dt>Analysis ID</dt>
                <dd>{analysis.id}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{analysis.status}</dd>
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
                <dd>{analysis.updated_at}</dd>
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
                <h3>Uploaded video</h3>
                <div className="video-review-card">
                  <video
                    className="video-player"
                    controls
                    preload="metadata"
                    src={reviewVideoUrl}
                  >
                    Your browser could not play this uploaded video.
                  </video>
                  <dl className="data-list video-meta-list">
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
              <h3>Normalized parsed response</h3>
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
              <h3>Raw response</h3>
              <pre className="code-block">
                {analysis.raw_response ?? "No raw text response was stored."}
              </pre>
            </div>
          </div>
        ) : (
          <p className="muted-label">
            No Gemini analysis has been created yet for the current upload.
          </p>
        )}
      </section>
    </div>
  );
}
