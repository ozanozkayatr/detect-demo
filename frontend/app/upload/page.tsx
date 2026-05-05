import { UploadWorkflow } from "@/components/upload-workflow";

export default function UploadPage() {
  return (
    <main>
      <section className="page-header">
        <span className="eyebrow">Local demo flow</span>
        <h1>Upload and stub analysis</h1>
        <p>
          This page now proves the smallest end-to-end path:
          upload a video, sync local prompt templates, create a placeholder
          analysis record, and inspect the returned stub payload.
        </p>
      </section>

      <UploadWorkflow />
    </main>
  );
}
