"use client";

import { useMemo, useState } from "react";
import { ESTADOS, ESTADO_LABEL, type Guion } from "@/lib/types";

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

/**
 * Hook de filtros reutilizable (Tablero y Todos los guiones).
 * Devuelve las filas filtradas y la barra de controles ya renderizada.
 */
export function useGuionFilters(guiones: Guion[]) {
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fVoz, setFVoz] = useState("");
  const [fPlataforma, setFPlataforma] = useState("");
  const [fPilar, setFPilar] = useState("");
  const [fResponsable, setFResponsable] = useState("");

  const voces = useMemo(() => uniq(guiones.map((g) => g.voz)), [guiones]);
  const plataformas = useMemo(
    () => uniq(guiones.map((g) => g.plataforma)),
    [guiones]
  );
  const pilares = useMemo(() => uniq(guiones.map((g) => g.pilar)), [guiones]);
  const responsables = useMemo(
    () => uniq(guiones.map((g) => g.responsable)),
    [guiones]
  );

  const rows = guiones.filter((g) => {
    if (fEstado && g.estado !== fEstado) return false;
    if (fVoz && g.voz !== fVoz) return false;
    if (fPlataforma && g.plataforma !== fPlataforma) return false;
    if (fPilar && g.pilar !== fPilar) return false;
    if (fResponsable && g.responsable !== fResponsable) return false;
    if (q && !g.titulo.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const hayFiltro = Boolean(q || fEstado || fVoz || fPlataforma || fPilar || fResponsable);
  const limpiar = () => {
    setQ("");
    setFEstado("");
    setFVoz("");
    setFPlataforma("");
    setFPilar("");
    setFResponsable("");
  };

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar título…"
        className="w-44 rounded-lg border border-line bg-ink px-3 py-1.5 text-sm outline-none focus:border-brand"
      />
      <FilterSelect value={fEstado} onChange={setFEstado} label="Estado">
        {ESTADOS.map((s) => (
          <option key={s} value={s}>
            {ESTADO_LABEL[s]}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={fPilar} onChange={setFPilar} label="Pilar">
        {pilares.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={fVoz} onChange={setFVoz} label="Voz">
        {voces.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect value={fPlataforma} onChange={setFPlataforma} label="Plataforma">
        {plataformas.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        value={fResponsable}
        onChange={setFResponsable}
        label="Responsable"
      >
        {responsables.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </FilterSelect>
      {/* Un filtro activo se veía igual que uno vacío: el tablero mostraba 10 de 118 sin
          nada que delatara por qué faltaban los otros 108. */}
      {hayFiltro && (
        <button
          onClick={limpiar}
          className="rounded-lg border border-brand/60 bg-brand/10 px-2.5 py-1.5 text-sm text-brand hover:bg-brand/20"
        >
          Limpiar filtros ({guiones.length - rows.length} ocultos)
        </button>
      )}
    </div>
  );

  return { rows, controls, total: guiones.length, count: rows.length };
}

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-brand ${
        value
          ? "border-brand/60 bg-brand/10 text-brand"
          : "border-line bg-ink text-slate-200"
      }`}
    >
      <option value="">{label}: todos</option>
      {children}
    </select>
  );
}
