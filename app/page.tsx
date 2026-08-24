"use client";

import { useState } from "react";
import type { DemoCase } from "@/lib/domain";

export default function Home() {
  const [caseData, setCaseData] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  async function startDemo() {
    setLoading(true);
    const response = await fetch("/api/demo", { method: "POST" });
    setCaseData(await response.json());
    setLoading(false);
  }

  async function approve() {
    if (!caseData) return;
    const response = await fetch("/api/consent", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentHash: caseData.documentHash, attested: true })
    });
    setApproved(response.ok);
  }

  return <main>
    <nav><span className="mark">O</span><span>overturn</span><small>Claim review, under your control</small></nav>
    <section className="hero">
      <p className="eyebrow">A safer way to challenge a rejection</p>
      <h1>Catch the rule your insurer<br />shouldn’t be able to use.</h1>
      <p className="lede">Overturn reads the evidence, spots a contradiction, drafts your appeal, and stops before filing. A person signs every time.</p>
      <button onClick={startDemo} disabled={loading}>{loading ? "Reviewing case…" : "Run the 63-month demo"}</button>
      <p className="fine">Synthetic documents only. No information is sent to a model until personal details are removed.</p>
    </section>

    {caseData && <section className="workspace">
      <div className="section-title"><p className="eyebrow">Case finding</p><h2>The insurer’s reason is three months late.</h2></div>
      <div className="finding">
        <article id="rejection-letter"><p className="label">THE REJECTION LETTER</p><h3>“Pre-existing condition was not disclosed.”</h3><p>Reason given: {caseData.rejectionGround}.</p><p className="danger">No fraud allegation appears in the letter.</p><a href="#source-list">View source · Page 1</a></article>
        <article id="policy-record" className="rule"><p className="label">THE RULE THAT APPLIES</p><strong>{caseData.policyMonths} months</strong><p>of uninterrupted coverage</p><blockquote>{caseData.legalQuote}</blockquote><a href={caseData.sources[2].href} target="_blank">View primary source ↗</a></article>
      </div>
      <div className="verdict"><span>CONTRADICTION FOUND</span><p>The policy has been active for <b>63 months</b>. The cited ground became unavailable after month 60 unless established fraud is alleged. This letter alleges none.</p></div>

      <section className="consent">
        <div><p className="eyebrow">Consent gate</p><h2>The agent stops here.</h2><p>Review the exact draft, its sources, and its file fingerprint before you approve a one-time signing capability.</p></div>
        <div className="document"><p className="label">DRAFT REPRESENTATION · PDF READY</p><h3>Representation regarding claim repudiation</h3><p>Prepared for {caseData.policyholder}. Every factual statement is traceable below.</p><code>SHA-256 {caseData.documentHash}</code><button className="secondary" onClick={approve} disabled={approved}>{approved ? "One-time approval recorded" : "I reviewed this exact draft"}</button></div>
      </section>

      <section className="ledger"><div><p className="eyebrow">Agent authority ledger</p><h2>{caseData.ledger.length} tool calls, one hard boundary.</h2><p>Only reversible document work ran automatically.</p></div><div className="ledger-columns">
        <div><p className="label green">✓ REVERSIBLE · AUTO-EXECUTED</p>{caseData.ledger.filter(e => e.kind === "reversible").map(e => <p className="event" key={e.tool}><span>{e.tool}</span><small>{e.duration}</small></p>)}</div>
        <div><p className="label red">⊘ IRREVERSIBLE · REQUIRES HUMAN</p>{caseData.ledger.filter(e => e.kind === "blocked").map(e => <div className="blocked" key={e.tool}><p>{e.tool}</p><small>BLOCKED — {e.note}</small>{approved && <small className="approved">A human capability was minted separately.</small>}</div>)}</div>
      </div></section>

      <section className="sources" id="source-list"><p className="eyebrow">Claim-by-claim provenance</p><h2>Nothing in the draft is a black box.</h2>{caseData.sources.map(source => <a key={source.label} href={source.href} target={source.href.startsWith("http") ? "_blank" : undefined}><b>{source.label}</b><span>{source.detail}</span><em>Open →</em></a>)}</section>
      <details><summary>Privacy proof: redacted payload supplied to the model</summary><pre>{caseData.redactedPayload}</pre></details>
    </section>}
  </main>;
}
