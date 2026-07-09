import { useCallback, useEffect, useState } from "react";
import { useProjectDoc } from "./ProjectDoc";
import { Identity } from "./identity";
import {
  ProjectData,
  emptyProjectData,
  Recommendation,
  NumericTable,
} from "../../../common/src/index";

// Binds a single key of the shared Y.Map to React state. Reads stay live as
// remote collaborators change the value; writes go straight to the CRDT (which
// is what "autosave" means here — the server persists the doc).
export function useMapValue<T>(key: string, fallback: T): [T, (value: T) => void] {
  const { map } = useProjectDoc();
  const [value, setValue] = useState<T>(() => {
    const v = map.get(key);
    return v === undefined ? fallback : (v as T);
  });

  useEffect(() => {
    const update = () => {
      const v = map.get(key);
      setValue(v === undefined ? fallback : (v as T));
    };
    update();
    map.observe(update);
    return () => map.unobserve(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  const set = useCallback(
    (v: T) => {
      map.set(key, v as unknown);
    },
    [map, key]
  );

  return [value, set];
}

// Materialises the whole project into the shared ProjectData shape, live.
// All writes to the doc are top-level Y.Map sets, so a shallow observe suffices.
export function useProjectData(): ProjectData {
  const { map } = useProjectDoc();
  const [data, setData] = useState<ProjectData>(() => readData(map));
  useEffect(() => {
    const update = () => setData(readData(map));
    update();
    map.observe(update);
    return () => map.unobserve(update);
  }, [map]);
  return data;
}

function readData(map: import("yjs").Map<unknown>): ProjectData {
  const d = emptyProjectData();
  const s = (k: string) => (typeof map.get(k) === "string" ? (map.get(k) as string) : "");
  d.projectName = s("projectName");
  d.department = s("department");
  d.processType = s("processType");
  d.budgetYear = s("budgetYear");
  d.shortDescription = s("shortDescription");
  d.recommendations = Array.isArray(map.get("recommendations"))
    ? (map.get("recommendations") as Recommendation[])
    : [];
  d.detailedDescriptionHtml = s("detailedDescriptionHtml");
  d.electionCommitment = s("electionCommitment");
  d.electionCommitmentDetailsHtml = s("electionCommitmentDetailsHtml");
  d.finStartYear = s("finStartYear");
  d.finEndYear = s("finEndYear");
  d.financialTable = (map.get("financialTable") as NumericTable) || {};
  d.costingMethodologyHtml = s("costingMethodologyHtml");
  d.fteStartYear = s("fteStartYear");
  d.fteEndYear = s("fteEndYear");
  d.fteTable = (map.get("fteTable") as NumericTable) || {};
  d.locations = Array.isArray(map.get("locations")) ? (map.get("locations") as string[]) : [];
  d.additionalInfoHtml = s("additionalInfoHtml");
  return d;
}

export interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
  isSelf: boolean;
}

export function usePresence(): PresenceUser[] {
  const { provider, doc } = useProjectDoc();
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    const update = () => {
      const list: PresenceUser[] = [];
      awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: Identity }).user;
        if (user) {
          list.push({
            clientId,
            name: user.name,
            color: user.color,
            isSelf: clientId === doc.clientID,
          });
        }
      });
      setUsers(list);
    };
    update();
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [provider, doc]);

  return users;
}
