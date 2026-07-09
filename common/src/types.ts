// Plain-object materialisation of a project's collaborative document.
// The Yjs document is the source of truth at runtime; this shape is what both
// the client and server read when composing the report / exporting to Word.

export interface Recommendation {
  id: string;
  type: string; // "Approve" | "Note"
  text: string;
}

// rowKey -> (financialYear -> value)
export type NumericTable = Record<string, Record<string, number>>;

export interface ProjectData {
  // Step 1 — Basic Details
  projectName: string;
  department: string;
  processType: string;
  budgetYear: string;

  // Step 2 — Core Details
  shortDescription: string;
  recommendations: Recommendation[];
  detailedDescriptionHtml: string;
  electionCommitment: string; // "Yes" | "No"
  electionCommitmentDetailsHtml: string;

  // Step 3 — Financials
  finStartYear: string;
  finEndYear: string;
  financialTable: NumericTable;
  costingMethodologyHtml: string;

  // Step 4 — FTEs
  fteStartYear: string;
  fteEndYear: string;
  fteTable: NumericTable;

  // Step 5 — Location
  locations: string[];

  // Step 6 — Extra Details
  additionalInfoHtml: string;
}

export const FINANCIAL_ROWS: string[] = [
  "Services Appropriation",
  "Equity Appropriation",
  "Revenue Returned to Government",
];

export const FTE_ROWS: string[] = [
  "New FTEs",
  "Reallocation of existing FTEs",
];

export const MAX_PROJECT_NAME = 180;
export const MAX_SHORT_DESCRIPTION = 300;

export function emptyProjectData(): ProjectData {
  return {
    projectName: "",
    department: "",
    processType: "",
    budgetYear: "",
    shortDescription: "",
    recommendations: [],
    detailedDescriptionHtml: "",
    electionCommitment: "",
    electionCommitmentDetailsHtml: "",
    finStartYear: "",
    finEndYear: "",
    financialTable: {},
    costingMethodologyHtml: "",
    fteStartYear: "",
    fteEndYear: "",
    fteTable: {},
    locations: [],
    additionalInfoHtml: "",
  };
}

// REST project list row (denormalised).
export interface ProjectSummary {
  id: string;
  name: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}
