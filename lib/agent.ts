/**
 * This is deliberately a capability-poor execution context. It receives only
 * reversible document tools; an eSign credential/capability is never injected.
 */
export type AgentEnvironment = Readonly<{ tools: readonly ["ocr_pdf", "extract_text", "generate_document", "merge_pdfs", "compress_pdf"] }>;
export const AGENT_ENVIRONMENT: AgentEnvironment = Object.freeze({
  tools: ["ocr_pdf", "extract_text", "generate_document", "merge_pdfs", "compress_pdf"]
});

export class MissingSigningCapabilityError extends Error {
  constructor() { super("Signing is unavailable: no signing capability exists in the agent environment."); }
}

export function runAgentInstruction(instruction: string, environment: AgentEnvironment = AGENT_ENVIRONMENT) {
  if (/sign|send|envelope/i.test(instruction)) {
    if (!("signingCapability" in environment)) throw new MissingSigningCapabilityError();
  }
  return { tools: environment.tools };
}
