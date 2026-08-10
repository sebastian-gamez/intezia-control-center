import matter from "gray-matter";
import type { Guion, GuionPatch, Estado } from "./types";
import { ESTADO_LEGADO, ESTADOS } from "./types";

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

/** Ruta (dentro de la bóveda / del repo) de la plantilla oficial de guion. */
export const PLANTILLA_PATH = "boveda/00_Sistema/Plantillas/Plantilla - Guion.md";

/**
 * Contenido .md de un guion nuevo en blanco.
 *
 * La plantilla REAL vive en la bóveda (`PLANTILLA_PATH`) y es la única fuente de
 * verdad: el equipo la edita en Obsidian y la app debe respetarla. Por eso
 * `data.ts` la lee y la pasa aquí; lo único que hacemos es sustituir {{title}}.
 *
 * El scaffold de abajo es solo el plan B para cuando la plantilla no se puede
 * leer. Antes era la única versión y se desincronizó de la de la bóveda sin que
 * nadie lo notara — por eso ahora es un fallback y no el camino normal.
 */
export function newGuionRaw(titulo: string, plantilla?: string | null, ticket = ""): string {
  if (plantilla && plantilla.trim()) {
    const out = plantilla.replace(/\{\{\s*title\s*\}\}/g, titulo);
    // El ticket es la llave con NocoDB: se escribe justo bajo `type` para que quede
    // arriba del todo y sea lo primero que se ve al abrir el archivo.
    return ticket ? out.replace(/^type: guion$/m, `type: guion\nticket: ${ticket}`) : out;
  }

  const data = {
    type: "guion",
    ticket,
    estado: "borrador",
    pilar: "",
    voz: "",
    plataforma: "",
    formato: "reel",
    duracion: "30s",
    palabras_objetivo: 80,
    persona_audiencia: "",
    fuente: "",
    insight: "",
    referencia: "",
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

## 🎣 HOOKS (elige 1 al grabar)
> 8-12 palabras. Cero preámbulo.
1.
2.
3.

## 🎬 GUION HABLADO (leer en voz alta con cronómetro)

| t | beat | texto a decir | pal. |
|---|---|---|---|
| 0-2 s | **hook** | | |
| 2-6 s | contexto | | |
| 6-20 s | **valor** | | |
| 20-27 s | prueba | | |
| 27-30 s | gancho + firma | | |

**Total: ___ / ___ palabras objetivo**

## ⭐ El valor, desglosado
1.
2.
3.

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
