import fs from "fs/promises";
import path from "path";
import {
  parseGuion,
  applyPatch,
  newGuionRaw,
  slugFromTitle,
  PLANTILLA_PATH,
} from "./guion";
import type { Guion, GuionPatch } from "./types";
import { ESTADOS_ACTIVOS } from "./types";
import { nocodbActivo, actualizarFila, crearFila, siguienteTicket } from "./nocodb";
import * as noco from "./adaptador-nocodb";

const GUIONES_DIR = process.env.GUIONES_DIR || "05_Guiones";
const useGithub = !!process.env.GITHUB_TOKEN;
// Los guiones viven en NocoDB. Es el modo normal en producción: el repo de la app es
// público y no puede llevar contenido. Los adaptadores de git y de archivos se quedan
// para trabajar en local contra la bóveda.
const useNocodb = noco.nocodbDisponible() && process.env.FUENTE_GUIONES !== "git";

// ---------- Adaptador LOCAL (archivos) ----------
function vaultDir(): string {
  const base = process.env.VAULT_PATH;
  if (!base) throw new Error("Falta VAULT_PATH en el entorno (.env.local).");
  return path.join(base, GUIONES_DIR);
}

async function localList(): Promise<Guion[]> {
  const dir = vaultDir();
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  // Lectura en paralelo (no en serie) para responder más rápido.
  return Promise.all(
    files.map(async (f) => {
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      return parseGuion(f.replace(/\.md$/, ""), raw);
    })
  );
}

async function localGet(slug: string): Promise<Guion | null> {
  try {
    const raw = await fs.readFile(path.join(vaultDir(), `${slug}.md`), "utf8");
    return parseGuion(slug, raw);
  } catch {
    return null;
  }
}

async function localUpdate(
  slug: string,
  patch: GuionPatch,
  cuerpo?: string
): Promise<Guion> {
  const file = path.join(vaultDir(), `${slug}.md`);
  const raw = await fs.readFile(file, "utf8");
  const next = applyPatch(raw, patch, cuerpo);
  await fs.writeFile(file, next, "utf8");
  return parseGuion(slug, next);
}

/** Lee la plantilla oficial de la bóveda. Si no está, se usa el fallback de guion.ts. */
async function localPlantilla(): Promise<string | null> {
  const raiz = process.env.VAULT_PATH;
  if (!raiz) return null;
  try {
    return await fs.readFile(path.join(raiz, PLANTILLA_PATH), "utf8");
  } catch {
    return null;
  }
}

async function localCreate(titulo: string, ticket = ""): Promise<Guion> {
  const base = slugFromTitle(titulo);
  const dir = vaultDir();
  let slug = base;
  let i = 2;
  // evita colisiones de nombre
  while (
    await fs
      .access(path.join(dir, `${slug}.md`))
      .then(() => true)
      .catch(() => false)
  ) {
    slug = `${base} ${i++}`;
  }
  const raw = newGuionRaw(titulo, await localPlantilla(), ticket);
  await fs.writeFile(path.join(dir, `${slug}.md`), raw, "utf8");
  return parseGuion(slug, raw);
}

async function localDelete(slug: string): Promise<void> {
  try {
    await fs.unlink(path.join(vaultDir(), `${slug}.md`));
  } catch (e) {
    // Si ya no existe, lo tratamos como éxito (idempotente).
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

// ---------- Adaptador GITHUB (API) ----------
let _octokit: import("@octokit/rest").Octokit | null = null;
async function ghOctokit() {
  if (_octokit) return _octokit;
  const { Octokit } = await import("@octokit/rest");
  _octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    request: {
      // Fuerza lectura fresca: evita que Next.js/Vercel cachee la respuesta de GitHub.
      fetch: (url: RequestInfo | URL, options?: RequestInit) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  });
  return _octokit;
}

function ghCfg() {
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const branch = process.env.GITHUB_BRANCH || "main";
  return { owner, repo, branch };
}

/**
 * Última causa por la que no se pudieron leer los guiones. Una variable de entorno mal
 * puesta no puede tumbar la app entera con un error opaco: se degrada a lista vacía y
 * la pantalla dice qué revisar.
 */
let ultimoError: string | null = null;
export function errorDeLectura() {
  return ultimoError;
}

async function githubList(): Promise<Guion[]> {
  const octokit = await ghOctokit();
  const { owner, repo, branch } = ghCfg();
  let data;
  try {
    ({ data } = await octokit.repos.getContent({
      owner,
      repo,
      path: GUIONES_DIR,
      ref: branch,
    }));
    ultimoError = null;
  } catch (e) {
    const status = (e as { status?: number })?.status;
    ultimoError =
      status === 404
        ? `No se encontró "${GUIONES_DIR}" en ${owner}/${repo} (rama ${branch}). Revisa GITHUB_REPO y GUIONES_DIR — y que el GITHUB_TOKEN tenga acceso a ese repo si es privado.`
        : status === 401 || status === 403
        ? `GitHub rechazó el token (${status}) al leer ${owner}/${repo}. Revisa GITHUB_TOKEN y sus permisos.`
        : `No se pudo leer ${owner}/${repo}/${GUIONES_DIR}: ${(e as Error).message}`;
    console.error("[guiones]", ultimoError);
    return [];
  }
  if (!Array.isArray(data)) return [];
  const mds = data.filter((d) => d.type === "file" && d.name.endsWith(".md"));
  // Descarga de contenidos en paralelo (evita N+1 en serie).
  const results = await Promise.all(
    mds.map(async (file) => {
      const raw = await githubReadRaw(file.path);
      return raw != null
        ? parseGuion(file.name.replace(/\.md$/, ""), raw)
        : null;
    })
  );
  return results.filter((g): g is Guion => g !== null);
}

async function githubReadRaw(filePath: string): Promise<string | null> {
  const octokit = await ghOctokit();
  const { owner, repo, branch } = ghCfg();
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data))
      return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch {
    return null;
  }
}

