import { parse, HTMLElement, Node, NodeType } from "node-html-parser";

// Server-side HTML sanitiser (control R5 — Improper Output Handling / stored XSS).
// Allow-list only the formatting the rich-text editor supports; everything else
// is unwrapped (kept as text) or dropped. AI/mammoth output is untrusted.

const ALLOWED = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "del",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "img", "a",
]);

// Tags whose entire subtree is discarded (never rendered, never unwrapped).
const DROP = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math",
  "link", "meta", "head", "noscript", "template",
]);

const VOID = new Set(["br", "img"]);

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}

function safeAttrs(tag: string, attributes: Record<string, string>): string {
  const norm: Record<string, string> = {};
  for (const k of Object.keys(attributes)) norm[k.toLowerCase()] = attributes[k];
  const out: string[] = [];
  if (tag === "img") {
    const src = norm.src || "";
    if (/^data:image\//i.test(src) || /^https:\/\//i.test(src)) {
      out.push(`src="${escapeAttr(src)}"`);
    }
    if (norm.alt) out.push(`alt="${escapeAttr(norm.alt)}"`);
  } else if (tag === "a") {
    const href = norm.href || "";
    if (/^(https?:|mailto:)/i.test(href)) out.push(`href="${escapeAttr(href)}"`);
  } else if (tag === "td" || tag === "th") {
    for (const k of ["colspan", "rowspan"]) {
      const v = norm[k];
      if (v && /^\d+$/.test(v)) out.push(`${k}="${v}"`);
    }
  }
  return out.length ? " " + out.join(" ") : "";
}

function sanitizeNode(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return escapeText((node as unknown as { rawText: string }).rawText ?? node.text ?? "");
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = (el.rawTagName || "").toLowerCase();
  if (DROP.has(tag)) return "";
  const inner = el.childNodes.map(sanitizeNode).join("");
  if (!tag || !ALLOWED.has(tag)) return inner; // unwrap unknown tags, keep children
  if (VOID.has(tag)) return `<${tag}${safeAttrs(tag, el.attributes)}>`;
  return `<${tag}${safeAttrs(tag, el.attributes)}>${inner}</${tag}>`;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const root = parse(html, { comment: false });
  const out = root.childNodes.map(sanitizeNode).join("").trim();
  return out;
}
