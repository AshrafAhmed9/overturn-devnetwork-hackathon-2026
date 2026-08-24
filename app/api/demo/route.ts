import { createDemoCase } from "@/lib/demo";
import { persistDemoCase } from "@/lib/audit-store";
import { lookupRegulatorySource } from "@/lib/regulatory-lookup";
import { saveDraft } from "@/lib/draft-store";
import { getDemoPdf } from "@/lib/document-generator";

export async function POST() {
  const encoder = new TextEncoder();
  const event = (controller: ReadableStreamDefaultController<Uint8Array>, type: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
  return new Response(new ReadableStream({
    start(controller) {
      void (async () => {
        try {
          let regulatorySource;
          try { regulatorySource = await lookupRegulatorySource("synthetic insurer", "non-disclosure misrepresentation"); }
          catch (error) { console.error("SerpApi lookup unavailable; using verified fallback source", error); }
          const demo = await createDemoCase(regulatorySource, pipelineEvent => event(controller, "pipeline", pipelineEvent));
          try {
            const caseId = await persistDemoCase(demo);
            await saveDraft(caseId, await getDemoPdf());
            event(controller, "complete", { ...demo, caseId });
          } catch (error) {
            console.error("Supabase audit persistence unavailable", error);
            event(controller, "complete", demo);
          }
        } catch (error) {
          event(controller, "error", { error: error instanceof Error ? error.message : "The demo could not be started." });
        } finally { controller.close(); }
      })();
    }
  }), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
