import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
  BorderStyle,
} from "docx";
import {
  ProjectData,
  composeReport,
  ReportBlock,
  ReportInline,
  ReportCell,
} from "../../common/src/index";

function runsFromInlines(inlines: ReportInline[], color?: string): TextRun[] {
  return inlines.map(
    (i) =>
      new TextRun({
        text: i.text,
        bold: i.bold,
        italics: i.italic,
        underline: i.underline ? {} : undefined,
        strike: i.strike,
        color,
      })
  );
}

interface ImageInfo {
  data: Buffer;
  type: "png" | "jpg" | "gif" | "bmp";
  width: number;
  height: number;
}

function parseDataUri(src: string): ImageInfo | null {
  const m = /^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i.exec(src.trim());
  if (!m) return null;
  const ext = m[1].toLowerCase();
  const type = ext === "jpeg" || ext === "jpg" ? "jpg" : (ext as ImageInfo["type"]);
  const data = Buffer.from(m[2], "base64");
  const dims = imageDimensions(data, type) || { width: 450, height: 300 };
  // Scale to a max width of 450px preserving aspect ratio.
  const maxW = 450;
  let { width, height } = dims;
  if (width > maxW) {
    height = Math.round((height * maxW) / width);
    width = maxW;
  }
  return { data, type, width, height };
}

function imageDimensions(
  buf: Buffer,
  type: string
): { width: number; height: number } | null {
  try {
    if (type === "png" && buf.length >= 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (type === "jpg") {
      let off = 2;
      while (off < buf.length) {
        if (buf[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = buf[off + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
        }
        off += 2 + buf.readUInt16BE(off + 2);
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

function headingLevelFor(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_2;
    case 2:
      return HeadingLevel.HEADING_3;
    case 3:
      return HeadingLevel.HEADING_4;
    case 4:
      return HeadingLevel.HEADING_5;
    default:
      return HeadingLevel.HEADING_6;
  }
}

function cellRuns(cell: ReportCell): TextRun[] {
  const color = cell.negative ? "C0392B" : undefined;
  if (cell.inlines && cell.inlines.length) return runsFromInlines(cell.inlines, color);
  return [new TextRun({ text: cell.text ?? "", color, bold: cell.header })];
}

function docxTable(block: Extract<ReportBlock, { kind: "table" }>): Table {
  const rows: TableRow[] = [];
  // Header row.
  rows.push(
    new TableRow({
      tableHeader: true,
      children: block.columns.map(
        (c) =>
          new TableCell({
            width: { size: 100 / block.columns.length, type: WidthType.PERCENTAGE },
            shading: { fill: "1F3A5F" },
            children: [
              new Paragraph({
                children: [new TextRun({ text: c, bold: true, color: "FFFFFF" })],
              }),
            ],
          })
      ),
    })
  );
  for (const row of block.rows) {
    rows.push(
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  alignment: cell.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  children: cellRuns(cell),
                }),
              ],
            })
        ),
      })
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function blockToDocx(block: ReportBlock): (Paragraph | Table)[] {
  switch (block.kind) {
    case "title":
      return [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [
            new TextRun({ text: block.text, color: block.missing ? "C0392B" : undefined }),
          ],
        }),
      ];
    case "subtitle":
      return [
        new Paragraph({
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: block.text,
              italics: true,
              color: block.missing ? "C0392B" : "555555",
            }),
          ],
        }),
      ];
    case "section":
      return [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: block.text })],
        }),
      ];
    case "heading":
      return [
        new Paragraph({
          heading: headingLevelFor(block.level),
          children: runsFromInlines(block.inlines),
        }),
      ];
    case "paragraph": {
      const runs: TextRun[] = [];
      if (block.num !== null) {
        runs.push(new TextRun({ text: `${block.num}.\t`, bold: true }));
      }
      const color = block.missing ? "C0392B" : undefined;
      runs.push(...runsFromInlines(block.inlines, color));
      return [
        new Paragraph({
          spacing: { after: 120 },
          children: runs,
        }),
      ];
    }
    case "list": {
      return block.items.map(
        (item, idx) =>
          new Paragraph({
            indent: { left: 720 },
            children: [
              new TextRun({ text: block.ordered ? `${idx + 1}. ` : "•  " }),
              ...runsFromInlines(item),
            ],
          })
      );
    }
    case "image": {
      const info = parseDataUri(block.src);
      if (!info) return [];
      return [
        new Paragraph({
          children: [
            new ImageRun({
              type: info.type,
              data: info.data,
              transformation: { width: info.width, height: info.height },
            }),
          ],
        }),
      ];
    }
    case "table":
      return [docxTable(block), new Paragraph({ text: "" })];
    default:
      return [];
  }
}

export async function exportDocx(data: ProjectData): Promise<Buffer> {
  const blocks = composeReport(data);
  const children: (Paragraph | Table)[] = [];
  for (const block of blocks) children.push(...blockToDocx(block));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
