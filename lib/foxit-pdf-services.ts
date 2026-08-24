import { performance } from "node:perf_hooks";
import { createAgentEnvironment, runDocumentAgent } from "./agent";

export type FoxitPipelineEvent = { tool: string; duration: string; kind: "reversible"; note: string };

type Task = { taskId?: string; status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; resultDocumentId?: string; error?: { message?: string } };

/**
 * A deliberately small, server-only adapter for Foxit PDF Services. The API
 * operations mirror the public Foxit MCP server's document lifecycle calls.
 */
export class FoxitPdfServices {
  private readonly baseUrl = "https://na1.fusion.foxit.com/pdf-services/api";

  private headers() {
    const clientId = process.env.FOXIT_CLIENT_ID;
    const clientSecret = process.env.FOXIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Foxit PDF Services credentials are not configured.");
    return { client_id: clientId, client_secret: clientSecret };
  }

  private async timed(tool: string, note: string, action: () => Promise<void>, events: FoxitPipelineEvent[]) {
    const started = performance.now();
    await action();
    const elapsed = performance.now() - started;
    events.push({ tool, duration: elapsed >= 1000 ? `${(elapsed / 1000).toFixed(1)}s` : `${Math.round(elapsed)}ms`, kind: "reversible", note });
  }

  private async upload(text: string, filename: string) {
    const form = new FormData();
    form.append("file", new Blob([text], { type: "text/plain" }), filename);
    const response = await fetch(`${this.baseUrl}/documents/upload`, { method: "POST", headers: this.headers(), body: form, signal: AbortSignal.timeout(30_000) });
    const payload = await response.json().catch(() => ({})) as { documentId?: string; message?: string };
    if (!response.ok || !payload.documentId) throw new Error(payload.message ?? `Foxit upload failed (${response.status}).`);
    return payload.documentId;
  }

  private async submit(path: string, payload: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.json().catch(() => ({})) as Task & { message?: string };
    if (!response.ok || !body.taskId) throw new Error(body.message ?? `Foxit operation failed (${response.status}).`);
    return this.waitForTask(body.taskId);
  }

  private async waitForTask(taskId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, { headers: this.headers(), signal: AbortSignal.timeout(30_000) });
      const task = await response.json().catch(() => ({})) as Task;
      if (!response.ok) throw new Error(`Foxit task status failed (${response.status}).`);
      if (task.status === "COMPLETED" && task.resultDocumentId) return task.resultDocumentId;
      if (task.status === "FAILED") throw new Error(task.error?.message ?? "Foxit document task failed.");
    }
    throw new Error("Foxit document task timed out.");
  }

  private async download(documentId: string) {
    const response = await fetch(`${this.baseUrl}/documents/${documentId}/download`, { headers: this.headers(), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Foxit download failed (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async renderRepresentation(input: { draftText: string; evidenceText: string }) {
    const events: FoxitPipelineEvent[] = [];
    let representationId = "";
    let evidenceId = "";
    let mergedId = "";
    let ocrId = "";
    let compressedId = "";
    const environment = createAgentEnvironment([
      { name: "generate_document", execute: async () => {
        await this.timed("generate_document", "Foxit PDF Services created the representation and cited-evidence PDFs.", async () => {
          representationId = await this.submit("/documents/create/pdf-from-text", { documentId: await this.upload(input.draftText, "overturn-representation.txt") });
          evidenceId = await this.submit("/documents/create/pdf-from-text", { documentId: await this.upload(input.evidenceText, "overturn-evidence.txt") });
        }, events);
      } },
      { name: "merge_pdfs", execute: async () => {
        await this.timed("merge_pdfs", "Foxit PDF Services combined the representation and its exhibit.", async () => {
          // Foxit PDF Services names this request member documentInfos.
          mergedId = await this.submit("/documents/enhance/pdf-combine", { documentInfos: [{ documentId: representationId }, { documentId: evidenceId }] });
        }, events);
      } },
      { name: "ocr_pdf", execute: async () => {
        await this.timed("ocr_pdf", "Foxit PDF Services ran OCR on the assembled PDF.", async () => {
          ocrId = await this.submit("/documents/analyze/pdf-ocr", { documentId: mergedId, config: { languages: ["en-US"] } });
        }, events);
      } },
      { name: "extract_text", execute: async () => {
        await this.timed("extract_text", "Foxit PDF Services extracted text from the OCR output.", async () => {
          const textId = await this.submit("/documents/convert/pdf-to-text", { documentId: ocrId });
          await this.download(textId);
        }, events);
      } },
      { name: "compress_pdf", execute: async () => {
        await this.timed("compress_pdf", "Foxit PDF Services compressed the final human-review copy.", async () => {
          compressedId = await this.submit("/documents/modify/pdf-compress", { documentId: ocrId, compressionLevel: "LOW" });
        }, events);
      } },
    ]);
    await runDocumentAgent(environment, ["generate_document", "merge_pdfs", "ocr_pdf", "extract_text", "compress_pdf"]);
    return { bytes: await this.download(compressedId), events };
  }
}