async function githubGet(slug: string): Promise<Guion | null> {
  const raw = await githubReadRaw(`${GUIONES_DIR}/${slug}.md`);
  return raw == null ? null : parseGuion(slug, raw);
}

async function githubUpdate(
  slug: string,
  patch: GuionPatch,
  cuerpo?: string
): Promise<Guion> {
  const octokit = await ghOctokit();
  const { owner, repo, branch } = ghCfg();
  const filePath = `${GUIONES_DIR}/${slug}.md`;

  const current = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  });
  if (Array.isArray(current.data) || current.data.type !== "file")
    throw new Error("Guion no encontrado en GitHub.");
  const sha = current.data.sha;
  const raw = Buffer.from(
    (current.data as { content: string }).content,
    "base64"
  ).toString("utf8");

  const next = applyPatch(raw, patch, cuerpo);
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    branch,
    message: `chore(guion): actualizar ${slug} desde el centro de control`,
    content: Buffer.from(next, "utf8").toString("base64"),
    sha,
  });
  return parseGuion(slug, next);
}

async function githubCreate(titulo: string, ticket = ""): Promise<Guion> {
  const octokit = await ghOctokit();
  const { owner, repo, branch } = ghCfg();
  const base = slugFromTitle(titulo);
  let slug = base;
  let i = 2;
  // evita colisiones
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await githubReadRaw(`${GUIONES_DIR}/${slug}.md`);
    if (exists == null) break;
    slug = `${base} ${i++}`;
  }
  // Misma plantilla que en local: vive en el repo de la bóveda, no en el código.
  const raw = newGuionRaw(titulo, await githubReadRaw(PLANTILLA_PATH), ticket);
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `${GUIONES_DIR}/${slug}.md`,
    branch,
    message: `feat(guion): crear ${slug} desde el centro de control`,
    content: Buffer.from(raw, "utf8").toString("base64"),
  });
  return parseGuion(slug, raw);
}

async function githubDelete(slug: string): Promise<void> {
  const octokit = await ghOctokit();
  const { owner, repo, branch } = ghCfg();
  const filePath = `${GUIONES_DIR}/${slug}.md`;
  const current = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  });
  if (Array.isArray(current.data) || current.data.type !== "file") return;
  await octokit.repos.deleteFile({
    owner,
    repo,
    path: filePath,
    branch,
    message: `chore(guion): eliminar ${slug} desde el centro de control`,
    sha: current.data.sha,
  });
}

// ---------- Puente con NocoDB ----------
// Todos los cambios de la app desembocan aquí, así que este es el único sitio donde hay
// que empujar a NocoDB. Si NocoDB falla, el .md ya se guardó: se avisa y el sync
// programado reconcilia. Nunca se revierte una escritura local por un fallo de red.
let ultimoAvisoSync: string | null = null;
export function avisoSync(): string | null {
  const a = ultimoAvisoSync;
  ultimoAvisoSync = null;
  return a;
}

async function empujarANocodb(g: Guion, patch: GuionPatch, cuerpo?: string) {
  if (!nocodbActivo() || !g.ticket) return;
  try {
    await actualizarFila(g.ticket, {
      estado: patch.estado,
      fecha_publicacion: patch.fecha_publicacion,
      fecha_grabacion: patch.fecha_grabacion,
      slug: g.slug,
      cuerpo,
    });
  } catch (e) {
    ultimoAvisoSync = `Guardado en la bóveda, pero NocoDB no respondió (${
      e instanceof Error ? e.message : "error"
    }). El sync lo reconciliará.`;
    console.warn("[nocodb]", ultimoAvisoSync);
  }
}

