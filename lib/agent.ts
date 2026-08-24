/**
 * A bounded document-workflow agent. Its entire capability surface is injected
 * by the caller: signing is deliberately not a member of AgentToolName.
 */
export type AgentToolName = "generate_document" | "merge_pdfs" | "ocr_pdf" | "extract_text" | "compress_pdf";
export type AgentTool = { name: AgentToolName; execute: () => Promise<void> };
export type AgentEnvironment = Readonly<{ tools: ReadonlyMap<AgentToolName, AgentTool> }>;

export class MissingSigningCapabilityError extends Error {
  constructor() { super("Signing is unavailable: no signing tool or signing capability exists in the agent environment."); }
}

export class UnavailableAgentToolError extends Error {
  constructor(tool: string) { super(`The agent cannot call ${tool}: it is not registered in this execution environment.`); }
}

export function createAgentEnvironment(tools: readonly AgentTool[]): AgentEnvironment {
  return Object.freeze({ tools: new Map(tools.map(tool => [tool.name, tool])) });
}

/** The plan is bounded and explicit: document work only, no network filing/signing tool. */
export async function runDocumentAgent(environment: AgentEnvironment, plan: readonly string[]) {
  const completed: AgentToolName[] = [];
  for (const requestedTool of plan) {
    if (requestedTool === "esign_send_envelope" || requestedTool === "sign_document") throw new MissingSigningCapabilityError();
    const tool = environment.tools.get(requestedTool as AgentToolName);
    if (!tool) throw new UnavailableAgentToolError(requestedTool);
    await tool.execute();
    completed.push(tool.name);
  }
  return completed;
}
