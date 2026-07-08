import type { ProjectSummary } from "../../common/src/index";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  async listProjects(): Promise<ProjectSummary[]> {
    return json(await fetch("/api/projects"));
  },
  async createProject(name: string): Promise<{ id: string; name: string }> {
    return json(
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    );
  },
  async deleteProject(id: string): Promise<void> {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  },
  exportUrl(id: string): string {
    return `/api/projects/${id}/export.docx`;
  },
};
