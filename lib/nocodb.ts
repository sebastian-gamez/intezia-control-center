// Cliente mínimo de NocoDB para la tabla `Contenido` del pipeline unificado.
//
// La app escribe aquí en cuanto alguien cambia una etapa, para que el equipo lo vea al
// instante en NocoDB sin esperar al sync. El guion sigue viviendo en el .md.
//
// Regla de resistencia: si NocoDB no responde, **nunca** se rompe la escritura local.
// Se devuelve un aviso y el sync programado lo reconciliará después. Un guion guardado
// con la sincronización pendiente es mucho mejor que un guardado que falla.
//
// ⚠️ Esta app NO habla con `Rockets` ni `Videos Editados`: son las tablas que el equipo
// usa en producción y quedan fuera del alcance del sistema nuevo.

import type { Estado } from "./types";
import { ESTADO_LABEL } from "./types";

const BASE = (process.env.NOCODB_BASE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.NOCODB_TOKEN || "";
const TABLA = process.env.NOCODB_CONTENIDO_TABLE_ID || "";
const TABLA_LOG = process.env.NOCODB_LOG_TABLE_ID || "";

/** ¿Está configurada la integración? Si no, la app funciona igual, solo con archivos. */
export function nocodbActivo(): boolean {
  return Boolean(BASE && TOKEN && TABLA);
}

/**
 * Una fila cruda de la tabla `Contenido`. Es parcial a propósito: NocoDB devuelve más
 * columnas de las que la app usa, y las que usa son estas. Los nombres llevan acento y
 * espacio porque así se llaman en la tabla.
 */
export interface FilaNocodb {
  Id?: number;
  Ticket?: string;
  Nombre?: string;
  Estado?: string;
  "Tipo de pieza"?: string;
  "Slug bóveda"?: string;
  Origen?: string;
  "Ref origen"?: string;
  Voz?: string | null;
  Pilar?: string | null;
  Plataforma?: string | null;
  Formatos?: string | null;
  "Duración"?: string | null;
  "Palabras objetivo"?: number | null;
  Persona?: string | null;
  Fuente?: string | null;
  Insight?: string | null;
  Referencia?: string | null;
  Responsable?: string | null;
  "Fecha grabación"?: string | null;
  "Fecha publicación"?: string | null;
  CTA?: string | null;
  "Guión"?: string | null;
  // El resto de columnas de la tabla, sin fingir que sabemos su tipo.
  [columna: string]: unknown;
}

type Fila = FilaNocodb;

async function api(ruta: string, method = "GET", body?: unknown) {
  const r = await fetch(new URL(ruta, BASE), {
    method,
    headers: { "xc-token": TOKEN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`NocoDB ${method} ${ruta} → ${r.status}`);
  return r.status === 204 ? null : r.json();
}

/** Fila del pipeline por ticket, o null si no existe. */
export async function filaPorTicket(ticket: string): Promise<Fila | null> {
  if (!nocodbActivo() || !ticket) return null;
  const q = new URLSearchParams({ where: `(Ticket,eq,${ticket})`, limit: "1" });
  const r = await api(`/api/v2/tables/${TABLA}/records?${q}`);
  return r?.list?.[0] || null;
}

/**
 * Siguiente ticket libre (INT-0001, INT-0002…). Única implementación: pide a NocoDB el
 * mayor y suma uno, sin traerse la tabla entera. Antes había otra versión en
 * `adaptador-nocodb.ts` que sí descargaba las 261+ filas para lo mismo.
 */
export async function siguienteTicket(): Promise<string> {
  const q = new URLSearchParams({ sort: "-Ticket", limit: "1", fields: "Ticket" });
  const r = await api(`/api/v2/tables/${TABLA}/records?${q}`);
  const ultimo = r?.list?.[0]?.Ticket as string | undefined;
  const n = Number(String(ultimo || "").replace(/\D/g, "")) || 0;
  return `INT-${String(n + 1).padStart(4, "0")}`;
}

/**
 * Serializa las operaciones que reparten ticket. Entre "leer el mayor" y "escribir la
 * fila" hay una ventana en la que dos creaciones simultáneas se llevan el mismo número;
 * pasando por esta cola, la segunda lee después de que la primera ya insertó.
 *
 * ponytail: es un cerrojo por instancia. Lo que cierra el agujero de verdad es una
 * restricción de unicidad sobre `Ticket` en NocoDB, que se configura en NocoDB y no
 * desde este repo. Esto cubre el caso real (dos personas dando a "Nuevo guion" a la vez
 * contra la misma instancia); con varias instancias en paralelo sigue haciendo falta la
 * restricción.
 */
let cola: Promise<unknown> = Promise.resolve();
export function enColaDeTickets<T>(fn: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(fn, fn);
  cola = siguiente.catch(() => undefined);
  return siguiente;
}

/** Crea la fila de una pieza nueva nacida en el Centro de Control. */
export async function crearFila(datos: {
  ticket: string;
  nombre: string;
  estado: Estado;
  slug: string;
  voz?: string;
  pilar?: string;
}) {
  await api(`/api/v2/tables/${TABLA}/records`, "POST", [
    {
      Ticket: datos.ticket,
      Nombre: datos.nombre,
      Estado: ESTADO_LABEL[datos.estado],
      "Tipo de pieza": "Social",
      "Slug bóveda": datos.slug,
      Voz: datos.voz || null,
      Pilar: datos.pilar || null,
      Origen: "Nuevo",
      "Ref origen": `Bóveda#${datos.slug}`,
    },
  ]);
}

/** Actualiza los campos que posee NocoDB. Devuelve false si no se pudo (sin romper). */
export async function actualizarFila(
  ticket: string,
  campos: { estado?: Estado; fecha_publicacion?: string; fecha_grabacion?: string; slug?: string; cuerpo?: string }
): Promise<boolean> {
  const fila = await filaPorTicket(ticket);
  if (!fila?.Id) return false;

  const parche: Record<string, unknown> = { Id: fila.Id };
  if (campos.estado) parche.Estado = ESTADO_LABEL[campos.estado];
  if (campos.fecha_publicacion !== undefined) parche["Fecha publicación"] = campos.fecha_publicacion || null;
  if (campos.fecha_grabacion !== undefined) parche["Fecha grabación"] = campos.fecha_grabacion || null;
  if (campos.slug) parche["Slug bóveda"] = campos.slug;
  if (campos.cuerpo !== undefined) parche["Guión"] = campos.cuerpo;

  await api(`/api/v2/tables/${TABLA}/records`, "PATCH", [parche]);

  // El log de etapas es lo que después responde "¿cuándo pasó a edición?".
  if (campos.estado && TABLA_LOG) {
    const antes = String(fila.Estado || "");
    const ahora = ESTADO_LABEL[campos.estado];
    if (antes !== ahora) {
      await api(`/api/v2/tables/${TABLA_LOG}/records`, "POST", [
        { Ticket: ticket, De: antes || "—", A: ahora, Fecha: new Date().toISOString(), Origen: "Centro de Control" },
      ]);
    }
  }
  return true;
}
