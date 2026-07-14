import mammoth from "mammoth";

export interface ExtractedDoc {
  html: string;
  text: string;
}

// Extracts content from a .docx buffer. mammoth reads the OOXML document part
// only — it does not execute macros/VBA and does not resolve external content —
// so this is content extraction, not document rendering.
export async function extractDocx(buffer: Buffer): Promise<ExtractedDoc> {
  const [htmlRes, textRes] = await Promise.all([
    mammoth.convertToHtml({ buffer }),
    mammoth.extractRawText({ buffer }),
  ]);
  return { html: htmlRes.value || "", text: textRes.value || "" };
}
