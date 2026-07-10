import fs from "fs/promises";
import path from "path";
import {
  parseGuion,
  applyPatch,
  newGuionRaw,
  slugFromTitle,
} from "./guion";
import type { Guion, GuionPatch } from "./types";

const GUIONES_DIR = process.env.GUIONES_DIR || "05_Guiones";
const useGithub = !!process.env.GITHUB_TOKEN;

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

async function localCreate(titulo: string): Promise<Guion> {
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
  const raw = newGuionRaw(titulo);
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
  _octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return _octokit;
}

function ghCfg() {
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const branch = process.env.GITHUB_BRANCH || "main";
  return { owner, repo, branch };
}

async function githubList(): Promise<Guion[]> {
  const octokit = await ghOctokit();
  const { owner, repo, branch } = ghCfg();
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: GUIONES_DIR,
    ref: branch,
  });
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

async function githubCreate(titulo: string): Promise<Guion> {
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
  const raw = newGuionRaw(titulo);
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

// ---------- API pública ----------
export async function listGuiones(): Promise<Guion[]> {
  const items = useGithub ? await githubList() : await localList();
  return items.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getGuion(slug: string): Promise<Guion | null> {
  return useGithub ? githubGet(slug) : localGet(slug);
}

export async function updateGuion(
  slug: string,
  patch: GuionPatch,
  cuerpo?: string
): Promise<Guion> {
  return useGithub
    ? githubUpdate(slug, patch, cuerpo)
    : localUpdate(slug, patch, cuerpo);
}

export async function createGuion(titulo: string): Promise<Guion> {
  return useGithub ? githubCreate(titulo) : localCreate(titulo);
}

export async function deleteGuion(slug: string): Promise<void> {
  return useGithub ? githubDelete(slug) : localDelete(slug);
}

export async function duplicateGuion(slug: string): Promise<Guion> {
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

export function dataSource(): "github" | "local" {
  return useGithub ? "github" : "local";
}
