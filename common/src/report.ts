// Deterministic composition of a ProjectData into an ordered list of report
// blocks, with flat continuous legal paragraph numbering applied as a single
// render pass. Shared by the live preview (React) and the Word export (docx)
// so the two can never disagree about numbering.

import { parse, HTMLElement, Node, NodeType } from "node-html-parser";
import {
  ProjectData,
  Recommendation,
  FINANCIAL_ROWS,
  FTE_ROWS,
} from "./types";
import { formatDollars, formatFte } from "./format";
import { yearsInRange } from "./referenceData";

export interface ReportInline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}

export interface ReportCell {
  inlines?: ReportInline[];
  text?: string;
  negative?: boolean;
  align?: "left" | "right";
  header?: boolean;
}

export type ReportBlock =
  | { kind: "title"; text: string; missing?: boolean }
  | { kind: "subtitle"; text: string; missing?: boolean }
  | { kind: "section"; text: string }
  | { kind: "heading"; level: number; inlines: ReportInline[] }
  | { kind: "paragraph"; num: number | null; inlines: ReportInline[]; missing?: boolean }
  | { kind: "list"; ordered: boolean; items: ReportInline[][] }
  | { kind: "image"; src: string; alt?: string }
  | { kind: "table"; columns: string[]; rows: ReportCell[][]; caption?: string };

const MISSING = "[Not yet completed]";

function isEmptyHtml(html: string): boolean {
  if (!html) return true;
  const stripped = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return stripped.length === 0 && !/<img/i.test(html);
}

// ---- Rich-text (HTML) -> blocks --------------------------------------------

function collectInlines(
  node: Node,
  ctx: { bold: boolean; italic: boolean; underline: boolean; strike: boolean },
  out: ReportInline[]
): void {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = (node as any).rawText
      ? decodeEntities((node as any).rawText)
      : node.text;
    if (text) out.push({ text, ...markFlags(ctx) });
    return;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  const next = { ...ctx };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
  for (const child of el.childNodes) collectInlines(child, next, out);
}

function markFlags(ctx: {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}): Partial<ReportInline> {
  const f: Partial<ReportInline> = {};
  if (ctx.bold) f.bold = true;
  if (ctx.italic) f.italic = true;
  if (ctx.underline) f.underline = true;
  if (ctx.strike) f.strike = true;
  return f;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function inlinesOf(el: HTMLElement): ReportInline[] {
  const out: ReportInline[] = [];
  for (const child of el.childNodes) {
    collectInlines(child, { bold: false, italic: false, underline: false, strike: false }, out);
  }
  return out.filter((i) => i.text.length > 0);
}

// Parses a rich-text field's HTML into report blocks, assigning legal numbers to
// top-level paragraphs via the shared counter. Headings, lists, tables and
// images are emitted but not numbered.
function richHtmlToBlocks(html: string, counter: { n: number }): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const root = parse(html || "");

  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.nodeType === NodeType.TEXT_NODE) {
        const text = decodeEntities((node as any).rawText || node.text || "").trim();
        if (text) {
          blocks.push({
            kind: "paragraph",
            num: ++counter.n,
            inlines: [{ text }],
          });
        }
        continue;
      }
      if (node.nodeType !== NodeType.ELEMENT_NODE) continue;
      const el = node as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      switch (tag) {
        case "p": {
          const inlines = inlinesOf(el);
          const img = el.querySelector("img");
          if (inlines.length === 0 && img) {
            blocks.push({ kind: "image", src: img.getAttribute("src") || "", alt: img.getAttribute("alt") || "" });
          } else if (inlines.length > 0) {
            blocks.push({ kind: "paragraph", num: ++counter.n, inlines });
          }
          break;
        }
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6": {
          blocks.push({ kind: "heading", level: Number(tag[1]), inlines: inlinesOf(el) });
          break;
        }
        case "ul":
        case "ol": {
          const items: ReportInline[][] = [];
          for (const li of el.querySelectorAll("li")) {
            items.push(inlinesOf(li));
          }
          blocks.push({ kind: "list", ordered: tag === "ol", items });
          break;
        }
        case "img": {
          blocks.push({ kind: "image", src: el.getAttribute("src") || "", alt: el.getAttribute("alt") || "" });
          break;
        }
        case "table": {
          const rows: ReportCell[][] = [];
          let columns: string[] = [];
          const trs = el.querySelectorAll("tr");
          trs.forEach((tr, ri) => {
            const cells: ReportCell[] = [];
            for (const cell of tr.querySelectorAll("th,td")) {
              const header = cell.tagName?.toLowerCase() === "th" || ri === 0;
              cells.push({ inlines: inlinesOf(cell as HTMLElement), header });
            }
            if (ri === 0) columns = cells.map((c) => (c.inlines || []).map((i) => i.text).join(""));
            else rows.push(cells);
          });
          if (rows.length === 0 && columns.length) {
            // single-row table
            blocks.push({ kind: "table", columns, rows: [] });
          } else {
            blocks.push({ kind: "table", columns, rows });
          }
          break;
        }
        case "figure":
        case "div":
        case "blockquote": {
          walk(el.childNodes);
          break;
        }
        default:
          // Unknown wrapper: try its children.
          if (el.childNodes.length) walk(el.childNodes);
          break;
      }
    }
  };

  walk(root.childNodes);
  return blocks;
}

