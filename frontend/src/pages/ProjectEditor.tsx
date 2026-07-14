import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProjectDocProvider } from "../collab/ProjectDoc";
import { EditorHeader, Breadcrumbs } from "../components/EditorChrome";
import { STEPS } from "../steps";

function EditorInner({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const params = useParams();
  const stepIndex = Math.min(Math.max(Number(params.step || "1") - 1, 0), STEPS.length - 1);
  const [savePulse, setSavePulse] = useState(0);

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
      <EditorHeader projectId={projectId} onSave={save} savePulse={savePulse} />
      <Breadcrumbs projectId={projectId} active={stepIndex} />

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
