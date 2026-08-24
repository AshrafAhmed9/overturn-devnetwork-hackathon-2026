# Devpost submission copy

## Elevator pitch

Insurers reject claims by citing rules that have already expired. Overturn catches the contradiction, drafts the appeal, and will not file anything until a human signs it.

## Project description

Overturn is a document-first claim-review tool for a painful but common situation: an insurer rejects a health claim using an argument that no longer applies.

The demo uses a synthetic Indian health-insurance case. A rejection letter alleges non-disclosure after 63 months of continuous cover and does not allege fraud. Overturn finds the current IRDAI health-insurance circular through SerpApi, places the cited ground beside the rule, and shows the contradiction: the 60-month moratorium had already elapsed.

The point is not just the conclusion. Overturn makes the boundary visible. Nutrient provides a separate evidence lab that extracts page-anchored evidence with confidence scores; uncertain or incomplete fields are shown for human correction. PII is redacted before model use. Foxit PDF Services creates, merges, OCRs, extracts, and compresses the seeded representation; the exact resulting bytes are hashed and shown with sources. The bounded document agent can perform reversible document work, but signing stays outside its environment.

Only a human approval of the exact PDF mints a one-time signing capability. Supabase records the case and append-only audit events. The Foxit sandbox handoff consumes that capability before it opens an embedded eSign session for the human signer. A duplicate approval is rejected.

## Built with

- Next.js + TypeScript
- Nutrient Data Extraction
- SerpApi
- Foxit Fusion eSign sandbox
- Supabase
- Gemini 2.5 Flash provider interface
- Vercel

## Tracks

Enter: **Foxit**, **Nutrient**, and **SerpApi**.

Do not enter Doctavian: this submission intentionally avoids a shallow second document-generator integration.

## Screenshot order

1. The side-by-side contradiction: rejection ground on the left, 63 months and the rule on the right.
2. The Agent Authority Ledger: reversible tools on the left and the blocked signing action on the right.

## 60-second demo script

**0–10 seconds:** “An insurer rejected this claim for non-disclosure. But the policy had been continuously active for 63 months, and the letter never alleges fraud.”

**10–25 seconds:** “Overturn pulls the governing rule from the regulator, shows it beside the rejection letter, and catches the contradiction: the insurer used a ground that stopped applying three months earlier.”

**25–40 seconds:** “The evidence came from a document extraction step with confidence scores. Anything uncertain is shown for correction, and personal identifiers are removed before a model sees the text.”

**40–55 seconds:** “The agent can extract, generate, merge, and compress. It cannot sign. The person sees the exact PDF, sources, and hash, then explicitly approves it.”

**55–60 seconds:** “That approval mints one single-use capability for a Foxit sandbox signing session. The agent researches. The human attests.”
