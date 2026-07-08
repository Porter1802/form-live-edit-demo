# Form Live-Edit Demo

A proof-of-concept multi-step form that composes into a professional,
legally-numbered report preview with a **collaborative inline edit mode**.
Built and run as a single Docker image on one configurable port.

See [`spec.md`](./spec.md) for requirements and [`PLAN.md`](./PLAN.md) for the
build plan this implements.

## Features

- **6-step breadcrumb form** — Basic Details, Core Details, Financials, FTEs,
  Location, Extra Details — with every field type and constraint from the spec
  (max lengths, dropdowns, conditional Election Commitment, reorderable
  Recommendations, year-range-driven Financial/FTE tables with Totals).
- **Autosave + explicit Save + Ctrl/Cmd-S**, and `Alt+←/→` to move between steps.
- **Live report preview** — all fields composed into one professional document
  with **flat, continuous legal paragraph numbering** (headings excluded, user
  lists sit outside the numbering). Dollars shown in `$` millions with 3
  decimals (negatives red & in parentheses, zero as `..`); FTEs to 1 decimal.
  Incomplete fields are flagged in **red** so the preview is useful early.
- **Inline collaborative edit mode** (the centerpiece) — toggle edit mode in the
  preview and fix typos or change dropdowns in place. Edits write back to the
  underlying source field and the preview re-derives its formatted view. Complex
  tables (Recommendations, Financial, FTE) open in a pop-up editor.
- **Real-time collaboration** — server-backed Yjs sync, invented usernames,
  presence avatars and remote cursors/selections. Open the same project in two
  tabs to see it.
- **Word export** — faithful `.docx` with the numbering, tables, images and the
  same dollar/FTE formatting.

## Architecture

A single Node service serves everything on one port: the built React SPA, the
REST API (`/api/projects…`), and the collaboration WebSocket (`/collab`), which
shares the same `http.Server`. State lives in SQLite (`better-sqlite3`): a
denormalised `projects` list plus persisted Yjs document updates.

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite + TypeScript, TipTap (ProseMirror) rich text |
| Collaboration | Yjs + `y-websocket` + `y-protocols/awareness` |
| Backend | Node + TypeScript, Express, `ws` |
| Persistence | SQLite (`better-sqlite3`) |
| Word export | `docx` |
| Packaging | Multi-stage Dockerfile |

The shared `common/` module holds the data model, reference data, dollar/FTE
formatting and the deterministic report composition + numbering pass, so the
live preview and the Word export can never disagree.

## Run with Docker

```bash
# Build
docker build -t form-live-edit .

# Run on the default port 3000
docker run -p 3000:3000 -v "$PWD/data:/app/data" form-live-edit

# Run on a custom port — the PORT env var drives what the app listens on
docker run -e PORT=8080 -p 8080:8080 -v "$PWD/data:/app/data" form-live-edit
```

Or with Compose (override the port with `PORT=8080 docker compose up`):

```bash
docker compose up --build
```

Then open <http://localhost:3000> (or your chosen port). SQLite data persists in
the mounted `./data` volume.

## Local development

```bash
npm install
# terminal 1 — API + collab server on :3000
npm run dev:server
# terminal 2 — Vite dev server on :5173 (proxies /api and /collab to :3000)
npm run dev:frontend
```

Or build and run exactly like production:

```bash
npm run build     # builds the SPA into server/public and bundles the server
npm start         # node server/dist/index.cjs
```

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `PORT` | `3000` | Port the server listens on (HTTP + API + WebSocket). |
| `DATA_DIR` | `./data` | Directory for the SQLite database file. |
| `STATIC_DIR` | `<bundle>/../public` | Built SPA directory to serve. |
