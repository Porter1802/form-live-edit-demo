import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { getYDocUpdate, storeYDocUpdate, getProject, updateProjectMeta } from "./db.js";
import { materialize } from "./materialize.js";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

class SharedDoc extends Y.Doc {
  name: string;
  conns: Map<WebSocket, Set<number>> = new Map();
  awareness: Awareness;
  private saveTimer: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.awareness = new Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on("update", this.onAwarenessUpdate);
    this.on("update", this.onDocUpdate);
  }

  private onAwarenessUpdate = (
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    conn: WebSocket | null
  ) => {
    const changed = added.concat(updated, removed);
    if (conn !== null) {
      const controlled = this.conns.get(conn);
      if (controlled) {
        added.forEach((id) => controlled.add(id));
        removed.forEach((id) => controlled.delete(id));
      }
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      encodeAwarenessUpdate(this.awareness, changed)
    );
    const buf = encoding.toUint8Array(encoder);
    this.conns.forEach((_, c) => send(c, buf));
  };

  private onDocUpdate = (update: Uint8Array, _origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const buf = encoding.toUint8Array(encoder);
    this.conns.forEach((_, c) => send(c, buf));
    this.scheduleSave();
  };

  private scheduleSave() {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persist();
    }, 800);
  }

  persist() {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const update = Y.encodeStateAsUpdate(this);
      storeYDocUpdate(this.name, update);
      // Denormalise name + department for the landing page.
      const data = materialize(this);
      if (getProject(this.name)) {
        updateProjectMeta(this.name, data.projectName, data.department);
      }
    } catch (err) {
      console.error("Failed to persist doc", this.name, err);
    }
  }
}

const docs = new Map<string, SharedDoc>();

function getDoc(name: string): SharedDoc {
  let doc = docs.get(name);
  if (!doc) {
    doc = new SharedDoc(name);
    const stored = getYDocUpdate(name);
    if (stored) {
      Y.applyUpdate(doc, stored);
    }
    docs.set(name, doc);
  }
  return doc;
}

function send(conn: WebSocket, message: Uint8Array) {
  if (conn.readyState !== WebSocket.OPEN) return;
  try {
    conn.send(message);
  } catch {
    conn.close();
  }
}

function onMessage(conn: WebSocket, doc: SharedDoc, message: Uint8Array) {
  const decoder = decoding.createDecoder(message);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);
  switch (messageType) {
    case MESSAGE_SYNC: {
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
      if (encoding.length(encoder) > 1) {
        send(conn, encoding.toUint8Array(encoder));
      }
      break;
    }
    case MESSAGE_AWARENESS: {
      applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        conn
      );
      break;
    }
  }
}

function setupConnection(conn: WebSocket, docName: string) {
  conn.binaryType = "arraybuffer";
  const doc = getDoc(docName);
  doc.conns.set(conn, new Set());

  conn.on("message", (message: ArrayBuffer) => {
    onMessage(conn, doc, new Uint8Array(message));
  });

  // Ping/keep-alive.
  let alive = true;
  conn.on("pong", () => {
    alive = true;
  });
  const pingInterval = setInterval(() => {
    if (!alive) {
      closeConn();
      return;
    }
    alive = false;
    try {
      conn.ping();
    } catch {
      closeConn();
    }
  }, 30000);

  const closeConn = () => {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    if (controlledIds) {
      removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);
    }
    clearInterval(pingInterval);
    try {
      conn.close();
    } catch {
      /* ignore */
    }
    if (doc.conns.size === 0) {
      doc.persist();
    }
  };

  conn.on("close", closeConn);

  // 1. Send SyncStep1.
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(conn, encoding.toUint8Array(encoder));
  }
  // 2. Send current awareness state.
  {
    const states = doc.awareness.getStates();
    if (states.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(doc.awareness, Array.from(states.keys()))
      );
      send(conn, encoding.toUint8Array(encoder));
    }
  }
}

// Attaches a WebSocket server to handle `/collab?project=<id>` upgrades.
export function createCollabServer(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", (conn: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url || "", "http://localhost");
    const docName = url.searchParams.get("project") || "default";
    setupConnection(conn, docName);
  });
  return wss;
}

// Flush a specific doc to disk on demand (used by the export endpoint).
export function flushDoc(name: string): void {
  const doc = docs.get(name);
  if (doc) doc.persist();
}

// Loads a doc (from memory or storage) for read-only materialisation.
export function loadDocForRead(name: string): Y.Doc | null {
  const inMemory = docs.get(name);
  if (inMemory) return inMemory;
  const stored = getYDocUpdate(name);
  if (!stored) return null;
  const doc = new Y.Doc();
  Y.applyUpdate(doc, stored);
  return doc;
}
