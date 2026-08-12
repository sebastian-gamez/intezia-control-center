// adaptador-nocodb.ts — Los guiones viven en NocoDB, no en el repositorio.
//
// Por qué: este repo es público para que Vercel lo despliegue, y el contenido de la
// fábrica —guiones sin publicar, criterio editorial— no puede estar en él. Poniendo los
// guiones en la base de datos, el repo se queda solo con código y no hay nada que
// filtrar.
//
// La bóveda de Obsidian sigue existiendo en su repo privado: es donde se escriben los
// guiones con el modelo de ritmo y desde donde se empujan aquí. Esta app los consume.
//
// El identificador es el **ticket** (`INT-0431`), no el nombre del archivo: es estable
// aunque el título cambie.

import type { Guion, GuionPatch, Estado } from "./types";
import { ESTADOS, ESTADO_LABEL, ESTADO_LEGADO, ESTADOS_ACTIVOS } from "./types";

const BASE = (process.env.NOCODB_BASE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.NOCODB_TOKEN || "";
const TABLA = process.env.NOCODB_CONTENIDO_TABLE_ID || "";

export function nocodbDisponible(): boolean {
  return Boolean(BASE && TOKEN && TABLA);
}

type Fila = Record<string, any>;

async function api(ruta: string, method = "GET", body?: unknown) {
  const r = await fetch(new URL(ruta, BASE), {
    method,
    headers: { "xc-token": TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(
      `NocoDB respondió ${r.status} en ${method} ${ruta.split("?")[0]}. ` +
        `Revisa NOCODB_BASE_URL, NOCODB_TOKEN y NOCODB_CONTENIDO_TABLE_ID.`
    );
  }
  return r.status === 204 ? null : r.json();
}

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
const soloFecha = (v: unknown) => (v ? String(v).slice(0, 10) : "");

/** Etiqueta de NocoDB ("Por Hacer") → slug interno ("por_hacer"). */
function estadoDesde(label: unknown): Estado {
  const l = txt(label).trim().toLowerCase();
  const encontrado = ESTADOS.find((e) => ESTADO_LABEL[e].toLowerCase() === l);
  return encontrado || ESTADO_LEGADO[l] || "borrador";
}

/** Una fila de la tabla → el Guion que la app ya sabe pintar. */
function aGuion(f: Fila): Guion {
  return {
    slug: txt(f.Ticket),
    ticket: txt(f.Ticket),
    titulo: txt(f.Nombre) || txt(f.Ticket),
    estado: estadoDesde(f.Estado),
    pilar: txt(f.Pilar),
    voz: txt(f.Voz),
    plataforma: txt(f.Plataforma),
    formato: txt(f.Formatos).split(",")[0] || "",
    duracion: txt(f["Duración"]),
    palabras_objetivo: num(f["Palabras objetivo"]),
    persona_audiencia: txt(f.Persona),
    fuente: txt(f.Fuente),
    insight: txt(f.Insight),
    referencia: txt(f.Referencia),
    responsable: txt(f.Responsable),
    fecha_grabacion: soloFecha(f["Fecha grabación"]),
    fecha_produccion: "",
    fecha_publicacion: soloFecha(f["Fecha publicación"]),
    cta: txt(f.CTA) || "valor",
    metricas: { views: null, saves: null, shares: null },
    pipeline: "",
    tags: ["guion"],
    cuerpo: txt(f["Guión"]),
  };
}

/** El Guion de la app → columnas de la tabla. Solo lo que la app edita. */
function aFila(patch: GuionPatch, cuerpo?: string): Fila {
  const f: Fila = {};
  const map: Record<string, string> = {
    voz: "Voz",
    pilar: "Pilar",
    plataforma: "Plataforma",
    responsable: "Responsable",
    duracion: "Duración",
    persona_audiencia: "Persona",
    cta: "CTA",
  };
  for (const [k, col] of Object.entries(map)) {
    const v = (patch as Record<string, unknown>)[k];
    if (v !== undefined) f[col] = v === "" ? null : v;
  }
  if (patch.estado !== undefined) f.Estado = ESTADO_LABEL[patch.estado as Estado];
  if (patch.fecha_grabacion !== undefined) f["Fecha grabación"] = patch.fecha_grabacion || null;
  if (patch.fecha_publicacion !== undefined) f["Fecha publicación"] = patch.fecha_publicacion || null;
  if ((patch as Record<string, unknown>).palabras_objetivo !== undefined) {
    f["Palabras objetivo"] = num((patch as Record<string, unknown>).palabras_objetivo);
  }
  if (cuerpo !== undefined) f["Guión"] = cuerpo;
  return f;
}

async function todas(): Promise<Fila[]> {
  const filas: Fila[] = [];
  let offset = 0;
  for (;;) {
    const q = new URLSearchParams({ limit: "1000", offset: String(offset) });
    const r = await api(`/api/v2/tables/${TABLA}/records?${q}`);
    filas.push(...(r?.list || []));
    if (!r?.list || r.list.length < 1000) break;
    offset += 1000;
  }
  return filas;
}

// ---------------------------------------------------------------------------
// La interfaz que consume la app
// ---------------------------------------------------------------------------

export async function listar(): Promise<Guion[]> {
  const filas = await todas();
  return filas
    // Solo contenido social: la producción interna (capacitaciones, entrevistas) tiene
    // su propia cola y no pinta en el tablero editorial.
    .filter((f) => txt(f["Tipo de pieza"]) !== "Producción interna")
    .map(aGuion)
    .filter((g) => (ESTADOS_ACTIVOS as readonly string[]).includes(g.estado))
    .sort((a, b) => a.ticket.localeCompare(b.ticket));
}

export async function obtener(ticket: string): Promise<Guion | null> {
  const q = new URLSearchParams({ where: `(Ticket,eq,${ticket})`, limit: "1" });
  const r = await api(`/api/v2/tables/${TABLA}/records?${q}`);
  const fila = r?.list?.[0];
  return fila ? aGuion(fila) : null;
}

export async function actualizar(
  ticket: string,
  patch: GuionPatch,
  cuerpo?: string
): Promise<Guion> {
  const q = new URLSearchParams({ where: `(Ticket,eq,${ticket})`, limit: "1" });
  const r = await api(`/api/v2/tables/${TABLA}/records?${q}`);
  const fila = r?.list?.[0];
  if (!fila) throw new Error(`No existe el guion ${ticket} en NocoDB.`);
  await api(`/api/v2/tables/${TABLA}/records`, "PATCH", [
    { Id: fila.Id, ...aFila(patch, cuerpo) },
  ]);
  const actualizado = await obtener(ticket);
  if (!actualizado) throw new Error(`No se pudo releer ${ticket}.`);
  return actualizado;
}

/** Siguiente ticket libre. Se calcula sobre la tabla, que es la única fuente. */
async function siguienteTicket(filas: Fila[]): Promise<string> {
  const max = filas.reduce((m, f) => {
    const n = Number(txt(f.Ticket).match(/^INT-(\d+)$/)?.[1] || 0);
    return n > m ? n : m;
  }, 0);
  return `INT-${String(max + 1).padStart(4, "0")}`;
}

export async function crear(titulo: string, plantilla: string): Promise<Guion> {
  const filas = await todas();
  const ticket = await siguienteTicket(filas);
  await api(`/api/v2/tables/${TABLA}/records`, "POST", [
    {
      Ticket: ticket,
      Nombre: titulo,
      Estado: ESTADO_LABEL.borrador,
      "Tipo de pieza": "Social",
      Origen: "Nuevo",
      CTA: "valor",
      "Guión": plantilla.replace(/\{\{\s*title\s*\}\}/g, titulo),
    },
  ]);
  const creado = await obtener(ticket);
  if (!creado) throw new Error("La fila se creó pero no se pudo releer.");
  return creado;
}

export async function eliminar(ticket: string): Promise<void> {
  const q = new URLSearchParams({ where: `(Ticket,eq,${ticket})`, limit: "1" });
  const r = await api(`/api/v2/tables/${TABLA}/records?${q}`);
  const fila = r?.list?.[0];
  if (!fila) return; // idempotente
  await api(`/api/v2/tables/${TABLA}/records`, "DELETE", [{ Id: fila.Id }]);
}

export async function duplicar(ticket: string): Promise<Guion> {
  const orig = await obtener(ticket);
  if (!orig) throw new Error("Guion no encontrado.");
  const filas = await todas();
  const nuevo = await siguienteTicket(filas);
  await api(`/api/v2/tables/${TABLA}/records`, "POST", [
    {
      Ticket: nuevo,
      Nombre: `${orig.titulo} (copia)`,
      Estado: ESTADO_LABEL.borrador,
      "Tipo de pieza": "Social",
      Origen: "Nuevo",
      Voz: orig.voz || null,
      Pilar: orig.pilar || null,
      Plataforma: orig.plataforma || null,
      "Duración": orig.duracion || null,
      Persona: orig.persona_audiencia || null,
      CTA: orig.cta || "valor",
      "Guión": orig.cuerpo,
    },
  ]);
  const creado = await obtener(nuevo);
  if (!creado) throw new Error("La copia se creó pero no se pudo releer.");
  return creado;
}
