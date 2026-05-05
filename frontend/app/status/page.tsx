import { BackendStatusCard } from "@/components/backend-status-card";

export default function StatusPage() {
  return (
    <main>
      <section className="page-header">
        <span className="eyebrow">System check</span>
        <h1>Status</h1>
        <p>
          This page is the simplest place to confirm that the frontend can reach
          the local FastAPI server and that the backend is pointing at the
          expected directories.
        </p>
      </section>

      <BackendStatusCard />
    </main>
  );
}

