// log.ts — Logging estructurado sin dependencias externas.
//
// Cada evento sale como una línea JSON con marca de tiempo, nivel y contexto. Eso ya es
// consultable en los logs de Vercel (y en cualquier agregador) sin instalar nada ni
// depender de una cuenta de terceros. Si algún día se enchufa un servicio de monitoreo
// (Sentry y compañía), el único sitio a tocar es `emitir`.

type Datos = Record<string, unknown>;
type Nivel = "info" | "warn" | "error";

function emitir(nivel: Nivel, evento: string, datos?: Datos) {
  const linea = JSON.stringify({
    ts: new Date().toISOString(),
    nivel,
    evento,
    ...datos,
  });
  if (nivel === "error") console.error(linea);
  else if (nivel === "warn") console.warn(linea);
  else console.log(linea);
}

export const log = {
  info: (evento: string, datos?: Datos) => emitir("info", evento, datos),
  warn: (evento: string, datos?: Datos) => emitir("warn", evento, datos),
  error: (evento: string, datos?: Datos) => emitir("error", evento, datos),
};

/** Mensaje legible de un error de tipo desconocido (los `catch` no vienen tipados). */
export function motivo(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
