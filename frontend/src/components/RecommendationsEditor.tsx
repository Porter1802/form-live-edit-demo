import React from "react";
import { useMapValue } from "../collab/useField";
import { Recommendation, RECOMMENDATION_TYPES } from "../../../common/src/index";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function RecommendationsEditor() {
  const [rows, setRows] = useMapValue<Recommendation[]>("recommendations", []);

  const update = (id: string, patch: Partial<Recommendation>) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const add = () => {
    setRows([...rows, { id: uid(), type: "Approve", text: "" }]);
  };
  const remove = (id: string) => setRows(rows.filter((r) => r.id !== id));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };

  return (
    <div className="rec-editor">
      <table className="editable-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th style={{ width: 140 }}>Type</th>
            <th>Recommendation</th>
            <th style={{ width: 120 }}>Order</th>
            <th style={{ width: 50 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>
                <select value={r.type} onChange={(e) => update(r.id, { type: e.target.value })}>
                  {RECOMMENDATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="text"
                  value={r.text}
                  placeholder="Recommendation text"
                  onChange={(e) => update(r.id, { text: e.target.value })}
                />
              </td>
              <td className="order-cell">
                <button className="btn icon" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
                  ↑
                </button>
                <button
                  className="btn icon"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  title="Move down"
                >
                  ↓
                </button>
              </td>
              <td>
                <button className="btn icon danger" onClick={() => remove(r.id)} title="Remove">
                  ✕
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="muted center">
                No recommendations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button className="btn" onClick={add}>
        + Add recommendation
      </button>
    </div>
  );
}
