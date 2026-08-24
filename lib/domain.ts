export type Provenance = {
  label: string;
  detail: string;
  href: string;
};

export type LedgerEvent = {
  tool: string;
  duration: string;
  kind: "reversible" | "blocked" | "approved";
  note?: string;
};

export type DemoCase = {
  policyMonths: number;
  rejectionGround: string;
  fraudAlleged: boolean;
  policyholder: string;
  sources: Provenance[];
  redactedPayload: string;
  ledger: LedgerEvent[];
  audit: string[];
  documentHash: string;
  legalQuote: string;
};
