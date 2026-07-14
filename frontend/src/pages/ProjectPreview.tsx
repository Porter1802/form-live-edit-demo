import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectDocProvider } from "../collab/ProjectDoc";
import { EditorHeader, Breadcrumbs } from "../components/EditorChrome";
import { Preview } from "../components/Preview";

function PreviewInner({ projectId }: { projectId: string }) {
  const [savePulse, setSavePulse] = useState(0);
  const [editing, setEditing] = useState(false);

  const save = useCallback(() => setSavePulse((p) => p + 1), []);

  // Ctrl/Cmd-S to save, matching the step editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  return (
    <div className="editor">
      <EditorHeader projectId={projectId} onSave={save} savePulse={savePulse} />
      <Breadcrumbs projectId={projectId} active="preview" />

      <main className="editor-main preview-page">
        <div className="preview-page-head">
          <h2 className="step-title">Summary Report</h2>
          <button
            className={`btn ${editing ? "danger" : "accent"}`}
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "✓ Done editing" : "✎ Edit mode"}
          </button>
        </div>
        <div className="preview-body">
          <Preview editing={editing} />
        </div>
      </main>
    </div>
  );
}

export function ProjectPreview() {
  const { id } = useParams();
  if (!id) return <p>Missing project id.</p>;
  return (
    <ProjectDocProvider projectId={id}>
      <PreviewInner projectId={id} />
    </ProjectDocProvider>
  );
}
