import { listGuiones, dataSource, errorDeLectura } from "@/lib/data";
import Board from "@/components/Board";
import NewGuionButton from "@/components/NewGuionButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TableroPage() {
  const guiones = await listGuiones();
  const src = dataSource();
  const fallo = errorDeLectura();

  const borradores = guiones.filter((g) => g.estado === "borrador").length;
  const porHacer = guiones.filter((g) => g.estado === "por_hacer").length;
  const enProceso = guiones.filter((g) => g.estado === "en_proceso").length;
  const producidos = guiones.filter((g) => g.estado === "producido").length;
  const sinTicket = guiones.filter((g) => !g.ticket).length;

  return (
    <div className="px-5 py-5">
      {fallo && (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <p className="text-sm font-medium text-rose-200">
            No se pudieron leer los guiones
          </p>
          <p className="mt-1 text-sm text-rose-300/90">{fallo}</p>
          <p className="mt-2 text-xs text-rose-300/70">
            La app sigue en pie; solo está sin datos. Se arregla en las variables de
            entorno de Vercel y un redeploy.
          </p>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tablero de producción</h1>
          <p className="text-sm text-slate-400">
            {guiones.length} guiones activos · fuente de datos:{" "}
            <span className={src === "local" ? "text-amber-400" : "text-emerald-400"}>
              {src === "nocodb"
                ? "NocoDB"
                : src === "github"
                  ? "GitHub"
                  : "archivos locales (dev)"}
            </span>{" "}
            · arrastra las tarjetas para cambiar la etapa (se refleja en NocoDB)
            {sinTicket > 0 && (
              <span className="text-amber-400">
                {" "}
                · ⚠️ {sinTicket} sin ticket
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-center text-sm">
          <Stat label="Borrador" value={borradores} tone="amber" />
          <Stat label="Por Hacer" value={porHacer} tone="sky" />
          <Stat label="En Proceso" value={enProceso} tone="blue" />
          <Stat label="Producido" value={producidos} tone="slate" />
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
