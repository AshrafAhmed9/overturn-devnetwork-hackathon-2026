import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DocumentGenerator } from "./providers";

export const demoLegalQuote = "After completion of sixty continuous months of coverage (including portability and migration) in health insurance policy, no policy and claim shall be contestable by the insurer on grounds of non-disclosure, misrepresentation, except on grounds of established fraud.";

/** A local demo generator. Replace with the Foxit adapter after sandbox verification. */
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

let demoPdfPromise: Promise<Uint8Array> | undefined;

/** One immutable byte sequence is used for the displayed hash and downloaded draft. */
export function getDemoPdf() {
  demoPdfPromise ??= new LocalPdfGenerator().render("representation", {
    policyholder: "Ananya Rao", policyMonths: 63, legalQuote: demoLegalQuote
  });
  return demoPdfPromise;
}

function wrap(text: string, limit: number) {
  return text.split(" ").reduce<string[]>((lines, word) => {
    const current = lines.at(-1) ?? "";
    if (`${current} ${word}`.trim().length > limit) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`.trim();
    return lines;
  }, [""]);
}
