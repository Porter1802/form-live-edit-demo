import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
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
import { ProjectSummary } from "../../common/src/index";

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
