import React from "react";
import { useMapValue } from "../collab/useField";

export function TextField({
  field,
  label,
  maxLength,
  placeholder,
}: {
  field: string;
  label: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useMapValue<string>(field, "");
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      {maxLength && (
        <span className="char-count">
          {value.length}/{maxLength}
        </span>
      )}
    </label>
  );
}

export function TextAreaField({
  field,
  label,
  maxLength,
  placeholder,
}: {
  field: string;
  label: string;
  maxLength?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useMapValue<string>(field, "");
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => setValue(e.target.value)}
      />
      {maxLength && (
        <span className="char-count">
          {value.length}/{maxLength}
        </span>
      )}
    </label>
  );
}

export function Dropdown({
  field,
  label,
  options,
  placeholder = "Select…",
}: {
  field: string;
  label: string;
  options: string[];
  placeholder?: string;
}) {
  const [value, setValue] = useMapValue<string>(field, "");
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MultiSelect({
  field,
  label,
  options,
}: {
  field: string;
  label: string;
  options: string[];
}) {
  const [value, setValue] = useMapValue<string[]>(field, []);
  const toggle = (opt: string) => {
    if (value.includes(opt)) setValue(value.filter((v) => v !== opt));
    else setValue([...value, opt]);
  };
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="multiselect">
        {options.map((o) => (
          <label key={o} className={`chip${value.includes(o) ? " selected" : ""}`}>
            <input
              type="checkbox"
              checked={value.includes(o)}
              onChange={() => toggle(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
