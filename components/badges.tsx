import { ESTADO_LABEL, PILAR_LABEL, type Estado } from "@/lib/types";

const ESTADO_COLOR: Record<Estado, string> = {
  idea: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  borrador: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  aprobado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  por_grabar: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  grabado: "bg-rose-500/15 text-rose-300 border-rose-500/30",
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
