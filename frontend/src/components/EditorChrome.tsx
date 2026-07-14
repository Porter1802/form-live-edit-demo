import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjectDoc } from "../collab/ProjectDoc";
import { useMapValue } from "../collab/useField";
import { PresenceBar } from "./PresenceBar";
import { STEPS } from "../steps";
import { api } from "../api";

export function SaveStatus({ pulse }: { pulse: number }) {
  const { synced } = useProjectDoc();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [pulse]);
  return (
    <span className="save-status muted">
      {saved ? "✓ Saved" : synced ? "Autosaving · synced" : "Connecting…"}
    </span>
  );
}

export function EditorHeader({
  projectId,
  onSave,
  savePulse,
}: {
  projectId: string;
  onSave: () => void;
  savePulse: number;
}) {
  const navigate = useNavigate();
  const [projectName] = useMapValue<string>("projectName", "");
  return (
    <header className="editor-header">
      <div className="editor-title">
        <Link to="/" className="back-link">
          ← Projects
        </Link>
        <h1>{projectName || "Untitled project"}</h1>
      </div>
      <div className="editor-actions">
        <PresenceBar />
        <SaveStatus pulse={savePulse} />
        <button className="btn" onClick={onSave}>
          Save
        </button>
        <button className="btn" onClick={() => navigate(`/project/${projectId}/import`)}>
          ⬆ Import from Word
        </button>
        <a className="btn" href={api.exportUrl(projectId)}>
          ⬇ Export Word
        </a>
      </div>
    </header>
  );
}

// The step breadcrumbs plus a trailing Preview crumb that opens the report page.
// `active` is the zero-based step index, or "preview" on the report page.
export function Breadcrumbs({
  projectId,
  active,
}: {
  projectId: string;
  active: number | "preview";
}) {
  const navigate = useNavigate();
  return (
    <nav className="breadcrumbs">
      {STEPS.map((s, i) => (
        <button
          key={s.title}
          className={`crumb${active === i ? " active" : ""}`}
          onClick={() => navigate(`/project/${projectId}/${i + 1}`)}
        >
          <span className="crumb-num">{i + 1}</span>
          {s.title}
        </button>
      ))}
      <button
        className={`crumb crumb-preview${active === "preview" ? " active" : ""}`}
        onClick={() => navigate(`/project/${projectId}/preview`)}
      >
        <span className="crumb-num" aria-hidden>
          ▤
        </span>
        Preview
      </button>
    </nav>
  );
}
