// Modelo de datos del guion (refleja el frontmatter de los .md de la fábrica)

// Las 5 etapas canónicas del pipeline. Son EXACTAMENTE las que el equipo ya usa en
// NocoDB: la app se adaptó a su vocabulario, no al revés.
//
// En el YAML de la bóveda van como slug (sin espacios ni acentos, para no romper
// Dataview); la etiqueta es la que se ve en los dos sistemas. Este es el único sitio
// donde vive ese mapeo — si cambia una etapa, se cambia aquí y nada más.
export const ESTADOS = [
  "borrador",
  "por_hacer",
  "en_proceso",
  "producido",
  "publicado",
] as const;
export type Estado = (typeof ESTADOS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  borrador: "Borrador",
  por_hacer: "Por Hacer",
  en_proceso: "En Proceso",
  producido: "Producido",
  publicado: "Publicado",
};

/** Etapas que la app muestra: lo vivo. Lo publicado se consulta en NocoDB. */
export const ESTADOS_ACTIVOS: Estado[] = ["borrador", "por_hacer", "en_proceso", "producido"];

// Columnas del tablero
export const KANBAN_ESTADOS: Estado[] = ESTADOS_ACTIVOS;

/** Vocabulario viejo → etapa canónica. Para leer .md que aún no se han migrado. */
export const ESTADO_LEGADO: Record<string, Estado> = {
  idea: "borrador",
  borrador: "borrador",
  aprobado: "por_hacer",
  por_grabar: "por_hacer",
  grabado: "en_proceso",
  editado: "producido",
};

export const PILARES = [
  "casos",
  "herramientas",
  "noticias",
  "mitos",
  "datos",
  "liderazgo",
] as const;
export type Pilar = (typeof PILARES)[number];

export const PILAR_LABEL: Record<string, string> = {
  casos: "Casos de uso",
  herramientas: "Herramientas",
  noticias: "Noticias",
  mitos: "Mitos y criterio",
  datos: "Datos y tendencias",
  liderazgo: "Adopción y liderazgo",
};

export const VOCES = [
  "CEO",
  "COO",
  "CMO",
  "CSO",
  "Head of Growth",
  "Social Media Manager",
  "colaborador",
] as const;
export const PLATAFORMAS = [
  "IG",
  "TikTok",
  "YouTube Shorts",
  "LinkedIn",
] as const;
export const CTAS = ["valor", "nudge-suave"] as const;

export interface Metricas {
  views?: number | null;
  saves?: number | null;
  shares?: number | null;
}

export interface Guion {
  slug: string; // nombre de archivo sin .md
  ticket: string; // INT-0001 — la llave con NocoDB
  titulo: string;
  estado: Estado;
  pilar: string;
  voz: string; // ejecutivo EN CÁMARA
  plataforma: string;
  formato: string;
  duracion: string;
  palabras_objetivo: number | null; // presupuesto de palabras habladas (ver Modelo de redacción)
  persona_audiencia: string;
  fuente: string;
  insight: string;
  referencia: string; // ficha de Referencias-Video cuyo formato se imitó
  responsable: string; // productor/editor
  fecha_grabacion: string;
  fecha_produccion: string;
  fecha_publicacion: string;
  cta: string;
  metricas: Metricas;
  pipeline: string;
  tags: string[];
  cuerpo: string; // markdown sin frontmatter
}

// Campos de metadatos editables desde la app
export type GuionPatch = Partial<
  Pick<
    Guion,
    | "estado"
    | "voz"
    | "plataforma"
    | "pilar"
    | "responsable"
    | "fecha_grabacion"
    | "fecha_produccion"
    | "fecha_publicacion"
    | "cta"
    | "duracion"
    | "persona_audiencia"
  >
> & {
  // El formulario lo manda como texto; applyPatch lo guarda como número en el YAML.
  palabras_objetivo?: number | string | null;
};
