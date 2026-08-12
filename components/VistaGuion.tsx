"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { soloHablado } from "@/lib/hablado";

/**
 * El guion, en dos vistas.
 *
 * Por defecto muestra **solo lo que se dice en cámara**: quien graba no necesita las
 * fuentes, las notas de producción ni la materia prima, y verlo todo confunde.
 *
 * El guion completo sigue estando a un clic, y el archivo .md no se toca — esto es un
 * filtro de lectura, no un borrado. Lo que se edita y lo que se guarda es el guion entero.
 */
export default function VistaGuion({ cuerpo }: { cuerpo: string }) {
  const [completo, setCompleto] = useState(false);
  const hablado = soloHablado(cuerpo);
  // Si el filtro no encontró nada que quitar, el interruptor sobra.
  const hayDiferencia = hablado.trim() !== cuerpo.trim();

  return (
    <div>
      {hayDiferencia && (
        <div className="mb-2 flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-line text-xs">
            <button
              onClick={() => setCompleto(false)}
              className={`px-3 py-1.5 transition ${
                !completo
                  ? "bg-brand/15 font-medium text-brand"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🎙️ Para grabar
            </button>
            <button
              onClick={() => setCompleto(true)}
              className={`border-l border-line px-3 py-1.5 transition ${
                completo
                  ? "bg-brand/15 font-medium text-brand"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Guion completo
            </button>
          </div>
          <span className="text-xs text-slate-500">
            {completo
              ? "con fuentes, producción y notas"
              : "solo lo que dices en cámara"}
          </span>
        </div>
      )}

      <article className="prose-guion max-w-none rounded-xl border border-line bg-panel/40 p-5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {completo ? cuerpo : hablado}
        </ReactMarkdown>
      </article>
    </div>
  );
}
