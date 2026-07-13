"use client";

import { useRouter } from "next/navigation";
import type { Guion } from "@/lib/types";
import { PilarChip } from "./badges";
import EstadoSelect from "./EstadoSelect";
import { useGuionModal } from "./GuionModalProvider";
import { useGuionFilters } from "./GuionFilters";
import { removeGuion } from "@/lib/api";

export default function GuionesTable({ guiones }: { guiones: Guion[] }) {
  const router = useRouter();
  const { open } = useGuionModal();
  const { rows, controls, total, count } = useGuionFilters(guiones);

  async function borrar(slug: string) {
    if (!confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    await removeGuion(slug);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {controls}
        <span className="ml-auto self-center text-sm text-slate-400">
          {count} de {total}
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
