import { listGuiones, dataSource } from "@/lib/data";
import Board from "@/components/Board";
import NewGuionButton from "@/components/NewGuionButton";
import { KANBAN_ESTADOS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TableroPage() {
  const guiones = await listGuiones();
  const src = dataSource();

  const porGrabar = guiones.filter((g) => g.estado === "por_grabar").length;
  const borradores = guiones.filter((g) => g.estado === "borrador").length;
  const grabados = guiones.filter((g) => g.estado === "grabado").length;
  const activos = guiones.filter((g) =>
    (KANBAN_ESTADOS as string[]).includes(g.estado)
  ).length;

  return (
    <div className="px-5 py-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tablero de producción</h1>
          <p className="text-sm text-slate-400">
            {guiones.length} guiones · fuente de datos:{" "}
            <span className={src === "local" ? "text-amber-400" : "text-emerald-400"}>
              {src === "local" ? "archivos locales (dev)" : "GitHub"}
            </span>{" "}
            · arrastra las tarjetas para cambiar el estado
          </p>
        </div>
        <div className="flex items-center gap-3 text-center text-sm">
          <Stat label="Por aprobar" value={borradores} tone="amber" />
          <Stat label="Por grabar" value={porGrabar} tone="sky" />
          <Stat label="Grabados" value={grabados} tone="blue" />
          <Stat label="Activos" value={activos} tone="slate" />
          <NewGuionButton />
        </div>
      </div>

      <Board guiones={guiones} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  const color: Record<string, string> = {
    amber: "text-amber-300",
    sky: "text-sky-300",
    blue: "text-blue-300",
    slate: "text-slate-200",
  };
  return (
    <div className="rounded-lg border border-line bg-panel px-3 py-1.5">
      <div className={`text-lg font-semibold ${color[tone]}`}>{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
