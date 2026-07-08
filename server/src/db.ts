import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "app.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    department  TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ydocs (
    id      TEXT PRIMARY KEY,
    update_blob BLOB,
    FOREIGN KEY (id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

export interface ProjectRow {
  id: string;
  name: string;
  department: string;
  created_at: string;
  updated_at: string;
}

const stmts = {
  listProjects: db.prepare(
    "SELECT id, name, department, created_at, updated_at FROM projects ORDER BY updated_at DESC"
  ),
  getProject: db.prepare(
    "SELECT id, name, department, created_at, updated_at FROM projects WHERE id = ?"
  ),
  insertProject: db.prepare(
    "INSERT INTO projects (id, name, department, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ),
  updateProjectMeta: db.prepare(
    "UPDATE projects SET name = ?, department = ?, updated_at = ? WHERE id = ?"
  ),
  renameProject: db.prepare(
    "UPDATE projects SET name = ?, updated_at = ? WHERE id = ?"
  ),
  deleteProject: db.prepare("DELETE FROM projects WHERE id = ?"),
  getYDoc: db.prepare("SELECT update_blob FROM ydocs WHERE id = ?"),
  upsertYDoc: db.prepare(
    `INSERT INTO ydocs (id, update_blob) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET update_blob = excluded.update_blob`
  ),
};

export function listProjects(): ProjectRow[] {
  return stmts.listProjects.all() as ProjectRow[];
}

export function getProject(id: string): ProjectRow | undefined {
  return stmts.getProject.get(id) as ProjectRow | undefined;
}

export function createProject(id: string, name: string): ProjectRow {
  const now = new Date().toISOString();
  stmts.insertProject.run(id, name, "", now, now);
  return getProject(id)!;
}

export function updateProjectMeta(id: string, name: string, department: string): void {
  const now = new Date().toISOString();
  stmts.updateProjectMeta.run(name, department, now, id);
}

export function renameProject(id: string, name: string): void {
  const now = new Date().toISOString();
  stmts.renameProject.run(name, now, id);
}

export function deleteProject(id: string): void {
  stmts.deleteProject.run(id);
}

export function getYDocUpdate(id: string): Uint8Array | null {
  const row = stmts.getYDoc.get(id) as { update_blob: Buffer } | undefined;
  return row?.update_blob ? new Uint8Array(row.update_blob) : null;
}

export function storeYDocUpdate(id: string, update: Uint8Array): void {
  stmts.upsertYDoc.run(id, Buffer.from(update));
}

export default db;
