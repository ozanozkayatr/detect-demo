"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type VideoRecord = {
  id: number;
  original_filename: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
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

type AnalysisRecord = {
  id: number;
  video_id: number;
  prompt_template_id: number;
  status: string;
  raw_response: string | null;
  parsed_response: Record<string, unknown> | null;
  model_name: string | null;
  confidence: number | null;
  created_at: string;
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

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as
      | { detail?: string | { msg?: string }[] }
      | undefined;

    if (typeof payload?.detail === "string") {
      return payload.detail;
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

  const [isSyncingTemplates, setIsSyncingTemplates] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);

  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const selectedPromptTemplate = useMemo(
    () =>
      promptTemplates.find(
        (template) => String(template.id) === selectedPromptTemplateId,
      ) ?? null,
    [promptTemplates, selectedPromptTemplateId],
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

  useEffect(() => {
    void syncTemplates();
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
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Placeholder analysis could not be created.",
      );
    } finally {
      setIsCreatingAnalysis(false);
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
            </dl>
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
            </dl>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <p className="kicker">Step 3</p>
        <h2>Create a placeholder analysis</h2>
        <p>
          This creates a stub analysis record for the uploaded video and
          selected template. No Gemini call happens in this step.
        </p>

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
            {isCreatingAnalysis ? "Creating..." : "Create placeholder analysis"}
          </button>
        </div>

        {analysisError ? <p className="feedback-error">{analysisError}</p> : null}

        {analysis ? (
          <div className="result-card">
            <p className="kicker">Created analysis</p>
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
                <dt>Prompt template</dt>
                <dd>
                  {analysis.prompt_template.title} ({analysis.prompt_template.key})
                </dd>
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

            <div className="result-block">
              <h3>Parsed response</h3>
              <pre className="code-block">
                {JSON.stringify(analysis.parsed_response, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="muted-label">
            No analysis has been created yet for the current upload.
          </p>
        )}
      </section>
    </div>
  );
}
