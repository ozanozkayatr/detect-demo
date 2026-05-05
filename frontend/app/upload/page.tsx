import { UploadWorkflow } from "@/components/upload-workflow";

export default function UploadPage() {
  return (
    <main>
      <section className="page-header">
        <span className="eyebrow">Local Gemini demo</span>
        <h1>Upload and run analysis</h1>
        <p>
          This page proves the first real end-to-end path: upload a video, sync
          local prompt templates, run a Gemini analysis, and inspect the stored
          raw plus parsed result.
        </p>
      </section>

      <UploadWorkflow />
    </main>
  );
}
