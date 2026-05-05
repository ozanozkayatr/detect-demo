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

  return (
    <section className="panel">
      <p className="kicker">Backend status</p>
      <h2>Local API readiness</h2>
      <div className={badgeClassName}>
        <span className="status-dot" aria-hidden="true" />
        <span>
          {loading
            ? "Checking backend"
            : error
              ? "Backend unavailable"
              : `${data?.service ?? "api"} is reachable`}
        </span>
      </div>
      {error ? (
        <p>{error}</p>
      ) : (
        <ul className="status-list">
          <li>
            API status: <strong>{data?.status ?? "unknown"}</strong>
          </li>
          <li>
            Database: <strong>{data?.database ?? "unknown"}</strong>
          </li>
          <li>
            Upload dir: <code>{data?.upload_dir ?? "n/a"}</code>
          </li>
          <li>
            Prompts dir: <code>{data?.prompts_dir ?? "n/a"}</code>
          </li>
          <li>
            Gemini:{" "}
            <strong>
              {data?.gemini_configured ? "configured" : "not configured"}
            </strong>
          </li>
          <li>
            Gemini model: <code>{data?.gemini_model ?? "n/a"}</code>
          </li>
        </ul>
      )}
    </section>
  );
}
