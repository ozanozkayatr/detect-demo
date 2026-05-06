import { UploadWorkflow } from "@/components/upload-workflow";

export default function UploadPage() {
  return (
    <main className="workflow-page">
      <section className="page-header">
        <span className="eyebrow">Local Gemini demo</span>
        <h1>Upload and run analysis</h1>
        <p>
          Use one page to upload a clip, choose the evaluation prompt, and
          review the stored Gemini result with the video beside it.
        </p>
        <div className="meta-pill-row">
          <span className="meta-pill">Upload local video</span>
          <span className="meta-pill">Select prompt template</span>
          <span className="meta-pill">Review parsed + raw output</span>
        </div>
      </section>

      <UploadWorkflow />
    </main>
  );
}