// ---------- API pública ----------
export async function listGuiones(): Promise<Guion[]> {
  if (useNocodb) {
    try {
      ultimoError = null;
      return await noco.listar();
    } catch (e) {
      ultimoError = (e as Error).message;
      console.error("[guiones]", ultimoError);
      return [];
    }
  }
  const items = useGithub ? await githubList() : await localList();
  // La app es para trabajar sobre lo vivo. Lo publicado se consulta en NocoDB, que es
  // donde el equipo ya mira el histórico (261 piezas y subiendo).
  return items
    .filter((g) => (ESTADOS_ACTIVOS as string[]).includes(g.estado))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getGuion(slug: string): Promise<Guion | null> {
  if (useNocodb) return noco.obtener(slug);
  return useGithub ? githubGet(slug) : localGet(slug);
}

export async function updateGuion(
  slug: string,
  patch: GuionPatch,
  cuerpo?: string
): Promise<Guion> {
  // En NocoDB la escritura es directa: la tabla es la fuente, no una copia.
  if (useNocodb) return noco.actualizar(slug, patch, cuerpo);
  const g = useGithub
    ? await githubUpdate(slug, patch, cuerpo)
    : await localUpdate(slug, patch, cuerpo);
  await empujarANocodb(g, patch, cuerpo);
  return g;
}

export async function createGuion(titulo: string): Promise<Guion> {
  if (useNocodb) {
    // La plantilla vive en la bóveda, que es su única fuente de verdad. Si no se puede
    // leer (repo privado sin token), se usa el scaffold de guion.ts.
    let plantilla = "";
    try {
      plantilla = (await githubReadRaw(PLANTILLA_PATH)) || "";
    } catch {
      /* sin plantilla: se cae al scaffold */
    }
    return noco.crear(titulo, plantilla || newGuionRaw(titulo));
  }
  // El ticket se pide ANTES de crear el archivo: si NocoDB no responde, el guion nace
  // sin ticket y el sync se lo asigna después — pero nunca se queda sin crear.
  let ticket = "";
  if (nocodbActivo()) {
    try {
      ticket = await siguienteTicket();
    } catch (e) {
      console.warn("[nocodb] no se pudo pedir ticket:", e instanceof Error ? e.message : e);
    }
  }

  const g = useGithub ? await githubCreate(titulo, ticket) : await localCreate(titulo, ticket);

  if (ticket) {
    try {
      await crearFila({ ticket, nombre: g.titulo, estado: g.estado, slug: g.slug, voz: g.voz, pilar: g.pilar });
    } catch (e) {
      ultimoAvisoSync = `Guion creado, pero no se pudo registrar en NocoDB (${
        e instanceof Error ? e.message : "error"
      }).`;
      console.warn("[nocodb]", ultimoAvisoSync);
    }
  }
  return g;
}

export async function deleteGuion(slug: string): Promise<void> {
  if (useNocodb) return noco.eliminar(slug);
  return useGithub ? githubDelete(slug) : localDelete(slug);
}

export async function duplicateGuion(slug: string): Promise<Guion> {
  if (useNocodb) return noco.duplicar(slug);
  const orig = useGithub ? await githubGet(slug) : await localGet(slug);
  if (!orig) throw new Error("Guion no encontrado.");
  const nuevo = await createGuion(`${orig.titulo} (copia)`);
  // copia metadatos y cuerpo del original al nuevo (reset de métricas/fechas)
  const patch: GuionPatch = {
    pilar: orig.pilar,
    voz: orig.voz,
    plataforma: orig.plataforma,
    responsable: orig.responsable,
    cta: orig.cta,
    duracion: orig.duracion,
    persona_audiencia: orig.persona_audiencia,
    estado: "borrador",
  };
  const cuerpo = orig.cuerpo.replace(/^#\s+.+/, `# ${orig.titulo} (copia)`);
  return updateGuion(nuevo.slug, patch, cuerpo);
}

export function dataSource(): "nocodb" | "github" | "local" {
  // NocoDB primero: es el modo en que corre producción. Antes esta función solo miraba
  // GITHUB_TOKEN, así que el tablero anunciaba "GitHub" mientras leía la base — y eso
  // mandó a buscar el problema al sitio equivocado cuando faltaban guiones.
  if (useNocodb) return "nocodb";
  return useGithub ? "github" : "local";
}
