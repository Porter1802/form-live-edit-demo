import React, { useEffect } from "react";
import { useMapValue } from "../collab/useField";
import { NumericTable, yearsInRange } from "../../../common/src/index";

export function NumericTableEditor({
  tableField,
  startField,
  endField,
  rowLabels,
  hint,
}: {
  tableField: string;
  startField: string;
  endField: string;
  rowLabels: string[];
  hint?: string;
}) {
  const [table, setTable] = useMapValue<NumericTable>(tableField, {});
  const [start] = useMapValue<string>(startField, "");
  const [end] = useMapValue<string>(endField, "");
  const years = yearsInRange(start, end);

  // Drop data for any year no longer in range when the range changes.
  useEffect(() => {
    if (!start || !end) return;
    const allowed = new Set(years);
    let changed = false;
    const next: NumericTable = {};
    for (const [row, cols] of Object.entries(table)) {
      const kept: Record<string, number> = {};
      for (const [year, val] of Object.entries(cols)) {
        if (allowed.has(year)) kept[year] = val;
        else changed = true;
      }
      next[row] = kept;
    }
    if (changed) setTable(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const setCell = (row: string, year: string, raw: string) => {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value)) return;
    const next: NumericTable = { ...table, [row]: { ...(table[row] || {}) } };
    next[row][year] = value;
    setTable(next);
  };

  const rowTotal = (row: string): number =>
    years.reduce((sum, y) => sum + (table[row]?.[y] ?? 0), 0);

  if (years.length === 0) {
    return <p className="muted">Select a valid Start Year and End Year to enter data.</p>;
  }

  return (
    <div className="numeric-table-wrap">
      {hint && <p className="muted small">{hint}</p>}
      <div className="table-scroll">
        <table className="editable-table numeric">
          <thead>
            <tr>
              <th />
              {years.map((y) => (
                <th key={y}>{y}</th>
              ))}
              <th className="total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((row) => (
              <tr key={row}>
                <td className="row-label">{row}</td>
                {years.map((y) => (
                  <td key={y}>
                    <input
                      type="number"
                      step="any"
                      value={table[row]?.[y] ?? ""}
                      onChange={(e) => setCell(row, y, e.target.value)}
                    />
                  </td>
                ))}
                <td className="total-col">{rowTotal(row).toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
