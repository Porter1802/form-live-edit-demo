import { randomUUID } from "node:crypto";
import {
  ProjectData,
  emptyProjectData,
  NumericTable,
  Recommendation,
  FieldReport,
  ParseProposal,
  DEPARTMENTS,
  PROCESS_TYPES,
  FINANCIAL_YEARS,
  LOCATIONS,
  FINANCIAL_ROWS,
  FTE_ROWS,
  RECOMMENDATION_TYPES,
  YES_NO,
  yearsInRange,
  MAX_PROJECT_NAME,
  MAX_SHORT_DESCRIPTION,
} from "../../../common/src/index";
import { AiExtraction, AI_MODEL } from "./aiExtract.js";
import { sanitizeHtml } from "./sanitize.js";

// ---- fuzzy matching --------------------------------------------------------

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diag = tmp;
    }
  }
  return prev[n];
}

interface Matched {
  value: string;
  status: "matched" | "low" | "unmatched";
}

// Snaps a raw value onto one of `options`. Exact (normalised) → matched;
// close (substring or high similarity) → low; otherwise unmatched (blank).
function matchOne(raw: string, options: string[]): Matched {
  const r = norm(raw);
  if (!r) return { value: "", status: "unmatched" };
  for (const o of options) if (norm(o) === r) return { value: o, status: "matched" };

  let best: string | null = null;
  let bestScore = 0;
  for (const o of options) {
    const no = norm(o);
    let score = 0;
    if (no.includes(r) || r.includes(no)) {
      score = Math.min(r.length, no.length) / Math.max(r.length, no.length);
    } else {
      const dist = levenshtein(r, no);
      score = 1 - dist / Math.max(r.length, no.length);
    }
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  if (best && bestScore >= 0.6) return { value: best, status: "low" };
  return { value: "", status: "unmatched" };
}

function normalizeYear(raw: string): Matched {
  if (!raw) return { value: "", status: "unmatched" };
  const nums = raw.match(/\d{2,4}/g);
  if (!nums || nums.length === 0) return { value: "", status: "unmatched" };
  let startNum = nums[0];
  if (startNum.length === 4) {
    // ok
  } else if (startNum.length === 2) {
    startNum = "20" + startNum;
  } else {
    return { value: "", status: "unmatched" };
  }
  const start = Number(startNum);
  if (!Number.isFinite(start)) return { value: "", status: "unmatched" };
  const end = ((start + 1) % 100).toString().padStart(2, "0");
  const candidate = `${start}-${end}`;
  if (FINANCIAL_YEARS.includes(candidate)) return { value: candidate, status: "matched" };
  return { value: "", status: "unmatched" };
}

// ---- coercion --------------------------------------------------------------

export function coerce(
  ex: AiExtraction,
  sourceChars: number,
  truncated: boolean
): ParseProposal {
  const data = emptyProjectData();
  const fields: FieldReport[] = [];
  const report = (key: string, label: string, status: FieldReport["status"], note?: string) =>
    fields.push({ key, label, status, note });

  const textStatus = (s: string): FieldReport["status"] => (s && s.trim() ? "ok" : "empty");

  // Step 1 — Basic Details
  data.projectName = (ex.projectName || "").slice(0, MAX_PROJECT_NAME).trim();
  report("projectName", "Project Name", textStatus(data.projectName));

  {
    const m = matchOne(ex.department, DEPARTMENTS);
    data.department = m.value;
    report(
      "department", "Department", m.status,
      m.status === "low" ? `Best match for "${ex.department}"`
        : m.status === "unmatched" && ex.department ? `Could not map "${ex.department}"` : undefined
    );
  }
  {
    const m = matchOne(ex.processType, PROCESS_TYPES);
    data.processType = m.value;
    report("processType", "Process Type", ex.processType ? m.status : "empty");
  }
  {
    const m = normalizeYear(ex.budgetYear);
    data.budgetYear = m.value;
    report("budgetYear", "Budget Year", ex.budgetYear ? m.status : "empty",
      m.status === "unmatched" && ex.budgetYear ? `Could not map "${ex.budgetYear}"` : undefined);
  }

  // Step 2 — Core Details
  data.shortDescription = (ex.shortDescription || "").slice(0, MAX_SHORT_DESCRIPTION).trim();
  report("shortDescription", "Short Description", textStatus(data.shortDescription));

  {
    const recs: Recommendation[] = [];
    let anyLow = false;
    for (const r of ex.recommendations || []) {
      const text = (r.text || "").trim();
      if (!text) continue;
      const t = matchOne(r.type || "", RECOMMENDATION_TYPES);
      if (t.status !== "matched") anyLow = true;
      recs.push({ id: randomUUID(), type: t.value || RECOMMENDATION_TYPES[0], text });
    }
    data.recommendations = recs;
    report("recommendations", "Recommendations",
      recs.length === 0 ? "empty" : anyLow ? "low" : "matched",
      recs.length ? `${recs.length} recommendation(s)` : undefined);
  }

  data.detailedDescriptionHtml = sanitizeHtml(ex.detailedDescription || "");
  report("detailedDescriptionHtml", "Detailed Description", textStatus(data.detailedDescriptionHtml));

  {
    const m = matchOne(ex.electionCommitment, YES_NO);
    data.electionCommitment = m.value;
    report("electionCommitment", "Election Commitment", ex.electionCommitment ? m.status : "empty");
  }
  // Only keep election commitment details when the answer is "Yes" (matches the
  // report composition rule — the field is dropped otherwise).
  if (data.electionCommitment === "Yes") {
    data.electionCommitmentDetailsHtml = sanitizeHtml(ex.electionCommitmentDetails || "");
    report("electionCommitmentDetailsHtml", "Election Commitment Details",
      textStatus(data.electionCommitmentDetailsHtml));
  } else {
    data.electionCommitmentDetailsHtml = "";
  }

  // Step 3 — Financials
  const finStart = normalizeYear(ex.finStartYear);
  const finEnd = normalizeYear(ex.finEndYear);
  data.finStartYear = finStart.value;
  data.finEndYear = finEnd.value;
  report("finStartYear", "Financials — Start Year", ex.finStartYear ? finStart.status : "empty");
  report("finEndYear", "Financials — End Year", ex.finEndYear ? finEnd.status : "empty");
  {
    const range = yearsInRange(data.finStartYear, data.finEndYear);
    const { table, dropped } = buildTable(ex.financialTable, FINANCIAL_ROWS, range);
    data.financialTable = table;
    const cells = ex.financialTable ? ex.financialTable.length : 0;
    report("financialTable", "Financial Table",
      cells === 0 ? "empty" : dropped > 0 ? "low" : "matched",
      dropped > 0 ? `${dropped} value(s) dropped (row/year out of range)` : undefined);
  }
  data.costingMethodologyHtml = sanitizeHtml(ex.costingMethodology || "");
  report("costingMethodologyHtml", "Costing Methodology", textStatus(data.costingMethodologyHtml));

  // Step 4 — FTEs
  const fteStart = normalizeYear(ex.fteStartYear);
  const fteEnd = normalizeYear(ex.fteEndYear);
  data.fteStartYear = fteStart.value;
  data.fteEndYear = fteEnd.value;
  report("fteStartYear", "FTEs — Start Year", ex.fteStartYear ? fteStart.status : "empty");
  report("fteEndYear", "FTEs — End Year", ex.fteEndYear ? fteEnd.status : "empty");
  {
    const range = yearsInRange(data.fteStartYear, data.fteEndYear);
    const { table, dropped } = buildTable(ex.fteTable, FTE_ROWS, range);
    data.fteTable = table;
    const cells = ex.fteTable ? ex.fteTable.length : 0;
    report("fteTable", "FTE Table",
      cells === 0 ? "empty" : dropped > 0 ? "low" : "matched",
      dropped > 0 ? `${dropped} value(s) dropped (row/year out of range)` : undefined);
  }

  // Step 5 — Location
  {
    const out: string[] = [];
    let anyLow = false;
    for (const loc of ex.locations || []) {
      const m = matchOne(loc, LOCATIONS);
      if (m.status === "unmatched") { anyLow = true; continue; }
      if (m.status === "low") anyLow = true;
      if (m.value && !out.includes(m.value)) out.push(m.value);
    }
    data.locations = out;
    report("locations", "Project Location",
      out.length === 0 ? "empty" : anyLow ? "low" : "matched",
      out.length ? out.join(", ") : undefined);
  }

  // Step 6 — Extra Details
  data.additionalInfoHtml = sanitizeHtml(ex.additionalInfo || "");
  report("additionalInfoHtml", "Additional Information", textStatus(data.additionalInfoHtml));

  return { data, fields, meta: { model: AI_MODEL, sourceChars, truncated } };
}

function buildTable(
  entries: { row: string; year: string; value: number }[] | undefined,
  validRows: string[],
  range: string[]
): { table: NumericTable; dropped: number } {
  const table: NumericTable = {};
  let dropped = 0;
  for (const e of entries || []) {
    const row = validRows.includes(e.row) ? e.row : matchOne(e.row, validRows).value;
    const year = normalizeYear(e.year).value;
    const inRange = range.length === 0 ? false : range.includes(year);
    if (!row || !year || !inRange || typeof e.value !== "number" || !Number.isFinite(e.value)) {
      dropped++;
      continue;
    }
    if (!table[row]) table[row] = {};
    table[row][year] = e.value;
  }
  return { table, dropped };
}
