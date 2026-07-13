"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  KANBAN_ESTADOS,
  ESTADO_LABEL,
  type Estado,
  type Guion,
} from "@/lib/types";
import { PilarChip } from "./badges";
import { useGuionModal } from "./GuionModalProvider";
import { useGuionFilters } from "./GuionFilters";
import { patchGuion } from "@/lib/api";

export default function Board({ guiones }: { guiones: Guion[] }) {
  const router = useRouter();
  const { open } = useGuionModal();
  const { rows, controls, count, total } = useGuionFilters(guiones);
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function moveTo(slug: string, estado: Estado) {
    setBusy(true);
    await patchGuion(slug, { estado });
    setBusy(false);
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
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_ESTADOS.map((estado) => {
          const items = rows.filter((g) => g.estado === estado);
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
              if (g && g.estado !== estado) moveTo(slug, estado);
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
                  } ${busy ? "pointer-events-none" : ""}`}
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
