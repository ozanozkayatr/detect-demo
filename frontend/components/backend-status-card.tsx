"use client";

import { useEffect, useState } from "react";

type HealthPayload = {
  status: string;
  service: string;
  database: string;
  prompts_dir: string;
  upload_dir: string;
  gemini_configured: boolean;
  gemini_model: string;
  error?: string | null;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000/api/v1";

export function BackendStatusCard() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`);
        }

        const payload = (await response.json()) as HealthPayload;

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Backend is not reachable yet.";
          setError(message);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  const badgeClassName = loading
    ? "status-badge"
    : error
      ? "status-badge status-error"
      : "status-badge status-ok";

  const badgeLabel = loading
    ? "Checking backend"
    : error
      ? "Backend unavailable"
      : `${data?.service ?? "api"} is reachable`;

  return (
    <section className="workspace-stage">
      <div className="status-stage-head">
        <p className="mini-label">Backend status</p>
        <h2>Local API readiness</h2>
        <div className={badgeClassName}>
          <span className="status-dot" aria-hidden="true" />
          <span>{badgeLabel}</span>
        </div>
      </div>

      {error ? (
        <p className="feedback-error">{error}</p>
      ) : (
        <dl className="data-list data-list-grid compact-data-list status-data-list">
          <div>
            <dt>API status</dt>
            <dd>{data?.status ?? "unknown"}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd>{data?.database ?? "unknown"}</dd>
          </div>
          <div>
            <dt>Gemini</dt>
            <dd>
              {data?.gemini_configured ? "configured" : "not configured"}
            </dd>
          </div>
          <div>
            <dt>Gemini model</dt>
            <dd className="break-text">{data?.gemini_model ?? "n/a"}</dd>
          </div>
          <div>
            <dt>Upload dir</dt>
            <dd className="break-text">
              <code>{data?.upload_dir ?? "n/a"}</code>
            </dd>
          </div>
          <div>
            <dt>Prompts dir</dt>
            <dd className="break-text">
              <code>{data?.prompts_dir ?? "n/a"}</code>
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
