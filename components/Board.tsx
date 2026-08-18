"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KANBAN_ESTADOS,
  ESTADO_LABEL,
  type Estado,
  type Guion,
} from "@/lib/types";
import { PilarChip } from "./badges";
import EstadoSelect from "./EstadoSelect";
import { useGuionModal } from "./GuionModalProvider";
import { useGuionFilters } from "./GuionFilters";
import { patchGuion } from "@/lib/api";

export default function Board({ guiones }: { guiones: Guion[] }) {
  const router = useRouter();
  const { open } = useGuionModal();
  const { rows, controls, count, total } = useGuionFilters(guiones);
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  // Etapa provisional de las tarjetas que se acaban de mover: la tarjeta salta de columna
  // al soltarla, sin esperar al PATCH ni al refresh del servidor.
  const [movidas, setMovidas] = useState<Record<string, Estado>>({});
  // Guardados en curso, por tarjeta. Antes era un booleano global que congelaba el
  // tablero entero mientras se guardaba una sola tarjeta.
  const [guardando, setGuardando] = useState<Set<string>>(new Set());

  // Cuando el servidor ya devuelve la etapa nueva, la provisional sobra.
  useEffect(() => {
    setMovidas((prev) => {
      const next = { ...prev };
      let cambio = false;
      for (const g of guiones)
        if (next[g.slug] === g.estado) {
          delete next[g.slug];
          cambio = true;
        }
      return cambio ? next : prev;
    });
  }, [guiones]);

  function marcar(slug: string, activo: boolean) {
    setGuardando((s) => {
      const next = new Set(s);
      if (activo) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  async function moveTo(slug: string, estado: Estado, previo: Estado) {
    setMovidas((m) => ({ ...m, [slug]: estado }));
    marcar(slug, true);
    try {
      await patchGuion(slug, { estado });
      router.refresh();
    } catch (e) {
      // Sin este catch, un fallo dejaba `busy` en true para siempre y el tablero entero
      // se quedaba muerto (pointer-events-none) hasta recargar la página.
      setMovidas((m) => ({ ...m, [slug]: previo }));
      toast.error(
        `No se pudo mover a ${ESTADO_LABEL[estado]}: ${
          e instanceof Error ? e.message : "error"
        }`
      );
    } finally {
      marcar(slug, false);
    }
  }

  const etapaDe = (g: Guion) => movidas[g.slug] ?? g.estado;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {controls}
        <span className="ml-auto self-center text-sm text-slate-400">
          {count} de {total}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_ESTADOS.map((estado) => {
          const items = rows.filter((g) => etapaDe(g) === estado);
          const isOver = overCol === estado;
          return (
            <div
              key={estado}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(estado);
              }}
              onDragLeave={() => setOverCol((c) => (c === estado ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                const slug = e.dataTransfer.getData("text/plain");
                setOverCol(null);
                setDragSlug(null);
                const g = guiones.find((x) => x.slug === slug);
                if (g && etapaDe(g) !== estado) moveTo(slug, estado, etapaDe(g));
              }}
              className={`flex w-72 shrink-0 flex-col rounded-xl border bg-panel/50 transition ${
                isOver ? "border-brand bg-brand/5" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-medium">
                  {ESTADO_LABEL[estado]}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                  {items.length}
                </span>
              </div>
              <div className="flex min-h-[60px] flex-col gap-2 px-2 pb-2">
                {items.map((g) => (
                  <div
                    key={g.slug}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", g.slug);
                      e.dataTransfer.effectAllowed = "move";
                      setDragSlug(g.slug);
                    }}
                    onDragEnd={() => setDragSlug(null)}
                    onClick={() => open(g.slug)}
                    className={`cursor-pointer rounded-lg border border-line bg-ink p-3 transition hover:border-brand/50 ${
                      dragSlug === g.slug ? "opacity-40" : ""
                    } ${guardando.has(g.slug) ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="mt-0.5 select-none text-slate-600">⠿</span>
                      <span className="text-sm font-medium leading-snug hover:text-brand">
                        {g.titulo}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-4 text-xs text-slate-400">
                      <PilarChip pilar={g.pilar} />
                      {g.voz && <span>🎤 {g.voz}</span>}
                      {g.plataforma && <span>· {g.plataforma}</span>}
                    </div>
                    {(g.fecha_grabacion || g.responsable) && (
                      <div className="mt-1.5 pl-4 text-xs text-slate-500">
                        {g.responsable && <span>👤 {g.responsable} </span>}
                        {g.fecha_grabacion && <span>🎥 {g.fecha_grabacion}</span>}
                      </div>
                    )}
                    {/* En móvil y tablet no hay arrastre nativo: el selector es la única
                        forma de mover la tarjeta, y en escritorio no estorba. */}
                    <div className="mt-2 pl-4" onClick={(e) => e.stopPropagation()}>
                      <EstadoSelect
                        slug={g.slug}
                        estado={etapaDe(g)}
                        alCambiar={(nuevo) => moveTo(g.slug, nuevo, etapaDe(g))}
                      />
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="px-2 py-6 text-center text-xs text-slate-600">
                    Arrastra aquí
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
