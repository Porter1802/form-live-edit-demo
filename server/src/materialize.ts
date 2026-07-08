import * as Y from "yjs";
import {
  ProjectData,
  emptyProjectData,
  Recommendation,
  NumericTable,
} from "../../common/src/index";

const MAP_NAME = "project";

function str(map: Y.Map<unknown>, key: string): string {
  const v = map.get(key);
  return typeof v === "string" ? v : "";
}

function arr<T>(map: Y.Map<unknown>, key: string): T[] {
  const v = map.get(key);
  return Array.isArray(v) ? (v as T[]) : [];
}

function table(map: Y.Map<unknown>, key: string): NumericTable {
  const v = map.get(key);
  return v && typeof v === "object" ? (v as NumericTable) : {};
}

// Reads the collaborative document into the plain ProjectData shape used by the
// report composition and the Word export. Rich-text fields are read from their
// HTML mirror (kept in sync by the client), so the server never needs a
// ProseMirror schema.
export function materialize(doc: Y.Doc): ProjectData {
  const map = doc.getMap(MAP_NAME) as Y.Map<unknown>;
  const data = emptyProjectData();

  data.projectName = str(map, "projectName");
  data.department = str(map, "department");
  data.processType = str(map, "processType");
  data.budgetYear = str(map, "budgetYear");

  data.shortDescription = str(map, "shortDescription");
  data.recommendations = arr<Recommendation>(map, "recommendations");
  data.detailedDescriptionHtml = str(map, "detailedDescriptionHtml");
  data.electionCommitment = str(map, "electionCommitment");
  data.electionCommitmentDetailsHtml = str(map, "electionCommitmentDetailsHtml");

  data.finStartYear = str(map, "finStartYear");
  data.finEndYear = str(map, "finEndYear");
  data.financialTable = table(map, "financialTable");
  data.costingMethodologyHtml = str(map, "costingMethodologyHtml");

  data.fteStartYear = str(map, "fteStartYear");
  data.fteEndYear = str(map, "fteEndYear");
  data.fteTable = table(map, "fteTable");

  data.locations = arr<string>(map, "locations");

  data.additionalInfoHtml = str(map, "additionalInfoHtml");

  return data;
}
