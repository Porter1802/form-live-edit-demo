import type { ProjectSummary, ParseProposal } from "../../common/src/index";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    /* ignore */
  }
  return `Request failed: ${res.status}`;
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
  async parseStatus(): Promise<{ available: boolean }> {
    try {
      return await json(await fetch("/api/parse/status"));
    } catch {
      return { available: false };
    }
  },
  async parseWord(file: File): Promise<ParseProposal> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/projects/parse", { method: "POST", body: form });
    if (!res.ok) throw new Error(await errorMessage(res));
    return res.json() as Promise<ParseProposal>;
  },
};
