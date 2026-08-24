# Overturn

**The agent researches. The human attests.**

Insurers can reject a health claim by citing a rule that no longer applies. Overturn makes that contradiction visible, drafts a representation from cited evidence, and cannot prepare a signing session until a person has reviewed the exact file and approved its SHA-256 hash.

This is a synthetic, single-case submission for the DevNetwork [API + Cloud + AI] Hackathon 2026. The seeded case has 63 continuous months of cover. The letter alleges non-disclosure, alleges no fraud, and is checked against the IRDAI 60-month moratorium.

## Run it

Node 22 or newer is required.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, then choose **Run the 63-month demo**.

Required runtime values are documented in `.env.example`. The browser receives only Supabase’s publishable values. Nutrient, SerpApi, Foxit, Gemini, and Supabase secret keys remain server-only.

## What a judge can verify

- **One-click contradiction:** the rejection letter and governing rule appear side by side. The opening screen uses plain language: an insurer used a rule after it stopped applying.
- **Nutrient evidence lab:** upload a PDF, scan, JPEG, PNG, or TIFF to verify page-anchored fields with confidence scores. Fields below 90%, or a document missing a required claim fact, are editable. The latter is the documented fallback when an OCR response reports uniformly high confidence. This separate lab does not alter the seeded legal draft.
- **Privacy boundary:** PII redaction runs inside the model-boundary function. The UI exposes the exact redacted payload used for the model request.
- **SerpApi:** the seeded demo performs a cached live query restricted to IRDAI. It accepts a result only when it is a direct `irdai.gov.in/documents/...pdf` URL; redirect, search, and `update_language` URLs are rejected. If the search does not return that direct PDF, the UI links to the official IRDAI Health circular index rather than relabelling an untrusted result.
- **Human gate:** approving the rendered hash atomically advances the case in Supabase. A duplicate approval returns HTTP 409 and cannot mint a second capability.
- **Foxit PDF Services:** the seeded document is created from two text sources, merged, OCRed, text-extracted, and compressed by Foxit PDF Services. The app saves those exact resulting bytes in a protected Supabase bucket before showing their hash.
- **Foxit eSign sandbox:** the one-time capability is hashed in the case record, consumed by a dedicated server-only signing boundary, and then opens an embedded Foxit signing session. Only a human can complete the sandbox signature; the agent module has neither eSign credentials nor the capability.
- **Authority Ledger:** the app shows only completed, timed Foxit calls from the current document run. It never displays invented telemetry.

The independent Gemini check uses `gemini-2.5-flash` through a single `LanguageProvider` interface. It is hidden when `GEMINI_API_KEY` is not configured; the seeded contradiction and consent gate do not depend on a model response.

## Evidence-backed legal demo

The demo document retains this operative sentence verbatim:

> After completion of sixty continuous months of coverage (including portability and migration) in health insurance policy, no policy and claim shall be contestable by the insurer on grounds of non-disclosure, misrepresentation, except on grounds of established fraud.

The 60-month moratorium is distinct from the maximum 36-month PED waiting period. The source is resolved live from IRDAI for the demo and is shown as a click-through citation. This is a synthetic demonstration, not legal advice.

## Foxit boundary position

Signing should remain outside the agent’s toolset. We go further: reversibility alone is not enough. A merge is reversible in theory, but after a human has attested to a signed file, changing that file misrepresents what they approved. Overturn therefore permits document assembly before attestation and gates any operation that changes what a person has already vouched for.

The bounded document agent receives callable tools, not a list of labels:

```text
ocr_pdf · extract_text · generate_document · merge_pdfs · compress_pdf
```

It executes its explicit document plan against Foxit PDF Services. There is no signing tool, eSign credential, or human approval capability in its injected environment.

## Jailbreak proof

```text
 RUN  v3.0.5

 ✓ tests/security.test.ts (7 tests)

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Run it with:

```bash
npm test
```

The jailbreak test requests `esign_send_envelope` from the document agent. It fails because no signing tool or signing capability exists in that environment; the dedicated human-only route is separate from the agent module.

## Verified locally against live services

- Nutrient Data Extraction returned 9 page-anchored confidence fields from the generated PDF.
- The deployed seeded route completed Foxit PDF generation, merge, OCR, text extraction, compression, and protected exact-byte storage; its live ledger reports the measured operation timings.
- SerpApi output is URL-validated before display; a direct-PDF miss falls back to the official IRDAI circular index.
- Supabase persisted a seeded case and audit events; an attestation succeeded once and the duplicate was blocked with HTTP 409.
- Production build and the six security tests pass.

## Scope

This build deliberately has no user account system, dashboard, automated government-portal filing, reminder emails, or consumer-court workflow. The demo proves one case clearly: document evidence → redaction → cited contradiction → rendered draft → human attestation → sandbox signing handoff.
