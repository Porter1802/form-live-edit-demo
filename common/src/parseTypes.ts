// Shared types for the AI Word-form parsing feature. The server produces a
// ParseProposal; the client renders it on the validate screen and, on confirm,
// applies `data` into the collaborative document.

import { ProjectData } from "./types";

// Per-field confidence after the deterministic coercion pass.
//  - matched:   value maps cleanly onto a valid/reference value
//  - low:       value was fuzzy-matched or adjusted; a human should check it
//  - unmatched: value could not be mapped to a valid option; left blank/best-effort
//  - empty:     nothing was found in the document for this field
//  - ok:        free-text/rich-text field captured as-is
export type FieldStatus = "matched" | "low" | "unmatched" | "empty" | "ok";

export interface FieldReport {
  key: string;   // logical field key (ProjectData key or a group name)
  label: string; // human label shown on the validate screen
  status: FieldStatus;
  note?: string; // e.g. "fuzzy-matched from 'Dept of Education'"
}

export interface ParseProposal {
  data: ProjectData;
  fields: FieldReport[];
  meta: {
    model: string;
    sourceChars: number;
    truncated: boolean;
    // True when this proposal is canned sample data produced without calling the
    // AI backend (no ANTHROPIC_API_KEY set). Lets the UI label the flow clearly.
    demo?: boolean;
  };
}
