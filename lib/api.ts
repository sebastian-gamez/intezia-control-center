// Cliente de API compartido — centraliza todas las llamadas del navegador.
// Evita repetir fetch/encode/headers en cada componente.
import type { Guion } from "./types";

type Patch = Record<string, string | undefined> & { cuerpo?: string };

/**
 * Lo que devuelve una escritura. `aviso` viene del puente con NocoDB: si trae texto, el
 * guion se guardó en la bóveda pero NO llegó a NocoDB, y la interfaz tiene que decirlo
 * en vez de cantar un "Guardado" que solo es media verdad.
 */
export type GuionGuardado = Guion & { aviso?: string | null };

const url = (slug: string) => `/api/guiones/${encodeURIComponent(slug)}`;

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const msg = await res
      .json()
      .then((d) => d?.error)
      .catch(() => null);
    throw new Error(msg || `Error ${res.status}`);
  }
  return res.json();
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function fetchGuion(slug: string) {
  return fetch(url(slug)).then(asJson<Guion>);
}

export function patchGuion(slug: string, patch: Patch) {
  return fetch(url(slug), {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  }).then(asJson<GuionGuardado>);
}

export async function removeGuion(slug: string) {
  await asJson<{ ok: boolean }>(await fetch(url(slug), { method: "DELETE" }));
}

export function createGuion(titulo: string) {
  return fetch("/api/guiones", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ titulo }),
  }).then(asJson<GuionGuardado>);
}

export function duplicateGuion(slug: string) {
  return fetch("/api/guiones", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ duplicateFrom: slug }),
  }).then(asJson<GuionGuardado>);
}
