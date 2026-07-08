import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { getIdentity, Identity } from "./identity";

export interface ProjectDocContextValue {
  doc: Y.Doc;
  provider: WebsocketProvider;
  map: Y.Map<unknown>;
  identity: Identity;
  synced: boolean;
}

const Ctx = createContext<ProjectDocContextValue | null>(null);

export function useProjectDoc(): ProjectDocContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProjectDoc must be used within ProjectDocProvider");
  return ctx;
}

export function ProjectDocProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const identity = useMemo(() => getIdentity(), []);
  const [synced, setSynced] = useState(false);

  const { doc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
    const base = `${wsProtocol}://${location.host}`;
    // Resolves to `/collab?project=<id>`; the server keys documents by `project`.
    const provider = new WebsocketProvider(base, "collab", doc, {
      params: { project: projectId },
    });
    provider.awareness.setLocalStateField("user", {
      name: identity.name,
      color: identity.color,
    });
    return { doc, provider };
  }, [projectId, identity]);

  useEffect(() => {
    const onSync = (isSynced: boolean) => setSynced(isSynced);
    provider.on("sync", onSync);
    return () => {
      provider.off("sync", onSync);
      provider.destroy();
      doc.destroy();
    };
  }, [provider, doc]);

  const value = useMemo<ProjectDocContextValue>(
    () => ({ doc, provider, map: doc.getMap("project"), identity, synced }),
    [doc, provider, identity, synced]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
