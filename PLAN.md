# Build Plan — Form Live-Edit Demo

A proof-of-concept multi-step form that composes into a professional, legally-numbered
report preview with a collaborative inline edit mode. This plan is derived from `spec.md`
and its Resolved Design Decisions.

## 1. Architecture

Single deployable service, single port, packaged as one Docker image.

```
┌─────────────────────────────────────────────────────────┐
│  Docker container (listens on $PORT, default 3000)        │
│                                                           │
│  Node.js server                                           │
│   ├─ Serves built React SPA (static files)                │
│   ├─ REST API  /api/projects       (CRUD + list)          │
│   ├─ REST API  /api/projects/:id/export.docx (Word)       │
│   └─ WebSocket /collab             (Yjs sync + awareness)  │
│                                                           │
│  SQLite (file volume)                                     │
│   ├─ projects     (id, name, department, timestamps)      │
│   └─ ydocs        (id, Yjs update blob — collab state)    │
└─────────────────────────────────────────────────────────┘
```

**Why one port:** the HTTP server and the WebSocket server share the same Node
`http.Server` (WS handled via the `upgrade` event), so the whole app is reachable on a
single configurable port — clean for Docker.

### Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React + Vite + TypeScript | SPA, built to static assets |
| Rich text | TipTap (ProseMirror) + `y-prosemirror` | Restricted toolbar; collaborative |
| Collaboration | Yjs + `y-websocket` + `y-protocols/awareness` | Real server-backed sync + presence |
| Backend | Node.js + TypeScript (Express or Fastify) | API + static + WS on one server |
| Persistence | SQLite (`better-sqlite3`) | Project list + persisted Yjs updates |
| Word export | `docx` library | Server-side generation |
| Packaging | Multi-stage Dockerfile | Build frontend, run Node |

## 2. Data model

Each project is **one Yjs document** so every field is collaboratively editable:

- **Structured fields** (project name, dropdowns, financial/FTE tables, recommendations)
  live in a `Y.Map`.
- **Rich-text fields** (Detailed Description, Costing Methodology, Election Commitment
  Details, Additional Information) are `Y.XmlFragment`s bound to TipTap.
- Images are base64 data URIs embedded in the rich-text content.

`y-websocket`'s persistence hook writes Yjs updates to the `ydocs` table. A denormalized
`projects` row (name + department) is updated on save so the landing page can list projects
without loading every document.

## 3. Hardcoded reference data

- Queensland government departments (reasonable current list)
- Queensland LGAs + a "Statewide" option
- Financial years (e.g. 2020–21 … 2034–35)

Stored in a shared module used by both dropdowns and validation.

## 4. Build phases

**Phase 0 — Scaffold & Docker skeleton**
- Monorepo (`/frontend`, `/server`, shared `/common`).
- Multi-stage Dockerfile + `docker-compose.yml` with configurable `PORT`.
- Health check endpoint; verify container boots and serves a placeholder.

**Phase 1 — Backend core**
- SQLite schema + migrations.
- REST: list / create / rename / delete projects.
- Yjs WebSocket server with SQLite persistence.
- `.docx` export endpoint (stub first).

**Phase 2 — Frontend shell**
- Routing; Projects landing page: list (name + department), New, Edit, **Delete**.
- New Project creates the record and routes to **Step 1**.
- Breadcrumb 6-step form navigation.

**Phase 3 — Form steps & field logic**
- All 6 steps with every field type and its constraints (max lengths, dropdowns).
- Financial & FTE tables: columns derived from Start/End year, **Total column**,
  drop out-of-range data on change.
- Recommendations table: add/remove rows, **up/down reorder**, auto row numbers.
- Conditional Election Commitment Details (drop data when set to No).
- Autosave + explicit Save + Ctrl/Cmd-S + step keyboard nav.

**Phase 4 — Rich text**
- TipTap with the restricted toolbar only: bold, italic, underline, strikethrough,
  H1–H6, numbered lists, bullet lists, tables, images (base64). No font/other controls.

**Phase 5 — Summary report presentation**
- Compose all fields into a single professional document.
- **Flat continuous legal paragraph numbering** (the top must-have): headings excluded,
  user lists sit outside the numbering. Implemented as a deterministic render pass over
  the composed block structure.
- Dollar formatting: millions, 3 decimals, negatives in parentheses **and red**, zero as
  "..". FTEs to 1 decimal.
- **Early preview**: openable while incomplete; unfilled sections rendered in red.

**Phase 6 — Inline collaborative edit mode (the centerpiece)**
- Toggle edit mode in the preview.
- Rich-text and free-text edit inline, writing back to the **source field** (preview
  re-derives its formatted view).
- Dropdowns render inline as click-to-open pickers.
- Complex tables (Recommendations, Financial, FTE) edited via **Edit button → modal**.
- Live collaboration: invented usernames, presence avatars, remote cursors/selections.

**Phase 7 — Word export**
- Faithful `.docx`: paragraph numbering, tables, images, and the dollar/FTE formatting.

**Phase 8 — Packaging & verification**
- Finalize Dockerfile, README run instructions, end-to-end smoke test (multi-tab collab,
  export, early preview).

## 5. Docker & configurable port

The entry port is controlled by the **`PORT`** environment variable (default `3000`). The
Node server binds to `process.env.PORT`.

**Dockerfile (shape):**
```dockerfile
# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build          # builds frontend + compiles server

# --- runtime stage ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

**Running with a custom port:**
```bash
# Build
docker build -t form-live-edit .

# Run on the default port 3000
docker run -p 3000:3000 form-live-edit

# Run on a custom port — the PORT env var drives what the app listens on
docker run -e PORT=8080 -p 8080:8080 form-live-edit
```

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    environment:
      PORT: ${PORT:-3000}     # override with `PORT=8080 docker compose up`
    ports:
      - "${PORT:-3000}:${PORT:-3000}"
    volumes:
      - ./data:/app/data      # SQLite persistence
```

Because HTTP, the API, and the collaboration WebSocket all share the one server, only this
single `PORT` needs to be exposed.

## 6. Out of scope (per spec)

- No authentication / user admin (usernames are invented client-side for the demo).
- No font or advanced formatting controls beyond the listed set.
