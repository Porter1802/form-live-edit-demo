import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ProjectDocProvider, useProjectDoc } from "../collab/ProjectDoc";
import { useMapValue } from "../collab/useField";
import { PresenceBar } from "../components/PresenceBar";
import { Preview } from "../components/Preview";
import { STEPS } from "../steps";
import { api } from "../api";

function SaveStatus({ pulse }: { pulse: number }) {
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

function EditorInner({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const params = useParams();
  const stepIndex = Math.min(Math.max(Number(params.step || "1") - 1, 0), STEPS.length - 1);
  const [projectName] = useMapValue<string>("projectName", "");
  const [savePulse, setSavePulse] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [editing, setEditing] = useState(false);

  const goStep = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(i, 0), STEPS.length - 1);
      navigate(`/project/${projectId}/${clamped + 1}`);
    },
    [navigate, projectId]
  );

  const save = useCallback(() => setSavePulse((p) => p + 1), []);

  // Ctrl/Cmd-S to save; Alt+Arrows to move between steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goStep(stepIndex + 1);
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goStep(stepIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, goStep, stepIndex]);

  const StepComponent = STEPS[stepIndex].component;

  return (
    <div className="editor">
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
          <button className="btn" onClick={save}>
            Save
          </button>
          <a className="btn" href={api.exportUrl(projectId)}>
            ⬇ Export Word
          </a>
        </div>
      </header>

      <nav className="breadcrumbs">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            className={`crumb${i === stepIndex ? " active" : ""}`}
            onClick={() => goStep(i)}
          >
            <span className="crumb-num">{i + 1}</span>
            {s.title}
          </button>
        ))}
      </nav>

      <main className="editor-main">
        <h2 className="step-title">{STEPS[stepIndex].title}</h2>
        <StepComponent />

        <div className="step-nav">
          <button className="btn" disabled={stepIndex === 0} onClick={() => goStep(stepIndex - 1)}>
            ← Previous
          </button>
          <span className="muted">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <button
            className="btn primary"
            disabled={stepIndex === STEPS.length - 1}
            onClick={() => goStep(stepIndex + 1)}
          >
            Next →
          </button>
        </div>
      </main>

      <section className={`summary-panel${showSummary ? " open" : ""}`}>
        <div className="summary-toggle">
          <button className="btn primary large" onClick={() => setShowSummary((s) => !s)}>
            {showSummary ? "▼ Hide Summary Report" : "▲ Show Summary Report"}
          </button>
          {showSummary && (
            <button
              className={`btn ${editing ? "danger" : "accent"}`}
              onClick={() => setEditing((e) => !e)}
            >
              {editing ? "✓ Done editing" : "✎ Edit mode"}
            </button>
          )}
        </div>
        {showSummary && (
          <div className="summary-body">
            <Preview editing={editing} />
          </div>
        )}
      </section>
    </div>
  );
}

export function ProjectEditor() {
  const { id } = useParams();
  if (!id) return <p>Missing project id.</p>;
  return (
    <ProjectDocProvider projectId={id}>
      <EditorInner projectId={id} />
    </ProjectDocProvider>
  );
}
