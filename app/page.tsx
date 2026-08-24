"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoCase } from "@/lib/domain";
import type { ContradictionAnalysis } from "@/lib/analysis";

type ExtractedField = { text: string; confidence: number; page: string; bounds: { x: number; y: number; width: number; height: number } };

export default function Home() {
  const [caseData, setCaseData] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [pipelineEvents, setPipelineEvents] = useState<Array<{ tool: string; duration: string }>>([]);
  const [approved, setApproved] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [signingCapability, setSigningCapability] = useState<string | null>(null);
  const [signerEmail] = useState("demo-signer@example.com");
  const [signingState, setSigningState] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [envelopeId, setEnvelopeId] = useState<string | null>(null);
  const [executedDownloadUrl, setExecutedDownloadUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ContradictionAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null);
  const [uploadState, setUploadState] = useState<{ needsReview: boolean; reviewReason?: string } | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const findingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!caseData) return;
    const timer = window.setTimeout(() => {
      findingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      findingRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [caseData]);

  useEffect(() => {
    void fetch("/api/analyze").then(response => response.json()).then((result: { available?: boolean }) => setModelAvailable(Boolean(result.available))).catch(() => setModelAvailable(false));
  }, []);

  async function startDemo() {
    setLoading(true);
    setPipelineEvents([]);
    setApproved(false); setApprovalError(null); setSigningCapability(null); setSigningState(null); setSigningUrl(null); setEnvelopeId(null); setExecutedDownloadUrl(null);
    setUploadError(null);
    const response = await fetch("/api/demo", { method: "POST" });
    if (!response.ok || !response.body) { setUploadError("The demo could not be started."); setLoading(false); return; }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const type = frame.match(/^event: (.+)$/m)?.[1]; const raw = frame.match(/^data: (.+)$/m)?.[1]; if (!type || !raw) continue;
        const payload = JSON.parse(raw) as DemoCase & { tool?: string; duration?: string; error?: string };
        if (type === "pipeline" && payload.tool && payload.duration) setPipelineEvents(events => [...events, { tool: payload.tool!, duration: payload.duration! }]);
        if (type === "complete") setCaseData(payload);
        if (type === "error") setUploadError(payload.error ?? "The demo could not be started.");
      }
    }
    setLoading(false);
  }

  async function validateWithGemini() {
    if (!caseData) return;
    setAnalyzing(true); setAnalysisError(null);
    const response = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedText: caseData.redactedPayload })
    });
    const result = await response.json() as { analysis?: ContradictionAnalysis; error?: string };
    if (response.ok && result.analysis) setAnalysis(result.analysis);
    else setAnalysisError(result.error ?? "The model analysis could not be completed.");
    setAnalyzing(false);
  }

  async function extractUpload(file: File) {
    setUploading(true); setUploadError(null); setUploadState(null);
    const form = new FormData(); form.set("document", file);
    const response = await fetch("/api/extract", { method: "POST", body: form });
    const result = await response.json() as { fields?: ExtractedField[]; needsReview?: boolean; reviewReason?: string; error?: string };
    if (response.ok && result.fields) {
      setExtractedFields(result.fields);
      setUploadState({ needsReview: Boolean(result.needsReview), reviewReason: result.reviewReason });
    }
    else setUploadError(result.error ?? "The document could not be extracted.");
    setUploading(false);
  }

  function updateExtractedField(index: number, text: string) {
    setExtractedFields((fields) => fields?.map((field, fieldIndex) => fieldIndex === index ? { ...field, text } : field) ?? null);
  }

  async function approve() {
    if (!caseData) return;
    setApprovalError(null);
    const response = await fetch("/api/consent", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: caseData.caseId, documentHash: caseData.documentHash, attested: true })
    });
    if (response.ok) {
      const result = await response.json() as { signingCapability?: string };
      setSigningCapability(result.signingCapability ?? null);
      setApproved(true);
    }
    else {
      const result = await response.json() as { error?: string };
      setApprovalError(result.error ?? "Approval could not be recorded.");
    }
  }

  async function prepareSigningSession() {
    if (!caseData || !signingCapability) return;
    setSigningState("Preparing the sandbox session…");
    const response = await fetch("/api/sign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: caseData.caseId, signingCapability, recipientEmail: signerEmail, recipientName: "Demo Signer" }),
    });
    const result = await response.json() as { status?: string; error?: string; envelopeId?: string; signingSessionUrl?: string | null };
    if (!response.ok) setSigningState(result.error ?? "The signing session could not be prepared.");
    else {
      setSigningUrl(result.signingSessionUrl ?? null);
      setEnvelopeId(result.envelopeId ?? null);
      setSigningState(result.signingSessionUrl ? "Sandbox signing session prepared. Open it in Foxit to apply the demo signature." : "Sandbox envelope prepared. Foxit did not return an embedded signing URL.");
    }
    setSigningCapability(null);
  }

  useEffect(() => {
    if (!envelopeId || executedDownloadUrl) return;
    const timer = window.setInterval(() => {
      void fetch(`/api/sign?folderId=${encodeURIComponent(envelopeId)}`).then(response => response.json()).then((result: { status?: string; downloadUrl?: string | null }) => {
        if (result.status === "EXECUTED" && result.downloadUrl) { setExecutedDownloadUrl(result.downloadUrl); setSigningState("Signature completed. The executed PDF is ready."); }
      });
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [envelopeId, executedDownloadUrl]);

  return <main>
    <nav><span className="mark">O</span><span>overturn</span><small>Claim review, under your control</small><a className="live-demo-link" href="https://overturn-devnetwork-hackathon-2026.vercel.app" target="_blank" rel="noreferrer">Live demo ↗</a></nav>
    <section className="hero">
      <p className="eyebrow">A safer way to challenge a rejection</p>
      <h1>Catch the rule your insurer<br />shouldn’t be able to use.</h1>
      <p className="lede">Overturn reads the evidence, spots a contradiction, drafts your appeal, and stops before filing. A person signs every time.</p>
      <button onClick={startDemo} disabled={loading}>{loading ? "Reviewing case…" : "Run the 63-month demo"}</button>
      {loading && <div className="pipeline-live" aria-live="polite"><span>Foxit pipeline is running</span>{pipelineEvents.length ? pipelineEvents.map(item => <p key={item.tool}>✓ {item.tool}<small>{item.duration}</small></p>) : <p>Preparing cited evidence…</p>}</div>}
      {caseData && <a className="demo-ready" href="#case-finding">Your finding is ready below <span aria-hidden="true">↓</span></a>}
      <label className="file-picker">{uploading ? "Extracting with Nutrient…" : "Test Nutrient extraction"}<input type="file" accept="application/pdf,image/jpeg,image/png,image/tiff" onChange={(event) => { const file = event.target.files?.[0]; if (file) void extractUpload(file); }} disabled={uploading} /></label>
      <p className="fine">Synthetic documents only. No information is sent to a model until personal details are removed.</p>
      {uploadState && <p className="upload-success">Nutrient returned {extractedFields?.length ?? 0} page-anchored evidence regions. {uploadState.needsReview ? uploadState.reviewReason ?? "A low-confidence field needs review." : "All returned fields cleared the confidence threshold."} This evidence-lab upload does not replace the seeded case used to generate the legal draft.</p>}
      {uploadError && <p className="model-error">Upload unavailable: {uploadError}</p>}
    </section>

    {extractedFields && <section className="correction-panel" aria-live="polite">
      <p className="eyebrow">Evidence confirmation</p>
      <h2>Confirm any uncertain extraction.</h2>
      <p>Only fields below 90% confidence need editing. Their page coordinates stay attached to the evidence.</p>
      <div className="correction-list">{extractedFields.map((field, index) => {
        const needsReview = field.confidence < 0.9;
        return <label key={`${field.page}-${index}`} className={needsReview ? "needs-review" : "accepted-field"}>
          <span>Page {field.page} · {Math.round(field.confidence * 100)}% {needsReview ? "· review required" : "· auto-accepted"}</span>
          <input value={field.text} onChange={(event) => updateExtractedField(index, event.target.value)} aria-label={`Extracted field on page ${field.page}`} />
        </label>;
      })}</div>
    </section>}

    {caseData && <section className="workspace" id="case-finding" ref={findingRef} tabIndex={-1}>
      <div className="section-title"><p className="eyebrow">Case finding</p><h2>The insurer’s reason is three months late.</h2></div>
      <div className="finding">
        <article id="rejection-letter"><p className="label">THE REJECTION LETTER</p><h3>“Pre-existing condition was not disclosed.”</h3><p>Reason given: {caseData.rejectionGround}.</p><p className="danger">No fraud allegation appears in the letter.</p><a href="#source-list">View source · Page 1</a></article>
        <article id="policy-record" className="rule"><p className="label">THE RULE THAT APPLIES</p><strong>{caseData.policyMonths} months</strong><p>of uninterrupted coverage</p><blockquote>{caseData.legalQuote}</blockquote><a href={caseData.sources[2].href} target="_blank">View primary source ↗</a></article>
      </div>
      <div className="verdict"><span>CONTRADICTION FOUND</span><p>The policy has been active for <b>63 months</b>. The cited ground became unavailable after month 60 unless established fraud is alleged. This letter alleges none.</p></div>
      <div className="model-check"><div><p className="eyebrow">Independent model check</p><p>{modelAvailable ? "Run Gemini 2.5 Flash on the same redacted evidence. It cannot see the original document text." : "The independent model check is not configured for this deployment. The cited evidence and human gate remain available."}</p></div>{modelAvailable && <button onClick={validateWithGemini} disabled={analyzing}>{analyzing ? "Checking cited evidence…" : "Validate with Gemini"}</button>}</div>
      {analysis && <div className="model-result"><p className="label">MODEL RESULT · REDACTED INPUT ONLY</p><b>{analysis.conclusion}</b>{analysis.claims.map((claim, index) => <p key={`${claim.claim}-${index}`}>{claim.claim} <small>Source: {claim.source} · confidence {Math.round(claim.confidence * 100)}%</small></p>)}</div>}
      {analysisError && <p className="model-error">Model check unavailable: {analysisError}</p>}

      <section className="consent">
        <div><p className="eyebrow">Consent gate</p><h2>The agent stops here.</h2><p>Review the exact draft, its sources, and its file fingerprint before you approve a one-time signing capability.</p></div>
        <div className="document"><p className="label">DRAFT REPRESENTATION · PDF READY</p><h3>Representation regarding claim repudiation</h3><p>Prepared for {caseData.policyholder}. Every factual statement is traceable below.</p><a className="pdf-link" href={caseData.caseId ? `/api/draft?caseId=${encodeURIComponent(caseData.caseId)}` : "/api/draft"} target="_blank">Open the exact rendered PDF ↗</a><code>SHA-256 {caseData.documentHash}</code><button className="secondary" onClick={approve} disabled={approved}>{approved ? "One-time approval recorded" : "I reviewed this exact draft"}</button>{approved && <div className="signing-form"><p className="label">Synthetic Foxit sandbox signer</p><p>This uses <code>demo-signer@example.com</code>. A human must complete the signature inside Foxit.</p><button onClick={prepareSigningSession} disabled={!signingCapability}>{signingCapability ? "Prepare demo signing session" : "Demo signing capability consumed"}</button>{signingState && <p>{signingState}</p>}{signingUrl && <a className="pdf-link" href={signingUrl} target="_blank" rel="noreferrer">Open Foxit signing session ↗</a>}{executedDownloadUrl && <a className="pdf-link" href={executedDownloadUrl}>Download executed PDF ↗</a>}</div>}</div>
      </section>
      {approvalError && <p className="model-error">Approval unavailable: {approvalError}</p>}

      <section className="ledger"><div><p className="eyebrow">Agent authority ledger</p><h2>{caseData.ledger.length} tool calls, one hard boundary.</h2><p>Only reversible document work ran automatically.</p></div><div className="ledger-columns">
        <div><p className="label green">✓ REVERSIBLE · AUTO-EXECUTED</p>{caseData.ledger.filter(e => e.kind === "reversible").map(e => <p className="event" key={e.tool}><span>{e.tool}</span><small>{e.duration}</small></p>)}</div>
        <div><p className="label red">⊘ IRREVERSIBLE · REQUIRES HUMAN</p>{caseData.ledger.filter(e => e.kind === "blocked").map(e => <div className="blocked" key={e.tool}><p>{e.tool}</p><small>BLOCKED — {e.note}</small>{approved && <small className="approved">A human capability was minted separately.</small>}</div>)}</div>
      </div></section>

      <section className="sources" id="source-list"><p className="eyebrow">Claim-by-claim provenance</p><h2>Nothing in the draft is a black box.</h2>{caseData.sources.map(source => <a key={source.label} href={source.href} target={source.href.startsWith("http") ? "_blank" : undefined}><b>{source.label}</b><span>{source.detail}</span><em>Open →</em></a>)}</section>
      <details><summary>Privacy proof: redacted payload supplied to the model</summary><pre>{caseData.redactedPayload}</pre></details>
    </section>}
  </main>;
}
