import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import multer from "multer";
import * as Y from "yjs";
import {
  listProjects,
  getProject,
  createProject,
  deleteProject,
  storeYDocUpdate,
} from "./db.js";
import {
  createCollabServer,
  flushDoc,
  loadDocForRead,
} from "./collab.js";
import { materialize } from "./materialize.js";
import { exportDocx } from "./docx.js";
import { extractDocx } from "./parse/extract.js";
import { aiExtract, aiConfigured } from "./parse/aiExtract.js";
import { demoExtraction } from "./parse/demoExtract.js";
import { coerce } from "./parse/coerce.js";
import { ProjectSummary } from "../../common/src/index";

// Upload guard (controls R4/R10): memory storage (no disk writes / path
// traversal), a hard size cap, and a .docx-only filter.
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const okMime = file.mimetype === DOCX_MIME || file.mimetype === "application/octet-stream";
    const okExt = /\.docx$/i.test(file.originalname || "");
    if (okMime && okExt) cb(null, true);
    else cb(new Error("Only .docx files are accepted"));
  },
});

// esbuild provides a real __dirname in the CJS bundle (dist/index.cjs).
const PORT = Number(process.env.PORT) || 3000;
const STATIC_DIR = process.env.STATIC_DIR || path.resolve(__dirname, "../public");

const app = express();
app.use(express.json({ limit: "20mb" }));

// ---- REST API --------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/projects", (_req, res) => {
  const rows = listProjects();
  const summaries: ProjectSummary[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    department: r.department,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  res.json(summaries);
});

app.post("/api/projects", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name : "Untitled project";
  const id = randomUUID();
  createProject(id, name);
  // Seed the collaborative document with the project name.
  const doc = new Y.Doc();
  doc.getMap("project").set("projectName", name);
  storeYDocUpdate(id, Y.encodeStateAsUpdate(doc));
  res.status(201).json({ id, name });
});

app.delete("/api/projects/:id", (req, res) => {
  const row = getProject(req.params.id);
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  deleteProject(req.params.id);
  res.json({ ok: true });
});

app.get("/api/projects/:id/export.docx", async (req, res) => {
  const row = getProject(req.params.id);
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  flushDoc(req.params.id);
  const doc = loadDocForRead(req.params.id);
  if (!doc) {
    res.status(404).json({ error: "no document" });
    return;
  }
  const data = materialize(doc);
  const buffer = await exportDocx(data);
  const safeName = (data.projectName || "project").replace(/[^a-z0-9-_ ]/gi, "").trim() || "project";
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.docx"`);
  res.send(buffer);
});

// ---- AI Word-form parsing --------------------------------------------------
// Reports whether the AI backend is configured (drives the upload UI). When it
// is not, the endpoint still works in `demo` mode (canned sample data) so the
// upload flow can be shown without an API key.
app.get("/api/parse/status", (_req, res) => {
  const available = aiConfigured();
  res.json({ available, demo: !available });
});

// Accepts a .docx upload, extracts its text, asks the AI to extract a structured
// proposal, then deterministically coerces it onto the reference data. Returns a
// proposal for the client's validate/confirm step — it does NOT persist anything.
// See docs/SECURITY-RISK-ASSESSMENT.md for the controls behind this endpoint.
app.post("/api/projects/parse", (req, res) => {
  uploadDocx.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const isSize = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      res.status(isSize ? 413 : 400).json({
        error: isSize
          ? `File too large (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`
          : (err as Error).message || "Upload rejected",
      });
      return;
    }
    const file = (req as express.Request & { file?: { buffer: Buffer } }).file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded (field name must be 'file')" });
      return;
    }
    // Demo mode: no AI backend configured. Skip the model call entirely and
    // return canned sample data so the upload → validate → confirm flow can be
    // walked through visually. The uploaded file is accepted (and validated as a
    // .docx by the upload guard) but its contents are not read or sent anywhere.
    if (!aiConfigured()) {
      const proposal = coerce(demoExtraction(), 0, false);
      proposal.meta.demo = true;
      proposal.meta.model = "demo — sample data (no API key set)";
      // Small artificial delay so the "processing" state is visible in the demo.
      setTimeout(() => res.json(proposal), 700);
      return;
    }
    try {
      const { text } = await extractDocx(file.buffer);
      if (!text.trim()) {
        res.status(422).json({ error: "No readable text found in the document" });
        return;
      }
      const { extraction, sourceChars, truncated } = await aiExtract(text);
      const proposal = coerce(extraction, sourceChars, truncated);
      res.json(proposal);
    } catch (e) {
      console.error("parse failed", e);
      res.status(502).json({ error: "Failed to parse the document with the AI backend" });
    }
  });
});

// ---- Static SPA ------------------------------------------------------------

if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/collab")) return next();
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send("<h1>Form Live-Edit Demo</h1><p>Frontend build not found. Run the frontend build.</p>");
  });
}

// ---- HTTP + WebSocket ------------------------------------------------------

const server = http.createServer(app);
const wss = createCollabServer();

server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url || "", "http://localhost");
  if (pathname === "/collab") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Form Live-Edit Demo listening on http://0.0.0.0:${PORT}`);
  console.log(`Serving static from ${STATIC_DIR}`);
});
