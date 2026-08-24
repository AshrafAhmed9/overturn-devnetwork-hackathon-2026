import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DocumentGenerator } from "./providers";
import { FoxitPdfServices, type FoxitPipelineEvent } from "./foxit-pdf-services";

export const demoLegalQuote = "After completion of sixty continuous months of coverage (including portability and migration) in health insurance policy, no policy and claim shall be contestable by the insurer on grounds of non-disclosure, misrepresentation, except on grounds of established fraud.";

/** Local fallback used only if Foxit PDF Services is temporarily unavailable. */
export class LocalPdfGenerator implements DocumentGenerator {
  async render(_: "representation", data: { policyholder: string; policyMonths: number; legalQuote: string }) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const write = (text: string, y: number, size = 11, font = regular) => page.drawText(text, { x: 58, y, size, font, color: rgb(.09, .14, .24) });
    write("OVERTURN", 783, 12, bold);
    write("Representation regarding claim repudiation", 738, 19, bold);
    write(`Prepared for: ${data.policyholder}`, 700);
    write(`Continuous coverage: ${data.policyMonths} months`, 682);
    write("The rejection states non-disclosure / misrepresentation and does not allege fraud.", 642);
    write("The following regulatory text is quoted verbatim from the source cited in Overturn:", 614);
    const lines = wrap(data.legalQuote, 83);
    lines.forEach((line, index) => write(line, 580 - index * 17, 10));
    write("Requested action", 468, 13, bold);
    write("Please review the repudiation ground against the applicable moratorium provision and", 442);
    write("provide a reasoned decision with the supporting evidence relied upon.", 425);
    write("This synthetic demo document is not legal advice and cannot be filed without human approval.", 78, 9);
    return pdf.save();
  }
}

let demoArtifactPromise: Promise<{ bytes: Uint8Array; events: FoxitPipelineEvent[]; provider: "foxit" | "local-fallback" }> | undefined;

/** One immutable byte sequence is used for the displayed hash and downloaded draft. */
function draftText() {
  return `OVERTURN\n\nRepresentation regarding claim repudiation\n\nPrepared for: Ananya Rao\nContinuous coverage: 63 months\n\nThe rejection states non-disclosure / misrepresentation and does not allege fraud.\n\nThe following regulatory text is quoted verbatim from the cited source:\n${demoLegalQuote}\n\nRequested action\nPlease review the repudiation ground against the applicable moratorium provision and provide a reasoned decision with the supporting evidence relied upon.\n\nThis synthetic demo document is not legal advice and cannot be filed without human approval.`;
}

function evidenceText() {
  return `OVERTURN — CITED EVIDENCE EXHIBIT\n\nRejection letter, page 1\nGround: non-disclosure / misrepresentation of a pre-existing condition.\nNo fraud is alleged.\n\nPolicy record, page 2\nContinuous coverage: 63 months.\n\nIRDAI Master Circular on Health Insurance Business, dated 29 May 2024\n${demoLegalQuote}`;
}

/** One immutable artifact per warm server instance is used for the displayed hash and draft download. */
export function getDemoArtifact() {
  demoArtifactPromise ??= (async () => {
    try {
      const artifact = await new FoxitPdfServices().renderRepresentation({ draftText: draftText(), evidenceText: evidenceText() });
      return { ...artifact, provider: "foxit" as const };
    } catch (error) {
      console.error("Foxit PDF Services unavailable; using local PDF fallback", error);
      const bytes = await new LocalPdfGenerator().render("representation", { policyholder: "Ananya Rao", policyMonths: 63, legalQuote: demoLegalQuote });
      return { bytes, events: [], provider: "local-fallback" as const };
    }
  })();
  return demoArtifactPromise;
}

export async function getDemoPdf() {
  return (await getDemoArtifact()).bytes;
}

function wrap(text: string, limit: number) {
  return text.split(" ").reduce<string[]>((lines, word) => {
    const current = lines.at(-1) ?? "";
    if (`${current} ${word}`.trim().length > limit) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`.trim();
    return lines;
  }, [""]);
}
