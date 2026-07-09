import React, { useState } from "react";
import {
  composeReport,
  ReportBlock,
  ReportInline,
  ReportCell,
  ProjectData,
  DEPARTMENTS,
  PROCESS_TYPES,
  FINANCIAL_YEARS,
  YES_NO,
  LOCATIONS,
  FINANCIAL_ROWS,
  FTE_ROWS,
  formatDollars,
  formatFte,
  yearsInRange,
} from "../../../common/src/index";
import { useProjectData, useMapValue } from "../collab/useField";
import { RichTextEditor } from "./RichTextEditor";
import { RecommendationsEditor } from "./RecommendationsEditor";
import { NumericTableEditor } from "./NumericTableEditor";
import { Modal } from "./Modal";

// ---- Read-mode rendering (derived, legally numbered) -----------------------

function renderInlines(inlines: ReportInline[]): React.ReactNode {
  return inlines.map((i, idx) => {
    let node: React.ReactNode = i.text;
    if (i.bold) node = <strong>{node}</strong>;
    if (i.italic) node = <em>{node}</em>;
    if (i.underline) node = <u>{node}</u>;
    if (i.strike) node = <s>{node}</s>;
    return <React.Fragment key={idx}>{node}</React.Fragment>;
  });
}

function renderCell(cell: ReportCell): React.ReactNode {
  if (cell.inlines && cell.inlines.length) return renderInlines(cell.inlines);
  return cell.text ?? "";
}

