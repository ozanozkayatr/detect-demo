import Link from "next/link";

import { BackendStatusCard } from "@/components/backend-status-card";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <span className="eyebrow">Boxing video analysis foundation</span>
        <h1>Local-first structure for upload, prompts, and analysis.</h1>
        <p>
          This scaffold keeps the first milestone narrow: file upload, backend
          health, prompt-template plumbing, and PostgreSQL-backed records. Model
          inference comes later.
        </p>
        <div className="hero-actions">
          <div className="grid-card">
            <p className="kicker">Frontend</p>
            <h2>Next.js App Router</h2>
            <p>
              Minimal pages for overview, upload, and backend readiness checks.
            </p>
          </div>
          <div className="grid-card">
            <p className="kicker">Backend</p>
            <h2>FastAPI + PostgreSQL</h2>
            <p>
              Clean route stubs, SQLAlchemy models, Alembic migrations, and
              local upload storage.
            </p>
          </div>
        </div>
      </section>

      <section className="grid">
        <BackendStatusCard />

        <article className="grid-card">
          <p className="kicker">Upload route</p>
          <h2>Prepared for the next step</h2>
          <p>
            The backend includes a real upload endpoint scaffold and local file
            storage. The UI stays intentionally lightweight until the workflow is
            finalized.
          </p>
          <Link href="/upload">Open upload placeholder</Link>
        </article>

        <article className="grid-card">
          <p className="kicker">Prompt templates</p>
          <h2>Local prompt directory is ready</h2>
          <p>
            Prompt files can be added under <code>prompts/templates/</code>. The
            backend already knows where to look for them.
          </p>
          <Link href="/status">Review status details</Link>
        </article>
      </section>
    </main>
  );
}

