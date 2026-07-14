import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { Editor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import { contentExtensions } from "./richText";
import { ProjectData } from "../../../common/src/index";

// [ProjectData HTML-mirror key, Y.XmlFragment key]
const RICH_FIELDS: [keyof ProjectData, string][] = [
  ["detailedDescriptionHtml", "detailedDescription"],
  ["electionCommitmentDetailsHtml", "electionCommitmentDetails"],
  ["costingMethodologyHtml", "costingMethodology"],
  ["additionalInfoHtml", "additionalInfo"],
];

// Writes an HTML string into the collaborative rich-text fragment via a headless
// TipTap editor (same schema as the live editor), and refreshes the HTML mirror
// the report/export read from.
function writeRichField(doc: Y.Doc, field: string, html: string): void {
  const editor = new Editor({
    extensions: [...contentExtensions(), Collaboration.configure({ document: doc, field })],
  });
  editor.commands.setContent(html && html.trim() ? html : "<p></p>", false);
  doc.getMap("project").set(`${field}Html`, editor.getHTML());
  editor.destroy();
}

// Applies a confirmed proposal into a project's collaborative document. Runs on
// the importing client: plain fields are Y.Map sets, rich text is written into
// the shared XML fragments. Yjs sync propagates everything to the server and any
// connected collaborators.
export async function applyProposalToProject(
  projectId: string,
  data: ProjectData
): Promise<void> {
  const doc = new Y.Doc();
  const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
  const provider = new WebsocketProvider(`${wsProtocol}://${location.host}`, "collab", doc, {
    params: { project: projectId },
  });

  try {
    await new Promise<void>((resolve) => {
      if (provider.synced) return resolve();
      const onSync = (s: boolean) => {
        if (s) {
          provider.off("sync", onSync);
          resolve();
        }
      };
      provider.on("sync", onSync);
    });

    const map = doc.getMap("project");
    map.set("projectName", data.projectName);
    map.set("department", data.department);
    map.set("processType", data.processType);
    map.set("budgetYear", data.budgetYear);
    map.set("shortDescription", data.shortDescription);
    map.set("recommendations", data.recommendations);
    map.set("electionCommitment", data.electionCommitment);
    map.set("finStartYear", data.finStartYear);
    map.set("finEndYear", data.finEndYear);
    map.set("financialTable", data.financialTable);
    map.set("fteStartYear", data.fteStartYear);
    map.set("fteEndYear", data.fteEndYear);
    map.set("fteTable", data.fteTable);
    map.set("locations", data.locations);

    for (const [htmlKey, fragKey] of RICH_FIELDS) {
      writeRichField(doc, fragKey, (data[htmlKey] as string) || "");
    }

    // Let the queued updates flush to the server before we tear the socket down.
    await new Promise((r) => setTimeout(r, 700));
  } finally {
    provider.destroy();
    doc.destroy();
  }
}
