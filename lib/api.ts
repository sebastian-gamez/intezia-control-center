// Cliente de API compartido — centraliza todas las llamadas del navegador.
// Evita repetir fetch/encode/headers en cada componente.
import type { Guion } from "./types";

type Patch = Record<string, string | undefined> & { cuerpo?: string };

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
  }).then(asJson<Guion>);
}

export async function removeGuion(slug: string) {
  const res = await fetch(url(slug), { method: "DELETE" });
  if (!res.ok) throw new Error(`No se pudo eliminar (${res.status})`);
}

export function createGuion(titulo: string) {
  return fetch("/api/guiones", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ titulo }),
  }).then(asJson<Guion>);
}

export function duplicateGuion(slug: string) {
  return fetch("/api/guiones", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ duplicateFrom: slug }),
  }).then(asJson<Guion>);
}
