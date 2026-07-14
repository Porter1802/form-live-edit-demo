import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ProjectSummary } from "../../../common/src/index";

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await api.listProjects());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const newProject = async () => {
    setCreating(true);
    try {
      const { id } = await api.createProject("Untitled project");
      navigate(`/project/${id}/1`);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name || "Untitled project"}"? This cannot be undone.`)) return;
    await api.deleteProject(id);
    load();
  };

  return (
    <div className="landing">
      <header className="landing-header">
        <div>
          <h1>Project Reports</h1>
          <p className="muted">Multi-step capture with a live, collaboratively-editable report preview.</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => navigate("/import")}>
            ⬆ Upload Word form
          </button>
          <button className="btn primary" onClick={newProject} disabled={creating}>
            {creating ? "Creating…" : "+ New Project"}
          </button>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="empty">
          <p>No projects yet.</p>
          <button className="btn primary" onClick={newProject}>+ Create your first project</button>
        </div>
      ) : (
        <table className="project-table">
          <thead>
            <tr>
              <th>Project name</th>
              <th>Department</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name || <span className="muted">Untitled project</span>}</td>
                <td>{p.department || <span className="muted">—</span>}</td>
                <td className="actions-col">
                  <button className="btn" onClick={() => navigate(`/project/${p.id}/1`)}>
                    Edit
                  </button>
                  <button className="btn danger" onClick={() => remove(p.id, p.name)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
