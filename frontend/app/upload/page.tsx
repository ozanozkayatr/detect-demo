export default function UploadPage() {
  return (
    <main>
      <section className="page-header">
        <span className="eyebrow">Upload foundation</span>
        <h1>Upload placeholder</h1>
        <p>
          The backend upload route is scaffolded, but this page remains
          intentionally minimal until the analysis flow is defined.
        </p>
      </section>

      <section className="panel">
        <p className="kicker">Next implementation target</p>
        <h2>Wire this form to the backend upload endpoint</h2>
        <p>
          Start with a single video file, persist its metadata, and then create
          an analysis record against a selected prompt template.
        </p>

        <div className="upload-dropzone">
          <input type="file" accept="video/*" disabled />
          <p className="muted-label">
            UI placeholder only. The API foundation already exists at
            <code> /api/v1/videos/upload</code>.
          </p>
        </div>

        <ul className="upload-notes">
          <li>Uploads are configured to live under `backend/data/uploads/`.</li>
          <li>Analysis execution is not implemented yet.</li>
          <li>Gemini integration is intentionally deferred.</li>
        </ul>
      </section>
    </main>
  );
}