function ReadBlock({ block }: { block: ReportBlock }) {
  switch (block.kind) {
    case "title":
      return <h1 className={`doc-title${block.missing ? " missing" : ""}`}>{block.text}</h1>;
    case "subtitle":
      return <p className={`doc-subtitle${block.missing ? " missing" : ""}`}>{block.text}</p>;
    case "section":
      return <h2 className="doc-section">{block.text}</h2>;
    case "heading": {
      const Tag = `h${Math.min(block.level + 2, 6)}` as keyof JSX.IntrinsicElements;
      return <Tag className="doc-heading">{renderInlines(block.inlines)}</Tag>;
    }
    case "paragraph":
      return (
        <div className={`doc-para${block.missing ? " missing" : ""}`}>
          {block.num !== null && <span className="para-num">{block.num}</span>}
          <span className="para-body">{renderInlines(block.inlines)}</span>
        </div>
      );
    case "list":
      return block.ordered ? (
        <ol className="doc-list">
          {block.items.map((it, i) => (
            <li key={i}>{renderInlines(it)}</li>
          ))}
        </ol>
      ) : (
        <ul className="doc-list">
          {block.items.map((it, i) => (
            <li key={i}>{renderInlines(it)}</li>
          ))}
        </ul>
      );
    case "image":
      return <img className="doc-image" src={block.src} alt={block.alt || ""} />;
    case "table":
      return (
        <div className="table-scroll">
          <table className="doc-table">
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`${cell.align === "right" ? "right" : ""}${cell.negative ? " negative" : ""}${cell.header ? " total" : ""}`}
                    >
                      {renderCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function ReadReport({ data }: { data: ProjectData }) {
  const blocks = composeReport(data);
  return (
    <div className="report">
      {blocks.map((b, i) => (
        <ReadBlock key={i} block={b} />
      ))}
    </div>
  );
}

// ---- Inline edit controls --------------------------------------------------

function InlineText({
  field,
  placeholder,
  maxLength,
  multiline,
}: {
  field: string;
  placeholder: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  const [value, setValue] = useMapValue<string>(field, "");
  if (multiline) {
    return (
      <textarea
        className="inline-input"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={2}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  }
  return (
    <input
      className="inline-input"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function InlineSelect({
  field,
  options,
  placeholder,
}: {
  field: string;
  options: string[];
  placeholder: string;
}) {
  const [value, setValue] = useMapValue<string>(field, "");
  return (
    <select className="inline-select" value={value} onChange={(e) => setValue(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function InlineLocations() {
  const [value, setValue] = useMapValue<string[]>("locations", []);
  const toggle = (opt: string) => {
    if (value.includes(opt)) setValue(value.filter((v) => v !== opt));
    else setValue([...value, opt]);
  };
  return (
    <div className="multiselect inline">
      {LOCATIONS.map((o) => (
        <label key={o} className={`chip${value.includes(o) ? " selected" : ""}`}>
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

// Renders a derived numeric table (read-only look) with an Edit button.
function DerivedNumericTable({
  data,
  rows,
  tableKey,
  startKey,
  endKey,
  formatter,
  onEdit,
}: {
  data: ProjectData;
  rows: string[];
  tableKey: "financialTable" | "fteTable";
  startKey: "finStartYear" | "fteStartYear";
  endKey: "finEndYear" | "fteEndYear";
  formatter: (v: number) => { text: string; negative: boolean };
  onEdit: () => void;
}) {
  const years = yearsInRange(data[startKey], data[endKey]);
  return (
    <div className="derived-table">
      {years.length === 0 ? (
        <p className="missing">[Year range not set]</p>
      ) : (
        <div className="table-scroll">
          <table className="doc-table">
            <thead>
              <tr>
                <th />
                {years.map((y) => (
                  <th key={y}>{y}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                let total = 0;
                return (
                  <tr key={row}>
                    <td>{row}</td>
                    {years.map((y) => {
                      const v = data[tableKey][row]?.[y] ?? 0;
                      total += v;
                      const f = formatter(v);
                      return (
                        <td key={y} className={`right${f.negative ? " negative" : ""}`}>
                          {f.text}
                        </td>
                      );
                    })}
                    {(() => {
                      const f = formatter(total);
                      return <td className={`right total${f.negative ? " negative" : ""}`}>{f.text}</td>;
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button className="btn small" onClick={onEdit}>
        ✎ Edit table
      </button>
    </div>
  );
}

function EditReport({ data }: { data: ProjectData }) {
  const [modal, setModal] = useState<null | "recommendations" | "financial" | "fte">(null);

  return (
    <div className="report editing">
      <div className="edit-hint">
        Inline edit mode — changes write straight back to the source fields and sync live to
        everyone. Complex tables open in a pop-up editor.
      </div>

      <div className="doc-field">
        <label className="edit-label">Project Name</label>
        <InlineText field="projectName" placeholder="Project name" maxLength={180} />
      </div>
      <div className="doc-field row">
        <div>
          <label className="edit-label">Department</label>
          <InlineSelect field="department" options={DEPARTMENTS} placeholder="Department" />
        </div>
        <div>
          <label className="edit-label">Process Type</label>
          <InlineSelect field="processType" options={PROCESS_TYPES} placeholder="Process type" />
        </div>
        <div>
          <label className="edit-label">Budget Year</label>
          <InlineSelect field="budgetYear" options={FINANCIAL_YEARS} placeholder="Year" />
        </div>
      </div>

      <h2 className="doc-section">Summary</h2>
      <InlineText field="shortDescription" placeholder="Short description" maxLength={300} multiline />

      <h2 className="doc-section">Recommendations</h2>
      <button className="btn small" onClick={() => setModal("recommendations")}>
        ✎ Edit recommendations ({data.recommendations.length})
      </button>
      <ol className="doc-list preview-recs">
        {data.recommendations.map((r) => (
          <li key={r.id}>
            <strong>{r.type ? `${r.type}: ` : ""}</strong>
            {r.text || <span className="missing">[empty]</span>}
          </li>
        ))}
      </ol>

      <h2 className="doc-section">Detailed Description</h2>
      <RichTextEditor field="detailedDescription" editable />

      <h2 className="doc-section">Election Commitment</h2>
      <InlineSelect field="electionCommitment" options={YES_NO} placeholder="Yes / No" />
      {data.electionCommitment === "Yes" && (
        <>
          <label className="edit-label">Election Commitment Details</label>
          <RichTextEditor field="electionCommitmentDetails" editable />
        </>
      )}

      <h2 className="doc-section">Financials ($ million)</h2>
      <div className="doc-field row">
        <div>
          <label className="edit-label">Start Year</label>
          <InlineSelect field="finStartYear" options={FINANCIAL_YEARS} placeholder="Start" />
        </div>
        <div>
          <label className="edit-label">End Year</label>
          <InlineSelect field="finEndYear" options={FINANCIAL_YEARS} placeholder="End" />
        </div>
      </div>
      <DerivedNumericTable
        data={data}
        rows={FINANCIAL_ROWS}
        tableKey="financialTable"
        startKey="finStartYear"
        endKey="finEndYear"
        formatter={formatDollars}
        onEdit={() => setModal("financial")}
      />

      <h2 className="doc-section">Costing Methodology</h2>
      <RichTextEditor field="costingMethodology" editable />

      <h2 className="doc-section">Full-Time Equivalents (FTEs)</h2>
      <div className="doc-field row">
        <div>
          <label className="edit-label">Start Year</label>
          <InlineSelect field="fteStartYear" options={FINANCIAL_YEARS} placeholder="Start" />
        </div>
        <div>
          <label className="edit-label">End Year</label>
          <InlineSelect field="fteEndYear" options={FINANCIAL_YEARS} placeholder="End" />
        </div>
      </div>
      <DerivedNumericTable
        data={data}
        rows={FTE_ROWS}
        tableKey="fteTable"
        startKey="fteStartYear"
        endKey="fteEndYear"
        formatter={formatFte}
        onEdit={() => setModal("fte")}
      />

      <h2 className="doc-section">Project Location</h2>
      <InlineLocations />

      <h2 className="doc-section">Additional Information</h2>
      <RichTextEditor field="additionalInfo" editable />

      {modal === "recommendations" && (
        <Modal title="Edit Recommendations" wide onClose={() => setModal(null)}>
          <RecommendationsEditor />
        </Modal>
      )}
      {modal === "financial" && (
        <Modal title="Edit Financial Table" wide onClose={() => setModal(null)}>
          <NumericTableEditor
            tableField="financialTable"
            startField="finStartYear"
            endField="finEndYear"
            rowLabels={FINANCIAL_ROWS}
            hint="Enter whole dollar amounts; the report displays them in $ millions."
          />
        </Modal>
      )}
      {modal === "fte" && (
        <Modal title="Edit FTE Table" wide onClose={() => setModal(null)}>
          <NumericTableEditor
            tableField="fteTable"
            startField="fteStartYear"
            endField="fteEndYear"
            rowLabels={FTE_ROWS}
          />
        </Modal>
      )}
    </div>
  );
}

export function Preview({ editing }: { editing: boolean }) {
  const data = useProjectData();
  return editing ? <EditReport data={data} /> : <ReadReport data={data} />;
}
