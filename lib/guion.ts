import matter from "gray-matter";
import type { Guion, GuionPatch, Estado } from "./types";

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

  return {
    slug,
    titulo,
    estado: (str(data.estado) || "borrador") as Estado,
    pilar: str(data.pilar),
    voz: str(data.voz),
    plataforma: str(data.plataforma),
    formato: str(data.formato),
    duracion: str(data.duracion),
    persona_audiencia: str(data.persona_audiencia),
    fuente: str(data.fuente),
    insight: str(data.insight),
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

/** Contenido .md de un guion nuevo en blanco (frontmatter + scaffold de plantilla). */
export function newGuionRaw(titulo: string): string {
  const data = {
    type: "guion",
    estado: "borrador",
    pilar: "",
    voz: "",
    plataforma: "",
    formato: "reel",
    duracion: "30s",
    persona_audiencia: "",
    fuente: "",
    insight: "",
    responsable: "",
    fecha_grabacion: "",
    fecha_produccion: "",
    fecha_publicacion: "",
    cta: "valor",
    metricas: { views: "", saves: "", shares: "" },
    pipeline: "",
    tags: ["guion"],
  };
  const body = `# ${titulo}

## 🎣 HOOK (0-3s)
>

## Contexto (1 línea)


## ⭐ VALOR PRÁCTICO (el núcleo — lo que hace que GUARDEN)
1.
2.
3.

## Prueba / ejemplo


## 🔖 Gancho de acción
> "Guarda esto para…" / "Envíaselo a quien…"

## ✍️ Firma
Nombre — Cargo de Intezia.

---

### Producción
- **Texto en pantalla:**
- **Caption:**
- **Hashtags:**
- **Nota visual / b-roll:**
`;
  let out = matter.stringify(body, data);
  out = out.replace(/:\s*(''|"")\s*$/gm, ": ");
  return out;
}
