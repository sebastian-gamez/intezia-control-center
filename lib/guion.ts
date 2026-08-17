import matter from "gray-matter";
import type { Guion, GuionPatch, Estado } from "./types";
import { ESTADO_LEGADO, ESTADOS } from "./types";
import { ErrorDeEntrada } from "./validacion";

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Parsea un archivo .md (contenido crudo) a un objeto Guion. */
export function parseGuion(slug: string, raw: string): Guion {
  const { data, content } = matter(raw);
  const m = (data.metricas || {}) as Record<string, unknown>;

  // Título: primer H1 del cuerpo, o el slug
  const h1 = content.match(/^#\s+(.+)$/m);
  const titulo = h1 ? h1[1].trim() : slug;

  let tags: string[] = [];
  if (Array.isArray(data.tags)) tags = data.tags.map(str);
  else if (typeof data.tags === "string") tags = [data.tags];

  // Un .md puede traer el vocabulario viejo (grabado, por_grabar…) si aún no pasó por
  // el sync. Se traduce al leer, para que la app nunca muestre una etapa que no existe.
  const crudo = str(data.estado);
  const estado = (ESTADOS as readonly string[]).includes(crudo)
    ? (crudo as Estado)
    : ESTADO_LEGADO[crudo] || "borrador";

  return {
    slug,
    ticket: str(data.ticket),
    titulo,
    estado,
    pilar: str(data.pilar),
    voz: str(data.voz),
    plataforma: str(data.plataforma),
    formato: str(data.formato),
    duracion: str(data.duracion),
    palabras_objetivo: num(data.palabras_objetivo),
    persona_audiencia: str(data.persona_audiencia),
    fuente: str(data.fuente),
    insight: str(data.insight),
    referencia: str(data.referencia),
    responsable: str(data.responsable),
    fecha_grabacion: str(data.fecha_grabacion),
    fecha_produccion: str(data.fecha_produccion),
    fecha_publicacion: str(data.fecha_publicacion),
    cta: str(data.cta) || "valor",
    metricas: {
      views: num(m.views),
      saves: num(m.saves),
      shares: num(m.shares),
    },
    pipeline: str(data.pipeline),
    tags,
    cuerpo: content.trim(),
  };
}

/** Campos de frontmatter que deben quedar como número en el YAML, no como texto. */
const NUMERICOS = new Set(["palabras_objetivo"]);

/**
 * Aplica un patch de metadatos (y opcionalmente un cuerpo nuevo) sobre el
 * archivo crudo y devuelve el nuevo contenido .md.
 */
export function applyPatch(
  raw: string,
  patch: GuionPatch,
  cuerpo?: string
): string {
  const parsed = matter(raw);
  const data = { ...parsed.data } as Record<string, unknown>;

  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    // Los numéricos se guardan como número: si entraran como texto ("80"),
    // Dataview no podría compararlos ni sumarlos en la bóveda.
    if (NUMERICOS.has(k)) {
      const n = Number(v);
      data[k] = v === "" || v === null || Number.isNaN(n) ? null : n;
      continue;
    }
    data[k] = v === "" ? null : v;
  }

  const content = cuerpo !== undefined ? cuerpo : parsed.content;
  let out = matter.stringify(content, data);
  // Limpieza cosmética: "campo: null" → "campo:" (para YAML legible)
  out = out.replace(/:\s*null\s*$/gm, ": ");
  return out;
}

/** Slug de archivo válido a partir de un título (conserva acentos, quita chars inválidos). */
export function slugFromTitle(titulo: string): string {
  return (
    titulo
      .trim()
      .replace(/[\\/:*?"<>|#^[\]]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 120) || "Nuevo guion"
  );
}

/**
 * Un slug nombra un archivo DENTRO de la carpeta de guiones y nada más. Sin este filtro,
 * un slug como `../../.env` convierte cualquier ruta de la API en lectura o escritura
 * arbitraria de disco.
 */
export function slugSeguro(slug: string): string {
  const s = String(slug ?? "").trim();
  const invalido =
    !s ||
    s.length > 200 ||
    s.startsWith(".") || // nada de dotfiles
    s.includes("..") || // nada de subir de carpeta
    /[\\/]/.test(s) || // nada de separadores de ruta
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f]/.test(s); // nada de bytes de control
  if (invalido) throw new ErrorDeEntrada("Identificador de guion inválido.");
  return s;
}

/** Ruta (dentro de la bóveda / del repo) de la plantilla oficial de guion. */
export const PLANTILLA_PATH = "boveda/00_Sistema/Plantillas/Plantilla - Guion.md";

/**
 * Contenido .md de un guion nuevo, a partir de la plantilla oficial.
 *
 * La plantilla REAL vive en la bóveda (`PLANTILLA_PATH`) y es su única fuente de verdad:
 * el equipo la edita en Obsidian y la app debe respetarla.
 *
 * Antes había aquí una copia de respaldo que se usaba en silencio si la plantilla no se
 * podía leer. Se desincronizó de la de la bóveda sin que nadie lo notara y se estuvieron
 * creando guiones con la estructura vieja. Ahora, si no hay plantilla, la creación falla
 * y dice qué revisar: mejor no crear el guion que crearlo mal.
 */
export function newGuionRaw(titulo: string, plantilla?: string | null, ticket = ""): string {
  if (!plantilla || !plantilla.trim()) {
    throw new Error(
      `No se pudo leer la plantilla oficial (${PLANTILLA_PATH}). Revisa VAULT_PATH ` +
        `(o GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO) antes de crear guiones.`
    );
  }
  const out = plantilla.replace(/\{\{\s*title\s*\}\}/g, titulo);
  // El ticket es la llave con NocoDB: se escribe justo bajo `type` para que quede
  // arriba del todo y sea lo primero que se ve al abrir el archivo.
  return ticket ? out.replace(/^type: guion$/m, `type: guion\nticket: ${ticket}`) : out;
}
