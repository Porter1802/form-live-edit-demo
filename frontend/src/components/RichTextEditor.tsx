import React, { useCallback, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { contentExtensions } from "../collab/richText";
import { useProjectDoc } from "../collab/ProjectDoc";

interface Props {
  field: string; // Y.XmlFragment key; HTML mirror stored at `${field}Html`.
  editable?: boolean;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rt-btn${active ? " active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const addImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [editor]
  );

  return (
    <div className="rt-toolbar">
      <ToolbarButton title="Bold (Ctrl/Cmd-B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton title="Italic (Ctrl/Cmd-I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton title="Underline (Ctrl/Cmd-U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </ToolbarButton>
      <span className="rt-sep" />
      <select
        className="rt-select"
        value={
          editor.isActive("heading", { level: 1 })
            ? "1"
            : editor.isActive("heading", { level: 2 })
            ? "2"
            : editor.isActive("heading", { level: 3 })
            ? "3"
            : editor.isActive("heading", { level: 4 })
            ? "4"
            : editor.isActive("heading", { level: 5 })
            ? "5"
            : editor.isActive("heading", { level: 6 })
            ? "6"
            : "p"
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") editor.chain().focus().setParagraph().run();
          else
            editor
              .chain()
              .focus()
              .toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 | 5 | 6 })
              .run();
        }}
      >
        <option value="p">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
        <option value="4">Heading 4</option>
        <option value="5">Heading 5</option>
        <option value="6">Heading 6</option>
      </select>
      <span className="rt-sep" />
      <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • ≡
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. ≡
      </ToolbarButton>
      <span className="rt-sep" />
      <ToolbarButton
        title="Insert table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        ▦
      </ToolbarButton>
      <ToolbarButton title="Insert image" onClick={() => fileRef.current?.click()}>
        🖼
      </ToolbarButton>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={addImage} />
    </div>
  );
}

export function RichTextEditor({ field, editable = true, placeholder }: Props) {
  const { doc, provider, identity } = useProjectDoc();

  const editor = useEditor(
    {
      editable,
      extensions: [
        ...contentExtensions(),
        Collaboration.configure({ document: doc, field }),
        CollaborationCursor.configure({
          provider,
          user: { name: identity.name, color: identity.color },
        }),
      ],
      onUpdate: ({ editor }) => {
        doc.getMap("project").set(`${field}Html`, editor.getHTML());
      },
    },
    [doc, provider, field]
  );

  // Keep the HTML mirror fresh even for remote edits.
  React.useEffect(() => {
    if (!editor) return;
    const handler = () => {
      doc.getMap("project").set(`${field}Html`, editor.getHTML());
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, doc, field]);

  React.useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className={`rich-text${editable ? "" : " readonly"}`}>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="rt-content" data-placeholder={placeholder} />
    </div>
  );
}