// ---- Numeric tables --------------------------------------------------------

function numericTableBlock(
  rowLabels: string[],
  table: ProjectData["financialTable"],
  years: string[],
  formatter: (v: number) => { text: string; negative: boolean }
): ReportBlock {
  const columns = ["", ...years, "Total"];
  const rows: ReportCell[][] = rowLabels.map((label) => {
    const cells: ReportCell[] = [{ text: label, align: "left" }];
    let total = 0;
    for (const y of years) {
      const v = table?.[label]?.[y] ?? 0;
      total += v;
      const f = formatter(v);
      cells.push({ text: f.text, negative: f.negative, align: "right" });
    }
    const ft = formatter(total);
    cells.push({ text: ft.text, negative: ft.negative, align: "right", header: true });
    return cells;
  });
  return { kind: "table", columns, rows };
}

// ---- Top-level composition -------------------------------------------------

export function composeReport(data: ProjectData): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const counter = { n: 0 };

  // Title & subtitle
  blocks.push({
    kind: "title",
    text: data.projectName || MISSING,
    missing: !data.projectName,
  });
  const meta = [data.department, data.processType, data.budgetYear].filter(Boolean).join("  •  ");
  blocks.push({
    kind: "subtitle",
    text: meta || MISSING,
    missing: !data.department || !data.processType || !data.budgetYear,
  });

  // Summary
  blocks.push({ kind: "section", text: "Summary" });
  if (data.shortDescription) {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: data.shortDescription }] });
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  // Recommendations — numbered paragraphs with type prepended.
  blocks.push({ kind: "section", text: "Recommendations" });
  if (data.recommendations.length) {
    data.recommendations.forEach((rec: Recommendation) => {
      const type = rec.type ? `${rec.type}: ` : "";
      const text = rec.text || MISSING;
      blocks.push({
        kind: "paragraph",
        num: ++counter.n,
        inlines: [
          ...(type ? [{ text: type, bold: true }] : []),
          { text },
        ],
        missing: !rec.text,
      });
    });
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  // Detailed Description
  blocks.push({ kind: "section", text: "Detailed Description" });
  if (!isEmptyHtml(data.detailedDescriptionHtml)) {
    blocks.push(...richHtmlToBlocks(data.detailedDescriptionHtml, counter));
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  // Election Commitment
  if (data.electionCommitment === "Yes") {
    blocks.push({ kind: "section", text: "Election Commitment Details" });
    if (!isEmptyHtml(data.electionCommitmentDetailsHtml)) {
      blocks.push(...richHtmlToBlocks(data.electionCommitmentDetailsHtml, counter));
    } else {
      blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
    }
  }

  // Financials
  blocks.push({ kind: "section", text: "Financials ($ million)" });
  const finYears = yearsInRange(data.finStartYear, data.finEndYear);
  if (finYears.length) {
    blocks.push(numericTableBlock(FINANCIAL_ROWS, data.financialTable, finYears, formatDollars));
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }
  blocks.push({ kind: "section", text: "Costing Methodology" });
  if (!isEmptyHtml(data.costingMethodologyHtml)) {
    blocks.push(...richHtmlToBlocks(data.costingMethodologyHtml, counter));
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  // FTEs
  blocks.push({ kind: "section", text: "Full-Time Equivalents (FTEs)" });
  const fteYears = yearsInRange(data.fteStartYear, data.fteEndYear);
  if (fteYears.length) {
    blocks.push(numericTableBlock(FTE_ROWS, data.fteTable, fteYears, formatFte));
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  // Location
  blocks.push({ kind: "section", text: "Project Location" });
  if (data.locations.length) {
    blocks.push({
      kind: "paragraph",
      num: ++counter.n,
      inlines: [{ text: data.locations.join(", ") }],
    });
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  // Additional Information
  blocks.push({ kind: "section", text: "Additional Information" });
  if (!isEmptyHtml(data.additionalInfoHtml)) {
    blocks.push(...richHtmlToBlocks(data.additionalInfoHtml, counter));
  } else {
    blocks.push({ kind: "paragraph", num: ++counter.n, inlines: [{ text: MISSING }], missing: true });
  }

  return blocks;
}
