import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { Extensions } from "@tiptap/react";

// The node/mark schema shared by the live editor and the import "apply" step.
// Both must use exactly the same set so rich text written during import renders
// identically in the collaborative editor. Collaboration/CollaborationCursor are
// added on top by each caller.
export function contentExtensions(): Extensions {
  return [
    StarterKit.configure({ history: false, heading: { levels: [1, 2, 3, 4, 5, 6] } }),
    Underline,
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}
