import { ESTADO_LABEL, PILAR_LABEL, type Estado } from "@/lib/types";

// Un color por etapa, en el orden del pipeline: de "sin empezar" (ámbar) a
// "publicado" (verde). Las 5 son las mismas que ve el equipo en NocoDB.
const ESTADO_COLOR: Record<Estado, string> = {
  borrador: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  por_hacer: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  en_proceso: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  producido: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  publicado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export function EstadoBadge({ estado }: { estado: Estado }) {
  const cls = ESTADO_COLOR[estado] || ESTADO_COLOR.borrador;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {ESTADO_LABEL[estado] || estado}
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  if (!children) return <span className="text-slate-600">—</span>;
  return (
    <span className="inline-flex items-center rounded-md bg-slate-700/30 px-2 py-0.5 text-xs text-slate-300">
      {children}
    </span>
  );
}

export function PilarChip({ pilar }: { pilar: string }) {
  if (!pilar) return <span className="text-slate-600">—</span>;
  return <Chip>{PILAR_LABEL[pilar] || pilar}</Chip>;
}
