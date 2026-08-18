"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Guion } from "@/lib/types";
import { PilarChip } from "./badges";
import EstadoSelect from "./EstadoSelect";
import { useGuionModal } from "./GuionModalProvider";
import { useGuionFilters } from "./GuionFilters";
import { removeGuion } from "@/lib/api";

/**
 * Cuántas filas se pintan de golpe. Con 261 piezas y subiendo, pintarlas todas alarga la
 * página y castiga al navegador para nada: nadie mira la fila 200 sin filtrar antes.
 *
 * ponytail: paginación simple del lado cliente. Se descartó virtualizar
 * (`@tanstack/react-virtual`) porque es una dependencia nueva para una tabla que con
 * páginas de 50 ya va sobrada. Si algún día hay que ver miles de filas de un tirón, ahí
 * sí toca virtualizar.
 */
const POR_PAGINA = 50;

export default function GuionesTable({ guiones }: { guiones: Guion[] }) {
  const router = useRouter();
  const { open } = useGuionModal();
  const { rows, controls, total, count } = useGuionFilters(guiones);
  const [pagina, setPagina] = useState(0);

  const paginas = Math.max(1, Math.ceil(rows.length / POR_PAGINA));
  // Al filtrar, la página en la que estabas puede dejar de existir.
  useEffect(() => setPagina(0), [count]);
  const visibles = rows.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  async function borrar(slug: string) {
    if (!confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    try {
      await removeGuion(slug);
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo eliminar: ${e instanceof Error ? e.message : "error"}`);
    }
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
            {visibles.map((g) => (
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
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Sin resultados con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <span className="text-slate-400">
            {pagina * POR_PAGINA + 1}–{Math.min((pagina + 1) * POR_PAGINA, rows.length)} de{" "}
            {rows.length}
          </span>
          <PageBtn onClick={() => setPagina((p) => p - 1)} disabled={pagina === 0}>
            ← Anterior
          </PageBtn>
          <PageBtn
            onClick={() => setPagina((p) => p + 1)}
            disabled={pagina >= paginas - 1}
          >
            Siguiente →
          </PageBtn>
        </div>
      )}
    </div>
  );
}

function PageBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-line px-3 py-1 text-slate-300 hover:bg-white/5 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
