import { BackendStatusCard } from "@/components/backend-status-card";

export default function StatusPage() {
  return (
    <main className="showcase-stack">
      <section className="demo-hero">
        <div className="demo-hero-copy">
          <span className="eyebrow">System check</span>
          <h1>Status</h1>
          <p>
            Confirm the frontend can reach the local FastAPI server and that the
            backend is pointing at the expected directories.
          </p>
        </div>
      </section>

      <BackendStatusCard />
    </main>
  );
}
