"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ESTADOS, ESTADO_LABEL, type Guion } from "@/lib/types";
import { PilarChip } from "./badges";
import EstadoSelect from "./EstadoSelect";
import { useGuionModal } from "./GuionModalProvider";
import { removeGuion } from "@/lib/api";

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

export default function GuionesTable({ guiones }: { guiones: Guion[] }) {
  const router = useRouter();
  const { open } = useGuionModal();
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

  async function borrar(slug: string) {
    if (!confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    await removeGuion(slug);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar título…"
          className="w-48 rounded-lg border border-line bg-ink px-3 py-1.5 text-sm outline-none focus:border-brand"
        />
        <Select value={fEstado} onChange={setFEstado} label="Estado">
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {ESTADO_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select value={fPilar} onChange={setFPilar} label="Pilar">
          {pilares.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={fVoz} onChange={setFVoz} label="Voz">
          {voces.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
        <Select value={fPlataforma} onChange={setFPlataforma} label="Plataforma">
          {plataformas.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={fResponsable} onChange={setFResponsable} label="Responsable">
          {responsables.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center text-sm text-slate-400">
          {rows.length} de {guiones.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Guion</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Pilar</th>
              <th className="px-3 py-2 font-medium">Voz</th>
              <th className="px-3 py-2 font-medium">Plataforma</th>
              <th className="px-3 py-2 font-medium">Responsable</th>
              <th className="px-3 py-2 font-medium">Grabación</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr
                key={g.slug}
                className="group border-t border-line hover:bg-white/[0.03]"
              >
                <td className="px-3 py-2">
                  <button
                    onClick={() => open(g.slug)}
                    className="text-left font-medium hover:text-brand"
                  >
                    {g.titulo}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <EstadoSelect slug={g.slug} estado={g.estado} />
                </td>
                <td className="px-3 py-2">
                  <PilarChip pilar={g.pilar} />
                </td>
                <td className="px-3 py-2 text-slate-300">{g.voz || "—"}</td>
                <td className="px-3 py-2 text-slate-300">
                  {g.plataforma || "—"}
                </td>
                <td className="px-3 py-2 text-slate-300">
                  {g.responsable || "—"}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {g.fecha_grabacion || "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => borrar(g.slug)}
                    className="rounded-md px-2 py-1 text-slate-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Sin resultados con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({
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
      className="rounded-lg border border-line bg-ink px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-brand"
    >
      <option value="">{label}: todos</option>
      {children}
    </select>
  );
}
