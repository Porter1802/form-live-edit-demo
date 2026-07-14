import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { applyProposalToProject } from "../collab/applyProposal";
import {
  ProjectData,
  ParseProposal,
  FieldReport,
  FieldStatus,
  Recommendation,
  NumericTable,
  DEPARTMENTS,
  PROCESS_TYPES,
  FINANCIAL_YEARS,
  LOCATIONS,
  FINANCIAL_ROWS,
  FTE_ROWS,
  RECOMMENDATION_TYPES,
  YES_NO,
  MAX_PROJECT_NAME,
  MAX_SHORT_DESCRIPTION,
} from "../../../common/src/index";

type Phase = "checking" | "unavailable" | "upload" | "processing" | "validate" | "applying" | "error";

const STATUS_LABEL: Record<FieldStatus, string> = {
  matched: "Matched",
  low: "Check",
  unmatched: "Not mapped",
  empty: "Empty",
  ok: "Captured",
};

function StatusBadge({ status }: { status: FieldStatus }) {
  return <span className={`import-badge status-${status}`}>{STATUS_LABEL[status]}</span>;
}

function Preview({ html }: { html: string }) {
  if (!html || !html.trim()) return <p className="muted small">— nothing extracted —</p>;
  // Server-sanitised HTML (allow-list only). See server/src/parse/sanitize.ts.
  return <div className="import-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function TablePreview({ table, rows }: { table: NumericTable; rows: string[] }) {
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const r of Object.keys(table)) for (const y of Object.keys(table[r] || {})) set.add(y);
    return FINANCIAL_YEARS.filter((y) => set.has(y));
  }, [table]);
  if (years.length === 0) return <p className="muted small">— no values extracted —</p>;
  return (
    <div className="import-table-wrap">
      <table className="import-table">
        <thead>
          <tr>
            <th>Row</th>
            {years.map((y) => (
              <th key={y}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td>{r}</td>
              {years.map((y) => (
                <td key={y} className="num">
                  {table[r]?.[y] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImportPage() {
  const { id: existingId } = useParams();
  const navigate = useNavigate();
  const isExisting = Boolean(existingId);

  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<ParseProposal | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.parseStatus().then((s) => setPhase(s.available ? "upload" : "unavailable"));
  }, []);

  const reportByKey = useMemo(() => {
    const m = new Map<string, FieldReport>();
    proposal?.fields.forEach((f) => m.set(f.key, f));
    return m;
  }, [proposal]);

  const badge = (key: string) => {
    const r = reportByKey.get(key);
    return r ? <StatusBadge status={r.status} /> : null;
  };
  const note = (key: string) => {
    const n = reportByKey.get(key)?.note;
    return n ? <span className="import-note">{n}</span> : null;
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase("processing");
    setError("");
    try {
      const p = await api.parseWord(file);
      setProposal(p);
      setData(p.data);
      setPhase("validate");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  };

  const confirm = async () => {
    if (!data) return;
    setPhase("applying");
    setError("");
    try {
      let projectId = existingId;
      if (!projectId) {
        const created = await api.createProject(data.projectName || "Untitled project");
        projectId = created.id;
      }
      await applyProposalToProject(projectId, data);
      navigate(`/project/${projectId}/1`);
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  };

  const cancel = () => navigate(isExisting ? `/project/${existingId}/1` : "/");

  const set = <K extends keyof ProjectData>(key: K, value: ProjectData[K]) =>
    setData((d) => (d ? { ...d, [key]: value } : d));

  return (
    <div className="import-page">
      <header className="landing-header">
        <div>
          <h1>Import from Word</h1>
          <p className="muted">
            Upload a Word form; the content is parsed by AI, then you validate and confirm before
            anything is saved.
          </p>
        </div>
        <Link className="btn" to={isExisting ? `/project/${existingId}/1` : "/"}>
          ← Back
        </Link>
      </header>

      {phase === "checking" && <p className="muted">Checking availability…</p>}

      {phase === "unavailable" && (
        <div className="import-panel">
          <p>
            The AI parsing backend isn't configured on the server. Set{" "}
            <code>ANTHROPIC_API_KEY</code> (and optionally <code>ANTHROPIC_BASE_URL</code> /{" "}
            <code>AI_MODEL</code>) and restart. See{" "}
            <code>docs/SECURITY-RISK-ASSESSMENT.md</code> before using real data.
          </p>
        </div>
      )}

      {phase === "upload" && (
        <div className="import-panel">
          {isExisting && (
            <p className="import-warn">
              ⚠ Confirming will <strong>overwrite the fields</strong> in this project with the
              imported values.
            </p>
          )}
          <p className="import-warn subtle">
            🔒 Document contents are sent to the configured AI endpoint. Do not upload
            Cabinet-in-Confidence or classified material to an unapproved endpoint — see{" "}
            <code>docs/SECURITY-RISK-ASSESSMENT.md</code>.
          </p>
          <input ref={fileRef} type="file" accept=".docx" hidden onChange={onFile} />
          <button className="btn primary large" onClick={() => fileRef.current?.click()}>
            Choose a .docx file…
          </button>
        </div>
      )}

      {phase === "processing" && (
        <div className="import-panel center">
          <div className="spinner" />
          <p className="muted">Parsing the document with AI…</p>
        </div>
      )}

      {phase === "applying" && (
        <div className="import-panel center">
          <div className="spinner" />
          <p className="muted">Applying to the project…</p>
        </div>
      )}

      {phase === "error" && (
        <div className="import-panel">
          <p className="import-error">Couldn't parse the document: {error}</p>
          <button className="btn" onClick={() => setPhase("upload")}>
            Try another file
          </button>
        </div>
      )}

      {phase === "validate" && data && proposal && (
        <div className="import-validate">
          <div className="import-legend">
            <span className="muted">
              Model: <code>{proposal.meta.model}</code>
              {proposal.meta.truncated && " · document was truncated for length"}
            </span>
            <span className="import-legend-badges">
              <StatusBadge status="matched" />
              <StatusBadge status="low" />
              <StatusBadge status="unmatched" />
              <StatusBadge status="empty" />
            </span>
          </div>
          <p className="muted small">
            Editable fields (names, dropdowns, recommendations, locations) can be corrected here.
            Rich-text bodies and tables are shown as a preview and can be fine-tuned in the editor
            after import.
          </p>

          {/* Step 1 */}
          <fieldset className="import-group">
            <legend>Basic Details</legend>
            <Row label="Project Name" badge={badge("projectName")} note={note("projectName")}>
              <input
                type="text"
                value={data.projectName}
                maxLength={MAX_PROJECT_NAME}
                onChange={(e) => set("projectName", e.target.value)}
              />
            </Row>
            <Row label="Department" badge={badge("department")} note={note("department")}>
              <Select value={data.department} options={DEPARTMENTS} onChange={(v) => set("department", v)} />
            </Row>
            <Row label="Process Type" badge={badge("processType")} note={note("processType")}>
              <Select value={data.processType} options={PROCESS_TYPES} onChange={(v) => set("processType", v)} />
            </Row>
            <Row label="Budget Year" badge={badge("budgetYear")} note={note("budgetYear")}>
              <Select value={data.budgetYear} options={FINANCIAL_YEARS} onChange={(v) => set("budgetYear", v)} />
            </Row>
          </fieldset>

          {/* Step 2 */}
          <fieldset className="import-group">
            <legend>Core Details</legend>
            <Row label="Short Description" badge={badge("shortDescription")} note={note("shortDescription")}>
              <textarea
                value={data.shortDescription}
                maxLength={MAX_SHORT_DESCRIPTION}
                rows={2}
                onChange={(e) => set("shortDescription", e.target.value)}
              />
            </Row>
            <Row label="Recommendations" badge={badge("recommendations")} note={note("recommendations")}>
              <RecommendationsEditor
                value={data.recommendations}
                onChange={(v) => set("recommendations", v)}
              />
            </Row>
            <Row label="Detailed Description" badge={badge("detailedDescriptionHtml")}>
              <Preview html={data.detailedDescriptionHtml} />
            </Row>
            <Row label="Election Commitment" badge={badge("electionCommitment")}>
              <Select value={data.electionCommitment} options={YES_NO} onChange={(v) => set("electionCommitment", v)} />
            </Row>
            {data.electionCommitment === "Yes" && (
              <Row label="Election Commitment Details" badge={badge("electionCommitmentDetailsHtml")}>
                <Preview html={data.electionCommitmentDetailsHtml} />
              </Row>
            )}
          </fieldset>

          {/* Step 3 */}
          <fieldset className="import-group">
            <legend>Financials</legend>
            <Row label="Start Year" badge={badge("finStartYear")}>
              <Select value={data.finStartYear} options={FINANCIAL_YEARS} onChange={(v) => set("finStartYear", v)} />
            </Row>
            <Row label="End Year" badge={badge("finEndYear")}>
              <Select value={data.finEndYear} options={FINANCIAL_YEARS} onChange={(v) => set("finEndYear", v)} />
            </Row>
            <Row label="Financial Table" badge={badge("financialTable")} note={note("financialTable")}>
              <TablePreview table={data.financialTable} rows={FINANCIAL_ROWS} />
            </Row>
            <Row label="Costing Methodology" badge={badge("costingMethodologyHtml")}>
              <Preview html={data.costingMethodologyHtml} />
            </Row>
          </fieldset>

          {/* Step 4 */}
          <fieldset className="import-group">
            <legend>FTEs</legend>
            <Row label="Start Year" badge={badge("fteStartYear")}>
              <Select value={data.fteStartYear} options={FINANCIAL_YEARS} onChange={(v) => set("fteStartYear", v)} />
            </Row>
            <Row label="End Year" badge={badge("fteEndYear")}>
              <Select value={data.fteEndYear} options={FINANCIAL_YEARS} onChange={(v) => set("fteEndYear", v)} />
            </Row>
            <Row label="FTE Table" badge={badge("fteTable")} note={note("fteTable")}>
              <TablePreview table={data.fteTable} rows={FTE_ROWS} />
            </Row>
          </fieldset>

          {/* Step 5 */}
          <fieldset className="import-group">
            <legend>Location</legend>
            <Row label="Project Location" badge={badge("locations")} note={note("locations")}>
              <LocationsEditor value={data.locations} onChange={(v) => set("locations", v)} />
            </Row>
          </fieldset>

          {/* Step 6 */}
          <fieldset className="import-group">
            <legend>Extra Details</legend>
            <Row label="Additional Information" badge={badge("additionalInfoHtml")}>
              <Preview html={data.additionalInfoHtml} />
            </Row>
          </fieldset>

          <div className="import-actions">
            <button className="btn" onClick={cancel}>
              Cancel
            </button>
            <button className="btn primary" onClick={confirm}>
              {isExisting ? "Confirm & overwrite project" : "Confirm & create project"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  badge,
  note,
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="import-row">
      <div className="import-row-head">
        <span className="import-row-label">{label}</span>
        {badge}
      </div>
      <div className="import-row-body">{children}</div>
      {note}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function RecommendationsEditor({
  value,
  onChange,
}: {
  value: Recommendation[];
  onChange: (v: Recommendation[]) => void;
}) {
  const update = (i: number, patch: Partial<Recommendation>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...value, { id: crypto.randomUUID(), type: RECOMMENDATION_TYPES[0], text: "" }]);
  return (
    <div className="import-recs">
      {value.map((r, i) => (
        <div key={r.id} className="import-rec">
          <span className="import-rec-num">{i + 1}</span>
          <select value={r.type} onChange={(e) => update(i, { type: e.target.value })}>
            {RECOMMENDATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={r.text}
            onChange={(e) => update(i, { text: e.target.value })}
            placeholder="Recommendation text"
          />
          <button className="btn small danger" onClick={() => remove(i)} title="Remove">
            ✕
          </button>
        </div>
      ))}
      <button className="btn small" onClick={add}>
        + Add recommendation
      </button>
    </div>
  );
}

function LocationsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="multiselect">
      {LOCATIONS.map((o) => (
        <label key={o} className={`chip${value.includes(o) ? " selected" : ""}`}>
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}
