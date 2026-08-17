// validacion.ts — Lo que entra por la API se valida en el borde, no dentro.
//
// Sin esto, un título de 4 MB o un `palabras_objetivo` de 10^9 llegan tal cual al .md y a
// NocoDB. Son ~40 líneas a mano en vez de una dependencia de validación: el esquema real
// son cuatro tipos de campo (texto corto, fecha, entero acotado y enum), y cuando deje de
// caber aquí, ahí sí toca `zod`.

import { ESTADOS, type GuionPatch } from "./types";

/** Error de entrada del cliente: la API lo traduce a 400, no a 500. */
export class ErrorDeEntrada extends Error {}

const LARGO_TEXTO = 200;
const LARGO_CUERPO = 200_000;

function texto(campo: string, v: unknown): string {
  if (typeof v !== "string") throw new ErrorDeEntrada(`"${campo}" debe ser texto.`);
  const s = v.trim();
  if (s.length > LARGO_TEXTO)
    throw new ErrorDeEntrada(`"${campo}" no puede pasar de ${LARGO_TEXTO} caracteres.`);
  return s;
}

function fecha(campo: string, v: unknown): string {
  const s = texto(campo, v);
  if (s && !/^\d{4}-\d{2}-\d{2}$/.test(s))
    throw new ErrorDeEntrada(`"${campo}" debe ser una fecha AAAA-MM-DD.`);
  return s;
}

function entero(campo: string, v: unknown, min: number, max: number): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new ErrorDeEntrada(`"${campo}" debe ser un entero entre ${min} y ${max}.`);
  return n;
}

/** Título de un guion nuevo. */
export function validarTitulo(v: unknown): string {
  const s = texto("titulo", v ?? "");
  return s || "Nuevo guion";
}

const FECHAS = ["fecha_grabacion", "fecha_produccion", "fecha_publicacion"] as const;
const TEXTOS = ["voz", "plataforma", "pilar", "responsable", "cta", "duracion", "persona_audiencia"] as const;

/** Toma del body solo los campos conocidos, ya validados. Lo demás se ignora. */
export function validarPatch(body: Record<string, unknown>): GuionPatch {
  const patch: GuionPatch = {};

  if ("estado" in body) {
    const e = texto("estado", body.estado);
    if (!(ESTADOS as readonly string[]).includes(e))
      throw new ErrorDeEntrada(`"estado" no es una etapa válida.`);
    patch.estado = e as GuionPatch["estado"];
  }
  const campos = patch as Record<string, unknown>;
  for (const k of TEXTOS) if (k in body) campos[k] = texto(k, body[k]);
  for (const k of FECHAS) if (k in body) campos[k] = fecha(k, body[k]);
  if ("palabras_objetivo" in body)
    patch.palabras_objetivo = entero("palabras_objetivo", body.palabras_objetivo, 0, 10_000);

  return patch;
}

/** Cuerpo del guion (markdown). `undefined` = no se toca. */
export function validarCuerpo(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new ErrorDeEntrada(`"cuerpo" debe ser texto.`);
  if (v.length > LARGO_CUERPO)
    throw new ErrorDeEntrada(`El guion no puede pasar de ${LARGO_CUERPO} caracteres.`);
  return v;
}
