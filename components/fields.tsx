"use client";

// Primitivos de formulario reutilizables en toda la app.

export const inputCls =
  "w-full rounded-lg border border-line bg-ink px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-brand disabled:opacity-50";

export function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/** Select con opciones [valor, etiqueta]. Con `placeholder` añade una opción vacía. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
  placeholder?: string;
}) {
  return (
    <Labeled label={label}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Labeled>
  );
}

export function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Labeled label={label}>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </Labeled>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Labeled label={label}>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </Labeled>
  );
}
